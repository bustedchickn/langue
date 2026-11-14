import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { test } from 'node:test'
import { issueCloudflareVoiceConfiguration, issueVoiceConfiguration, parseVoiceSignal, voiceSettings } from '../server/voice'

const secret = 'a-strong-test-only-shared-secret-of-64-characters-xxxxxxxxxxxxxxxx'
const turnUrls = [
  'turn:turn.example.com:3478?transport=udp',
  'turn:turn.example.com:3478?transport=tcp',
  'turns:turn.example.com:5349?transport=tcp',
  'turns:turn.example.com:443?transport=tcp',
]
const configured = { NODE_ENV: 'production', TURN_SECRET: secret, TURN_URLS: turnUrls.join(',') }

test('exchanges a server-only Cloudflare token for expiring relay credentials', async () => {
  const settings = voiceSettings({ NODE_ENV: 'production', CLOUDFLARE_TURN_KEY_ID: 'key', CLOUDFLARE_TURN_API_TOKEN: secret })
  assert.equal(settings.unavailableReason, undefined)
  const urls = turnUrls.map(url => url.replace('turn.example.com', 'turn.cloudflare.com'))
  const config = await issueCloudflareVoiceConfiguration(settings.cloudflare!, 3600, async (url, options) => {
    assert.equal(url, 'https://rtc.live.cloudflare.com/v1/turn/keys/key/credentials/generate-ice-servers')
    assert.equal(new Headers(options?.headers).get('Authorization'), `Bearer ${secret}`)
    assert.equal(options?.body, '{"ttl":3600}')
    return Response.json({ iceServers: [{ urls, username: 'player', credential: 'temporary' }] })
  })
  assert.equal(config.relayConfigured, true)
  assert.ok(config.expiresAt! > config.serverTime)
  assert.ok(!JSON.stringify(config).includes(secret))
  assert.equal(config.iceServers[1].credential, 'temporary')
  await assert.rejects(issueCloudflareVoiceConfiguration(settings.cloudflare!, 3600, async () =>
    Response.json({ iceServers: [{ urls: urls.slice(0, 2), username: 'player', credential: 'temporary' }] })), /transports/)
})

test('issues expiring coturn REST credentials without exposing secret or Firebase UID', () => {
  const settings = voiceSettings(configured)
  const now = 1700000000123
  const config = issueVoiceConfiguration(settings, 'private-firebase-uid', now)
  assert.equal(config.serverTime, now)
  assert.equal(config.expiresAt, 1700003600000)
  assert.equal(config.relayConfigured, true)
  assert.deepEqual(config.iceServers[1].urls, turnUrls)
  const { username, credential } = config.iceServers[1]
  assert.ok(username?.startsWith('1700003600:'))
  assert.equal(credential, createHmac('sha1', secret).update(username!).digest('base64'))
  assert.ok(!JSON.stringify(config).includes(secret))
  assert.ok(!JSON.stringify(config).includes('private-firebase-uid'))
  assert.notEqual(issueVoiceConfiguration(settings, 'private-firebase-uid', now).iceServers[1].username, username)
  const refreshed = issueVoiceConfiguration(settings, 'private-firebase-uid', now + 3600000)
  assert.equal(refreshed.expiresAt, config.expiresAt! + 3600000)
  assert.notEqual(refreshed.iceServers[1].credential, credential)
})

test('supports explicit short test credentials and clock offset metadata', () => {
  const config = issueVoiceConfiguration(voiceSettings({ ...configured, TURN_CREDENTIAL_TTL_SECONDS: '120' }), 'player', 1000050)
  assert.equal(config.expiresAt, 1120000)
  assert.equal(config.serverTime, 1000050)
})

test('keeps emulator STUN-only mode explicit in the response', () => {
  assert.deepEqual(issueVoiceConfiguration(voiceSettings({}), 'player', 42), {
    iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
    serverTime: 42,
    expiresAt: null,
    relayConfigured: false,
  })
  assert.deepEqual(issueVoiceConfiguration(voiceSettings({ STUN_URLS: '' }), 'player', 0).iceServers, [])
  assert.doesNotThrow(() => voiceSettings({ NODE_ENV: 'production', VOICE_ALLOW_STUN_ONLY: 'true' }))
})

test('production voice reports missing relay without interrupting the game and text chat', () => {
  assert.equal(voiceSettings(configured).unavailableReason, undefined)
  assert.match(voiceSettings({ NODE_ENV: 'production' }).unavailableReason!, /You can keep using text chat/)
  for (const missing of [0, 1, 3]) {
    assert.match(voiceSettings({ ...configured, TURN_URLS: turnUrls.filter((_, index) => index !== missing).join(',') }).unavailableReason!, /Voice relay is not configured/)
  }
  assert.doesNotThrow(() => voiceSettings({ ...configured, STUN_URLS: '' }))
  assert.equal(voiceSettings({ NODE_ENV: 'production', VOICE_ALLOW_STUN_ONLY: 'true' }).unavailableReason, undefined)
})

test('validates credentials, lifetime and ICE URL settings without leaking values', () => {
  for (const ttl of ['', '0', '119', '86401', '1.2', 'NaN']) {
    assert.throws(() => voiceSettings({ ...configured, TURN_CREDENTIAL_TTL_SECONDS: ttl }), /TURN_CREDENTIAL_TTL_SECONDS/)
  }
  assert.throws(() => voiceSettings({ TURN_URLS: turnUrls[0] }), /TURN_SECRET/)
  assert.throws(() => voiceSettings({ TURN_URLS: turnUrls[0], TURN_SECRET: 'weak' }), /TURN_SECRET/)
  for (const url of ['https://turn.example.com', 'turn:user:password@host:3478', 'turn:host:0',
    'turn:host:65536', 'turn:host:3478/path', 'turn:host:3478?password=secret', 'turns:host:443?transport=udp',
    'TURNS:host:443?transport=UDP']) {
    assert.throws(() => voiceSettings({ TURN_URLS: url, TURN_SECRET: secret }), /invalid ICE URL/)
  }
  assert.throws(() => voiceSettings({ STUN_URLS: turnUrls[0] }), /STUN_URLS/)
  assert.deepEqual(voiceSettings({ STUN_URLS: ' stun:one:3478,stun:one:3478,stun:[2001:db8::1]:3478 ' }).stunUrls,
    ['stun:one:3478', 'stun:[2001:db8::1]:3478'])
})

test('signaling keeps negotiation IDs and ICE username fragments for restart generations', () => {
  const signal = { kind: 'candidate', negotiationId: 'new-ice_generation', candidate: {
    candidate: 'candidate:1 1 UDP 1 192.0.2.1 12345 typ relay',
    sdpMid: 'audio', sdpMLineIndex: 0, usernameFragment: 'new-ufrag', ignored: 'not-forwarded',
  }, ignored: 'not-forwarded' }
  assert.deepEqual(parseVoiceSignal(signal), {
    kind: 'candidate', negotiationId: 'new-ice_generation', candidate: {
      candidate: signal.candidate.candidate, sdpMid: 'audio', sdpMLineIndex: 0, usernameFragment: 'new-ufrag',
    },
  })
  assert.deepEqual(parseVoiceSignal({ kind: 'description', negotiationId: 'first', description: { type: 'offer', sdp: 'v=0', injected: true } }),
    { kind: 'description', negotiationId: 'first', description: { type: 'offer', sdp: 'v=0' } })
  assert.deepEqual(parseVoiceSignal({ kind: 'restart', ignored: true }), { kind: 'restart' })
  assert.deepEqual(parseVoiceSignal({ kind: 'restart', manual: true }), { kind: 'restart', manual: true })
  assert.deepEqual(parseVoiceSignal({ kind: 'restart', manual: false }), { kind: 'restart' })
  assert.deepEqual(parseVoiceSignal({ kind: 'state', joined: false }), { kind: 'state', joined: false })
})

test('signaling rejects malformed, unbounded or untagged data', () => {
  for (const input of [undefined, null, 'voice', 1, [], {}, { kind: 'state', joined: 'true' },
    { kind: 'description', description: { type: 'offer', sdp: 'v=0' } },
    { kind: 'description', negotiationId: 'a'.repeat(129), description: { type: 'offer', sdp: 'v=0' } },
    { kind: 'description', negotiationId: 'valid', description: { type: 'rollback', sdp: 'v=0' } },
    { kind: 'description', negotiationId: 'valid', description: { type: 'answer', sdp: 'a'.repeat(16001) } },
    { kind: 'candidate', negotiationId: 'valid', candidate: { candidate: 'a'.repeat(2049) } },
    { kind: 'candidate', negotiationId: 'valid', candidate: { candidate: 'candidate', sdpMLineIndex: -1 } },
    { kind: 'candidate', negotiationId: 'valid', candidate: { candidate: 'candidate', sdpMLineIndex: 1.5 } },
    { kind: 'candidate', negotiationId: 'valid', candidate: { candidate: 'candidate', usernameFragment: 'a'.repeat(257) } },
  ]) assert.equal(parseVoiceSignal(input), undefined)
})
