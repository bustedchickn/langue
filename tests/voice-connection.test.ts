import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { VoiceConnection } from '../client/voice/connection'
import type { VoiceConfiguration, VoiceSignal } from '../shared/types'

const sdp = (ufrag: string) => `v=0\r\na=ice-ufrag:${ufrag}\r\n`
const candidate = (ufrag: string): RTCIceCandidateInit => ({
  candidate: 'candidate:1 1 UDP 1 192.0.2.1 12345 typ relay',
  sdpMid: '0', sdpMLineIndex: 0, usernameFragment: ufrag,
})

class FakePeer {
  static instances: FakePeer[] = []
  connectionState: RTCPeerConnectionState = 'new'
  iceConnectionState: RTCIceConnectionState = 'new'
  signalingState: RTCSignalingState = 'stable'
  localDescription?: RTCSessionDescription
  remoteDescription?: RTCSessionDescriptionInit
  onicecandidate?: (event: { candidate: RTCIceCandidate }) => void
  onconnectionstatechange?: () => void
  oniceconnectionstatechange?: () => void
  ontrack?: unknown
  configurations: RTCConfiguration[] = []
  offers: RTCOfferOptions[] = []
  remoteDescriptions: RTCSessionDescriptionInit[] = []
  addedCandidates: RTCIceCandidateInit[] = []
  tracks: MediaStreamTrack[] = []
  closed = false

  constructor(configuration: RTCConfiguration) {
    this.configurations.push(configuration)
    FakePeer.instances.push(this)
  }
  addTrack(track: MediaStreamTrack) { this.tracks.push(track) }
  setConfiguration(configuration: RTCConfiguration) { this.configurations.push(configuration) }
  async createOffer(options: RTCOfferOptions = {}) {
    this.offers.push(options)
    return { type: 'offer' as const, sdp: sdp('local-' + this.offers.length) }
  }
  async createAnswer() { return { type: 'answer' as const, sdp: sdp('local-answer') } }
  async setLocalDescription(description: RTCSessionDescriptionInit) {
    this.localDescription = { ...description, toJSON: () => description } as RTCSessionDescription
    this.signalingState = description.type === 'offer' ? 'have-local-offer' : 'stable'
    // Some browsers emit candidates before setLocalDescription's promise settles.
    const ice = candidate(description.sdp!.match(/a=ice-ufrag:([^\r]+)/)![1])
    this.onicecandidate?.({ candidate: { ...ice, toJSON: () => ice } as RTCIceCandidate })
  }
  async setRemoteDescription(description: RTCSessionDescriptionInit) {
    this.remoteDescription = description
    this.remoteDescriptions.push(description)
    this.signalingState = description.type === 'answer' ? 'stable' : 'have-remote-offer'
  }
  async addIceCandidate(ice: RTCIceCandidateInit) { this.addedCandidates.push(ice) }
  connected() {
    this.connectionState = 'connected'
    this.iceConnectionState = 'connected'
    this.onconnectionstatechange?.()
  }
  close() { this.closed = true; this.signalingState = 'closed' }
}

async function settle() {
  // Drain the controller's serialized signaling and RTC promise continuations.
  for (let count = 0; count < 40; count++) await Promise.resolve()
}
async function tick(context: TestContext, milliseconds: number) {
  context.mock.timers.tick(milliseconds)
  await settle()
}

function configuration(number: number, lifetime = 3600000): VoiceConfiguration {
  // The server clock deliberately differs from the device clock.
  return { serverTime: 50000000, expiresAt: 50000000 + lifetime, relayConfigured: true,
    iceServers: [{ urls: 'turns:turn.example.com:443?transport=tcp', username: 'temporary-' + number, credential: 'test' }] }
}

function harness(context: TestContext, options: { host?: boolean; lifetime?: number; load?: () => Promise<VoiceConfiguration> } = {}) {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 })
  const original = Object.getOwnPropertyDescriptor(globalThis, 'RTCPeerConnection')
  Object.defineProperty(globalThis, 'RTCPeerConnection', { configurable: true, writable: true, value: FakePeer })
  FakePeer.instances = []
  const messages: VoiceSignal[] = []
  const statuses: { status: string; error?: string }[] = []
  let loads = 0
  const track = { enabled: true } as MediaStreamTrack
  const stream = { getTracks: () => [track] } as unknown as MediaStream
  const controller = new VoiceConnection({
    host: options.host ?? true, stream,
    send: message => messages.push(message),
    status: (status, error) => statuses.push({ status, error }),
    remote: () => {},
    loadConfiguration: () => {
      loads += 1
      return options.load ? options.load() : Promise.resolve(configuration(loads, options.lifetime))
    },
  })
  context.after(() => {
    controller.stop()
    if (original) Object.defineProperty(globalThis, 'RTCPeerConnection', original)
    else Reflect.deleteProperty(globalThis, 'RTCPeerConnection')
  })
  controller.start()
  controller.receive({ kind: 'state', joined: true })
  const offers = () => messages.filter((message): message is Extract<VoiceSignal, { kind: 'description' }> =>
    message.kind === 'description' && message.description.type === 'offer')
  const answer = (id: string, ufrag = 'remote') => controller.receive({
    kind: 'description', negotiationId: id, description: { type: 'answer', sdp: sdp(ufrag) },
  })
  return { controller, messages, statuses, offers, answer, track, loads: () => loads }
}

test('sends offer and answer descriptions before candidates emitted during setLocalDescription', async context => {
  const host = harness(context)
  await settle()
  const offered = host.messages.filter(message => message.kind === 'description' || message.kind === 'candidate')
  assert.equal(offered[0].kind, 'description')
  assert.equal(offered[1].kind, 'candidate')
  assert.equal(offered[0].negotiationId, offered[1].negotiationId)
})

test('refreshes server-relative credentials after mobile sleep even when RTC still reports connected', async context => {
  const host = harness(context, { lifetime: 120000 })
  await settle()
  host.answer(host.offers()[0].negotiationId)
  await settle()
  const peer = FakePeer.instances[0]
  peer.connected()
  host.track.enabled = false
  context.mock.timers.setTime(96999)
  host.controller.resume()
  await tick(context, 0)
  assert.equal(host.loads(), 1)
  context.mock.timers.setTime(97001)
  host.controller.resume()
  await tick(context, 0)
  assert.equal(host.loads(), 2)
  assert.equal(FakePeer.instances.length, 1)
  assert.equal(peer.offers[1].iceRestart, true)
  assert.equal(peer.configurations.at(-1)!.iceServers![0].username, 'temporary-2')
  assert.equal(peer.tracks[0].enabled, false, 'refresh must retain the muted microphone track')
})

test('host reports connected and cancels the retry watchdog when an answered ICE restart emits no state events', async context => {
  const host = harness(context)
  await settle()
  host.answer(host.offers()[0].negotiationId)
  await settle()
  const peer = FakePeer.instances[0]
  peer.connected()
  host.controller.retry()
  await tick(context, 0)
  assert.equal(host.statuses.at(-1)?.status, 'Reconnecting voice…')
  assert.equal(peer.connectionState, 'connected')
  assert.equal(peer.iceConnectionState, 'connected')
  host.answer(host.offers()[1].negotiationId, 'restarted-remote')
  await settle()
  assert.equal(host.statuses.at(-1)?.status, 'Voice connected')
  const loads = host.loads()
  await tick(context, 20000)
  assert.equal(host.loads(), loads, 'a completed restart must not trigger another watchdog retry')
  assert.equal(host.offers().length, 2)
  assert.equal(FakePeer.instances.length, 1)
  assert.equal(host.statuses.at(-1)?.status, 'Voice connected')
})

test('guest reports connected and cancels the retry watchdog after answering a restart with no state events', async context => {
  const guest = harness(context, { host: false })
  guest.controller.receive({ kind: 'description', negotiationId: 'first-offer', description: { type: 'offer', sdp: sdp('remote') } })
  await settle()
  const peer = FakePeer.instances[0]
  peer.connected()
  guest.controller.retry()
  await tick(context, 0)
  assert.equal(guest.statuses.at(-1)?.status, 'Reconnecting voice…')
  assert.equal(peer.connectionState, 'connected')
  assert.equal(peer.iceConnectionState, 'connected')
  guest.controller.receive({ kind: 'description', negotiationId: 'restarted-offer', description: { type: 'offer', sdp: sdp('restarted-remote') } })
  await settle()
  assert.equal(guest.statuses.at(-1)?.status, 'Voice connected')
  const loads = guest.loads()
  const restarts = guest.messages.filter(message => message.kind === 'restart').length
  await tick(context, 20000)
  assert.equal(guest.loads(), loads, 'an answered restart must not trigger another watchdog retry')
  assert.equal(guest.messages.filter(message => message.kind === 'restart').length, restarts)
  assert.equal(FakePeer.instances.length, 1)
  assert.equal(guest.statuses.at(-1)?.status, 'Voice connected')
})

test('rejects obsolete answers and candidates and waits for the matching remote ICE generation', async context => {
  const host = harness(context)
  await settle()
  const firstId = host.offers()[0].negotiationId
  host.answer(firstId, 'old-remote')
  await settle()
  const peer = FakePeer.instances[0]
  host.controller.receive({ kind: 'candidate', negotiationId: firstId, candidate: candidate('old-remote') })
  await settle()
  assert.equal(peer.addedCandidates.length, 1)
  host.controller.retry()
  await tick(context, 0)
  const secondId = host.offers()[1].negotiationId
  host.answer(firstId, 'obsolete')
  host.controller.receive({ kind: 'candidate', negotiationId: firstId, candidate: candidate('old-remote') })
  host.controller.receive({ kind: 'candidate', negotiationId: secondId, candidate: candidate('new-remote') })
  await settle()
  assert.equal(peer.remoteDescriptions.length, 1)
  assert.equal(peer.addedCandidates.length, 1)
  host.answer(secondId, 'new-remote')
  host.controller.receive({ kind: 'candidate', negotiationId: secondId, candidate: candidate('old-remote') })
  await settle()
  assert.equal(peer.remoteDescriptions.length, 2)
  assert.equal(peer.addedCandidates.length, 2)
  assert.equal(peer.addedCandidates[1].usernameFragment, 'new-remote')
})

test('discards an in-flight configuration after partner leaves and starts cleanly on rejoin', async context => {
  let resolveFirst!: (value: VoiceConfiguration) => void
  const first = new Promise<VoiceConfiguration>(resolve => { resolveFirst = resolve })
  let calls = 0
  const host = harness(context, { load: () => ++calls === 1 ? first : Promise.resolve(configuration(calls)) })
  await settle()
  assert.equal(host.loads(), 1)
  host.controller.receive({ kind: 'state', joined: false })
  host.controller.receive({ kind: 'state', joined: true })
  resolveFirst(configuration(1))
  await settle()
  assert.equal(host.loads(), 2)
  assert.equal(FakePeer.instances.length, 1)
  assert.equal(host.offers().length, 1)
  assert.equal(FakePeer.instances[0].configurations[0].iceServers![0].username, 'temporary-2')
})

test('stopping during configuration does not open a peer or send late signaling', async context => {
  let resolve!: (value: VoiceConfiguration) => void
  const pending = new Promise<VoiceConfiguration>(done => { resolve = done })
  const host = harness(context, { load: () => pending })
  await settle()
  host.controller.stop()
  host.controller.stop()
  resolve(configuration(1))
  await settle()
  await tick(context, 3600000)
  assert.equal(FakePeer.instances.length, 0)
  assert.equal(host.offers().length, 0)
  assert.equal(host.messages.filter(message => message.kind === 'state' && !message.joined).length, 1)
})

test('bounds automatic retries and lets a guest manual retry recover an exhausted host with an unanswered offer', async context => {
  const host = harness(context)
  await settle()
  for (const delay of [1000, 2000, 4000]) {
    await tick(context, 15000)
    await tick(context, delay)
  }
  await tick(context, 15000)
  assert.equal(host.loads(), 4)
  assert.equal(host.statuses.at(-1)?.status, 'Voice could not connect')
  assert.match(host.statuses.at(-1)!.error!, /text chat/)
  host.controller.receive({ kind: 'restart' })
  await tick(context, 0)
  assert.equal(host.loads(), 4, 'automatic peer restarts must not extend exhausted retries')
  host.controller.receive({ kind: 'restart', manual: true })
  await tick(context, 0)
  assert.equal(host.loads(), 5)
  assert.equal(host.offers().length, 5)
  assert.ok(FakePeer.instances.slice(0, -1).every(peer => peer.closed))
})

test('guest answers queue early candidates and explicitly marks a player-requested restart', async context => {
  const guest = harness(context, { host: false })
  guest.controller.receive({ kind: 'description', negotiationId: 'host-generation', description: { type: 'offer', sdp: sdp('remote') } })
  await settle()
  const signals = guest.messages.filter(message => message.kind === 'description' || message.kind === 'candidate')
  assert.equal(signals[0].kind, 'description')
  assert.equal(signals[1].kind, 'candidate')
  FakePeer.instances[0].connected()
  guest.controller.retry()
  await tick(context, 0)
  assert.equal(guest.loads(), 2)
  assert.deepEqual(guest.messages.at(-1), { kind: 'restart', manual: true })
})

test('configuration failures stop after bounded retries and retain an actionable voice-only error', async context => {
  const host = harness(context, { load: async () => { throw new Error('Voice relay is not configured. You can keep using text chat.') } })
  await settle()
  for (const delay of [1000, 2000, 4000]) await tick(context, delay)
  assert.equal(host.loads(), 4)
  assert.equal(host.statuses.at(-1)?.status, 'Voice could not connect')
  assert.equal(host.statuses.at(-1)?.error, 'Voice relay is not configured. You can keep using text chat.')
  assert.equal(FakePeer.instances.length, 0)
})
