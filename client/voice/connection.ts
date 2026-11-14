import type { VoiceConfiguration, VoiceSignal } from '../../shared/types'

type Options = {
  host: boolean
  stream: MediaStream
  send: (signal: VoiceSignal) => void
  loadConfiguration: () => Promise<VoiceConfiguration>
  status: (status: string, error?: string) => void
  remote: (stream?: MediaStream) => void
}

// The host coordinates offers, including restarts requested by the guest. Keeping
// one offerer prevents glare when both devices notice the same network failure.
export class VoiceConnection {
  private active = true
  private partner = false
  private epoch = 0
  private peer?: RTCPeerConnection
  private configuration?: VoiceConfiguration
  private negotiationId?: string
  private remoteReady = false
  private descriptionSent = false
  private localCandidates: RTCIceCandidateInit[] = []
  private pending = new Map<string, RTCIceCandidateInit[]>()
  private obsolete = new Set<string>()
  private work = Promise.resolve()
  private attempts = 0
  private exhausted = false
  private negotiating = false
  private configurationError = ''
  private refreshAt = Infinity
  private manualRetry = false
  private retryTimer?: ReturnType<typeof setTimeout>
  private deadline?: ReturnType<typeof setTimeout>
  private refreshTimer?: ReturnType<typeof setTimeout>

  constructor(private options: Options) {}

  start() {
    this.options.status('Waiting for your partner to join voice…')
    this.options.send({ kind: 'state', joined: true })
  }

  receive(signal: VoiceSignal) {
    if (!this.active) return
    if (signal.kind === 'state') {
      const changed = this.partner !== signal.joined
      this.partner = signal.joined
      if (!signal.joined) {
        this.closePeer()
        this.attempts = 0
        this.exhausted = false
        this.options.status('Waiting for your partner to join voice…')
      } else if (changed) {
        this.options.status('Connecting voice…')
        this.watchdog()
        if (this.options.host) this.enqueue(() => this.offer())
      }
      return
    }
    if (!this.partner) return
    if (signal.kind === 'restart') {
      if (this.options.host && !this.negotiating &&
          (this.exhausted || this.peer?.signalingState !== 'have-local-offer')) {
        // A partner's manual retry also wakes an exhausted coordinator.
        if (this.exhausted && signal.manual) { this.exhausted = false; this.attempts = 0 }
        this.recover(0)
      }
      return
    }
    this.enqueue(async () => {
      if (signal.kind === 'description') await this.description(signal)
      else if (signal.kind === 'candidate') await this.candidate(signal)
    })
  }

  retry = () => {
    if (!this.active) return
    clearTimeout(this.retryTimer)
    this.retryTimer = undefined
    this.attempts = 0
    this.exhausted = false
    this.manualRetry = true
    this.options.send({ kind: 'state', joined: true })
    if (this.partner) this.recover(0)
  }

  // Browsers may not emit another ICE event after resuming a suspended tab.
  resume = () => {
    if (this.active && this.partner && (!this.healthy() || this.exhausted || Date.now() >= this.refreshAt)) this.retry()
  }

  stop() {
    if (!this.active) return
    this.active = false
    this.options.send({ kind: 'state', joined: false })
    this.closePeer()
  }

  private healthy() {
    return this.peer?.connectionState === 'connected' &&
      ['connected', 'completed'].includes(this.peer.iceConnectionState)
  }

  private reportHealthy() {
    if (!this.active || !this.partner || !this.remoteReady ||
        this.peer?.signalingState !== 'stable' || !this.healthy()) return false
    clearTimeout(this.deadline)
    clearTimeout(this.retryTimer)
    this.retryTimer = undefined
    this.attempts = 0
    this.exhausted = false
    this.options.status('Voice connected')
    return true
  }

  private enqueue(action: () => Promise<void>) {
    const epoch = this.epoch
    this.work = this.work.then(async () => {
      if (this.active && this.partner && epoch === this.epoch) await action()
    }).catch(() => {
      if (this.active && this.partner && epoch === this.epoch) this.recover()
    })
  }

  private async configure() {
    const epoch = this.epoch
    let configuration: VoiceConfiguration
    try {
      configuration = await this.options.loadConfiguration()
    } catch (error) {
      this.configurationError = error instanceof Error && error.name !== 'AbortError'
        ? error.message : 'Could not refresh voice settings. Check your internet connection and try again.'
      throw error
    }
    if (!this.active || !this.partner || epoch !== this.epoch) return false
    this.configurationError = ''
    this.configuration = configuration
    clearTimeout(this.refreshTimer)
    this.refreshAt = Infinity
    if (configuration.expiresAt !== null) {
      // Use server-relative lifetime, not the potentially skewed device clock.
      const lifetime = configuration.expiresAt - configuration.serverTime
      const margin = Math.min(60000, lifetime / 5)
      this.refreshAt = Date.now() + Math.max(1000, lifetime - margin)
      this.refreshTimer = setTimeout(() => {
        if (!this.partner || !this.active) return
        this.recover(0)
      }, Math.max(1000, lifetime - margin))
    }
    return true
  }

  private createPeer() {
    const connection = new RTCPeerConnection({ iceServers: this.configuration!.iceServers })
    this.peer = connection
    this.options.stream.getTracks().forEach(track => connection.addTrack(track, this.options.stream))
    connection.onicecandidate = ({ candidate }) => {
      if (!candidate || !this.active || this.peer !== connection || !this.negotiationId) return
      // Ignore a late candidate from the previous ICE generation.
      if (candidate.usernameFragment && !connection.localDescription?.sdp.includes('a=ice-ufrag:' + candidate.usernameFragment)) return
      if (this.descriptionSent) this.options.send({ kind: 'candidate', negotiationId: this.negotiationId, candidate: candidate.toJSON() })
      else if (this.localCandidates.length < 100) this.localCandidates.push(candidate.toJSON())
    }
    connection.ontrack = event => {
      if (this.active && this.peer === connection) {
        this.options.remote(event.streams[0] ?? new MediaStream([event.track]))
      }
    }
    const changed = () => {
      if (!this.active || this.peer !== connection) return
      if (this.reportHealthy()) return
      if (connection.connectionState === 'failed' || connection.iceConnectionState === 'failed') {
        this.recover(1000)
      } else if (connection.connectionState === 'disconnected' || connection.iceConnectionState === 'disconnected') {
        this.recover(2500)
      }
    }
    connection.onconnectionstatechange = changed
    connection.oniceconnectionstatechange = changed
    return connection
  }

  private async offer() {
    if (this.negotiating || !this.active || !this.partner) return
    this.negotiating = true
    try {
      if (!await this.configure()) return
      // A missing answer can leave an outstanding offer. Rebuild that peer on
      // retry instead of permanently waiting for signalingState to become stable.
      if (this.peer && this.peer.signalingState !== 'stable') this.closePeer(false)
      const iceRestart = !!this.peer || this.attempts > 0
      const connection = this.peer ?? this.createPeer()
      connection.setConfiguration({ iceServers: this.configuration!.iceServers })
      this.nextNegotiation(crypto.randomUUID())
      const id = this.negotiationId!
      this.watchdog()
      await connection.setLocalDescription(await connection.createOffer({ iceRestart }))
      if (this.active && this.peer === connection && connection.localDescription) {
        this.options.send({ kind: 'description', negotiationId: id, description: connection.localDescription.toJSON() })
        this.flushLocalCandidates(id)
      }
    } finally {
      this.negotiating = false
    }
  }

  private async description(signal: Extract<VoiceSignal, { kind: 'description' }>) {
    if (signal.description.type !== (this.options.host ? 'answer' : 'offer') || this.obsolete.has(signal.negotiationId)) return
    if (this.options.host && signal.negotiationId !== this.negotiationId) return
    if (!this.options.host) {
      if (signal.negotiationId === this.negotiationId) return
      if (!await this.configure()) return
      this.nextNegotiation(signal.negotiationId)
    }
    const connection = this.peer ?? this.createPeer()
    if (!this.options.host) connection.setConfiguration({ iceServers: this.configuration!.iceServers })
    await connection.setRemoteDescription(signal.description)
    if (!this.active || this.peer !== connection || signal.negotiationId !== this.negotiationId) return
    this.remoteReady = true
    for (const candidate of this.pending.get(signal.negotiationId) ?? []) await this.addCandidate(connection, candidate)
    this.pending.delete(signal.negotiationId)
    if (!this.active || this.peer !== connection || signal.negotiationId !== this.negotiationId) return
    if (!this.options.host) {
      this.watchdog()
      await connection.setLocalDescription(await connection.createAnswer())
      if (this.active && this.peer === connection && connection.localDescription) {
        this.options.send({ kind: 'description', negotiationId: signal.negotiationId, description: connection.localDescription.toJSON() })
        this.flushLocalCandidates(signal.negotiationId)
      }
    }
    // An ICE restart can leave a working transport connected throughout the
    // exchange. Such browsers emit no new connected event after the answer.
    this.reportHealthy()
  }

  private nextNegotiation(id: string) {
    if (this.negotiationId) this.obsolete.add(this.negotiationId)
    if (this.obsolete.size > 32) this.obsolete.delete(this.obsolete.values().next().value!)
    this.negotiationId = id
    this.remoteReady = false
    this.descriptionSent = false
    this.localCandidates = []
    for (const key of this.pending.keys()) if (key !== id) this.pending.delete(key)
  }

  private flushLocalCandidates(id: string) {
    this.descriptionSent = true
    for (const candidate of this.localCandidates) this.options.send({ kind: 'candidate', negotiationId: id, candidate })
    this.localCandidates = []
  }

  private async candidate(signal: Extract<VoiceSignal, { kind: 'candidate' }>) {
    if (this.obsolete.has(signal.negotiationId)) return
    if (this.peer && this.remoteReady && signal.negotiationId === this.negotiationId) {
      await this.addCandidate(this.peer, signal.candidate)
    } else if (this.pending.size < 4 || this.pending.has(signal.negotiationId)) {
      const candidates = this.pending.get(signal.negotiationId) ?? []
      if (candidates.length < 100) candidates.push(signal.candidate)
      this.pending.set(signal.negotiationId, candidates)
    }
  }

  private async addCandidate(connection: RTCPeerConnection, candidate: RTCIceCandidateInit) {
    // One obsolete or unusable candidate should not discard otherwise viable ICE
    // candidates. The connection watchdog handles complete connectivity failures.
    if (candidate.usernameFragment && !connection.remoteDescription?.sdp.includes('a=ice-ufrag:' + candidate.usernameFragment)) return
    await connection.addIceCandidate(candidate).catch(() => {})
  }

  private watchdog() {
    clearTimeout(this.deadline)
    this.deadline = setTimeout(() => this.recover(), 15000)
  }

  private recover(delay = Math.min(1000 * 2 ** this.attempts, 4000)) {
    if (!this.active || !this.partner || this.retryTimer || this.exhausted) return
    if (this.attempts >= 3) {
      this.exhausted = true
      clearTimeout(this.deadline)
      this.options.status('Voice could not connect', this.configurationError
        ? this.configurationError + (this.configurationError.includes('text chat') ? '' : ' You can keep using text chat.')
        : this.configuration?.relayConfigured
        ? 'This network or the voice relay is unavailable. Try Retry Voice, another network, or ask the network administrator to allow voice. You can keep using text chat.'
        : 'The server has no TURN relay configured for restricted networks. You can keep using text chat.')
      return
    }
    this.options.status('Reconnecting voice…')
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined
      this.attempts += 1
      this.watchdog()
      this.enqueue(async () => {
        if (this.options.host) await this.offer()
        else {
          // Refresh here too: a guest may be the only device noticing a failure.
          if (await this.configure()) {
            this.options.send({ kind: 'restart', ...(this.manualRetry ? { manual: true } : {}) })
            this.manualRetry = false
          }
        }
      })
    }, delay)
  }

  private closePeer(reset = true) {
    this.epoch += 1
    clearTimeout(this.retryTimer)
    clearTimeout(this.deadline)
    this.retryTimer = undefined
    if (reset) {
      clearTimeout(this.refreshTimer)
      this.refreshAt = Infinity
      this.negotiating = false
    }
    if (this.negotiationId) this.obsolete.add(this.negotiationId)
    this.negotiationId = undefined
    this.remoteReady = false
    this.descriptionSent = false
    this.localCandidates = []
    this.pending.clear()
    if (this.peer) {
      this.peer.onconnectionstatechange = null
      this.peer.oniceconnectionstatechange = null
      this.peer.onicecandidate = null
      this.peer.ontrack = null
      this.peer.close()
      this.peer = undefined
    }
    this.options.remote()
  }
}
