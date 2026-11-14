import { Room, ServerError, type Client } from '@colyseus/core'
import type { Player, Session, UserProfile } from '../shared/types'
import { db, friendshipRef, requireProfile, verify } from './store'
import { defaultMinigame, minigames } from './minigames/registry'
import type { ActiveMinigame } from './minigames/contracts'
import type { Seat } from '../shared/minigames/contracts'
import { randomUUID } from 'node:crypto'

const disconnectGrace = 30
const waitingTime = 30 * 60 * 1000
type Member = { profile: UserProfile; client: Client; connected: boolean; lastChat: number; voice: boolean }
export const rooms = new Map<string, DuoRoom>()

export class DuoRoom extends Room {
  maxClients = 2
  private host?: Member
  private guest?: Member
  private phase: Session['phase'] = 'lobby'
  private chat: Session['chat'] = []
  private closing = false
  private waiting?: ReturnType<typeof setTimeout>
  private game?: ActiveMinigame
  private gameTimer?: ReturnType<typeof setTimeout>

  onCreate() {
    void this.setPrivate(true)
    rooms.set(this.roomId, this)
    this.log('room-created')
    this.waiting = setTimeout(() => this.end('The room expired while waiting for a partner.'), waitingTime)
    this.onMessage('sync', client => {
      const seat = this.seat(client)
      if (!seat) return
      this.updateGame()
      client.send('role', seat)
      client.send('session', this.snapshot())
      client.send('voice', { kind: 'state', joined: !!this.peer(client)?.voice })
      this.sendGameView(client, seat)
    })
    this.onMessage('phase', (client, action) => {
      const seat = this.seat(client)
      if (!seat || this.closing) return
      if (action === 'lobby' && this.phase === 'results') {
        this.phase = 'lobby'
        this.game = undefined
        this.broadcastSnapshot()
      } else if (action === 'game' && this.phase !== 'game' && seat === 'host') {
        this.startGame()
      }
    })
    this.onMessage('game-action', (client, payload: unknown) => {
      const seat = this.seat(client)
      const game = this.game
      const now = Date.now()
      if (!seat || !game || this.closing || this.phase !== 'game' || !payload || typeof payload !== 'object') return
      const { matchId, action } = payload as Record<string, unknown>
      if (matchId !== game.progress(now).matchId) return
      if (this.updateGame(now)) return
      if (!this.host?.connected || !this.guest?.connected) return
      if (game.act(seat, action, now) && !this.updateGame(now)) this.publishGame()
    })
    this.onMessage('chat', (client, input: unknown) => {
      const member = this.member(client)
      const now = Date.now()
      if (!member || typeof input !== 'string' || input.length > 500 || now - member.lastChat < 800) return
      const message = input.trim()
      if (!message) return
      member.lastChat = now
      this.chat.push({ sender: member.profile.displayName, text: message, timestamp: now })
      if (this.chat.length > 100) this.chat.shift()
      this.broadcastSnapshot()
    })
    this.onMessage('voice', (client, input: unknown) => {
      const member = this.member(client)
      if (!member || !input || typeof input !== 'object') return
      const signal = input as Record<string, unknown>
      const peer = this.peer(client)
      if (signal.kind === 'state' && typeof signal.joined === 'boolean') {
        member.voice = signal.joined
        if (peer?.connected) peer.client.send('voice', { kind: 'state', joined: member.voice })
      } else if (member.voice && peer?.connected && peer.voice) {
        if (signal.kind === 'description') {
          const value = signal.description as Record<string, unknown> | undefined
          if (value && (value.type === 'offer' || value.type === 'answer') &&
              typeof value.sdp === 'string' && value.sdp.length <= 16000) {
            peer.client.send('voice', { kind: 'description', description: { type: value.type, sdp: value.sdp } })
          }
        }
        if (signal.kind === 'candidate') {
          const value = signal.candidate as Record<string, unknown> | undefined
          if (value && typeof value.candidate === 'string' && value.candidate.length <= 2048 &&
              (value.sdpMid == null || (typeof value.sdpMid === 'string' && value.sdpMid.length <= 64)) &&
              (value.sdpMLineIndex == null || Number.isInteger(value.sdpMLineIndex))) {
            peer.client.send('voice', {
              kind: 'candidate',
              candidate: { candidate: value.candidate, sdpMid: value.sdpMid, sdpMLineIndex: value.sdpMLineIndex },
            })
          }
        }
      }
    })
  }

  static async onAuth(token: string) {
    try {
      return await requireProfile(await verify(token))
    } catch (error) {
      throw new ServerError(4215, error instanceof Error ? error.message : 'Unable to sign in.')
    }
  }

  async onJoin(client: Client, options: { invitation?: unknown }, profile: UserProfile) {
    if (!profile || this.closing || this.guest || this.host?.profile.uid === profile.uid || (this.host && !this.host.connected)) {
      throw new ServerError(4215, 'This room cannot accept another player.')
    }
    const member: Member = { profile, client, connected: true, lastChat: 0, voice: false }
    if (options.invitation !== undefined) {
      const host = this.host
      const id = options.invitation
      if (!host || typeof id !== 'string' || !/^[a-zA-Z0-9]{20}$/.test(id)) {
        throw new ServerError(4215, 'Invalid invitation.')
      }
      await db.runTransaction(async tx => {
        const ref = db.collection('invitations').doc(id)
        const friendship = friendshipRef(profile.uid, host.profile.uid).ref
        const [record, destination, relation] = await tx.getAll(ref, db.collection('inviteRooms').doc(id), friendship)
        const invite = record.data()
        if (!invite || invite.to !== profile.uid || invite.from !== host.profile.uid ||
            destination.data()?.roomId !== this.roomId || invite.status !== 'pending' || invite.expiresAt <= Date.now() ||
            relation.data()?.status !== 'accepted' || !this.canInvite(host.profile.uid)) {
          throw new ServerError(4215, 'This invitation is unavailable or expired.')
        }
        tx.update(ref, { status: 'accepted' })
      })
      if (!this.canInvite(host.profile.uid)) {
        throw new ServerError(4215, 'This room is no longer available.')
      }
    }
    if (this.host) {
      this.guest = member
      clearTimeout(this.waiting)
    } else {
      this.host = member
    }
    this.log('player-joined', { seat: this.seat(client) })
    this.broadcastSnapshot()
  }

  async onLeave(client: Client, consented: boolean) {
    const member = this.member(client)
    if (!member || this.closing) return
    member.connected = false
    this.log('player-disconnected', { seat: this.seat(client), consented })
    member.voice = false
    this.broadcastSnapshot()
    this.peer(client)?.client.send('voice', { kind: 'state', joined: false })
    if (!consented) {
      try {
        member.client = await this.allowReconnection(client, disconnectGrace)
        if (this.closing) return
        member.connected = true
        this.log('player-reconnected', { seat: this.seat(client) })
        this.broadcastSnapshot()
        return
      } catch {
        this.end('A player could not reconnect. The session ended.')
        return
      }
    }
    this.end('A player left the session.')
  }

  onDispose() {
    clearTimeout(this.waiting)
    clearTimeout(this.gameTimer)
    rooms.delete(this.roomId)
  }

  canInvite(uid: string) {
    return !this.closing && !this.guest && this.host?.connected && this.host.profile.uid === uid
  }

  private end(reason: string) {
    if (this.closing) return
    this.closing = true
    this.broadcast('ended', reason)
    void this.disconnect()
  }

  private member(client: Client) {
    const seat = this.seat(client)
    return seat && this[seat]
  }

  private seat(client: Client): Seat | undefined {
    if (this.host?.client.sessionId === client.sessionId) return 'host'
    if (this.guest?.client.sessionId === client.sessionId) return 'guest'
  }

  private peer(client: Client) {
    return this.host?.client.sessionId === client.sessionId ? this.guest : this.host
  }

  private snapshot(): Session {
    const player = (member?: Member): Player | null => member ? {
      name: member.profile.displayName, fluentLanguage: member.profile.fluentLanguage,
      learningLanguage: member.profile.learningLanguage, connected: member.connected,
    } : null
    return {
      host: player(this.host), guest: player(this.guest), gameId: defaultMinigame, phase: this.phase, chat: this.chat,
      ...(this.phase === 'game' && this.game ? { progress: this.game.progress(Date.now()) } : {}),
      ...(this.phase === 'results' && this.game ? { results: this.game.results() } : {}),
    }
  }

  private broadcastSnapshot() {
    this.broadcast('session', this.snapshot())
  }

  private log = (event: string, data?: object) => {
    if (process.env.NODE_ENV !== 'production') console.info('[room %s] %s', this.roomId, event, data ?? '')
  }

  private startGame() {
    if (!this.host?.connected || !this.guest?.connected) return
    const game = minigames.get(defaultMinigame)!
    const seats = [this.host, this.guest]
    if (seats.length < game.config.minPlayers || seats.length > game.config.maxPlayers) return
    const { displayName: hostName, learningLanguage: hostLanguage } = this.host.profile
    const { displayName: guestName, learningLanguage: guestLanguage } = this.guest.profile
    this.game = game.start(randomUUID(), {
      host: { name: hostName, learningLanguage: hostLanguage },
      guest: { name: guestName, learningLanguage: guestLanguage },
    }, Date.now(), this.log)
    this.phase = 'game'
    this.log('game-initialized', { game: game.config.id })
    this.publishGame()
    this.scheduleGame()
  }

  private scheduleGame() {
    clearTimeout(this.gameTimer)
    if (!this.game || this.phase !== 'game') return
    const now = Date.now()
    const { startsAt, endsAt } = this.game.progress(now)
    this.gameTimer = setTimeout(() => {
      if (this.closing || this.phase !== 'game') return
      if (this.updateGame()) return
      this.publishGame()
      this.scheduleGame()
    }, Math.max(0, (now < startsAt ? startsAt : endsAt) - now))
  }

  private updateGame(now = Date.now()) {
    if (!this.game || this.phase !== 'game') return false
    this.game.tick(now)
    if (!this.game.results()) return false
    this.phase = 'results'
    clearTimeout(this.gameTimer)
    this.broadcastSnapshot()
    return true
  }

  private publishGame() {
    this.broadcastSnapshot()
    for (const client of this.clients) {
      const seat = this.seat(client)
      if (seat) this.sendGameView(client, seat)
    }
  }

  private sendGameView(client: Client, seat: Seat) {
    if (!this.game || this.phase !== 'game') return
    const now = Date.now()
    const { gameId, matchId, round } = this.game.progress(now)
    client.send('game-view', { gameId, matchId, round, data: this.game.view(seat, now) })
  }
}

