import { randomUUID } from 'node:crypto'
import { matchMaker } from '@colyseus/core'
import type { UserProfile } from '../shared/types'
import { rooms } from './room'
import { hasLanguages, matchmakingConfig as config, nextPair } from './matchmaking-rules'
import { activity, cancelSearch, claimPair, claimRoom, enqueue, release, waiting } from './participation'
import { RequestError } from './store'

type Reservation = Awaited<ReturnType<typeof matchMaker.reserveSeatFor>>
const offers = new Map<string, { seat: Reservation; roomId: string; expiresAt: number }>()

function sweep(now: number) {
  for (const [uid, offer] of offers) {
    if (offer.expiresAt <= now || !rooms.has(offer.roomId)) offers.delete(uid)
  }
  return waiting(now, config.heartbeatTimeoutMs)
}

function matchWaiting() {
  const now = Date.now()
  const entries = sweep(now)
  const pair = nextPair(entries, now)
  if (!pair) return
  const marker = Symbol()
  if (claimPair(pair.players, marker)) void reservePair(pair, marker)
}

async function reservePair(pair: NonNullable<ReturnType<typeof nextPair>>, marker: symbol) {
  const [host, guest] = pair.players.map(entry => entry.profile)
  let roomId: string | undefined
  try {
    const listing = await matchMaker.createRoom('duo', {})
    roomId = listing.roomId
    const room = rooms.get(roomId)
    if (!room) throw new Error('Match room was disposed.')
    const secret = randomUUID()
    room.configureMatch(host.uid, guest.uid, pair.type, secret)
    // Keep both seats reserved before delivering either one.
    const first = await matchMaker.reserveSeatFor(listing, { secret }, host)
    const second = await matchMaker.reserveSeatFor(listing, { secret }, guest)
    for (const player of [host, guest]) {
      if (!claimRoom(player.uid, roomId, marker)) throw new Error('Match claim was lost.')
    }
    const expiresAt = Date.now() + config.seatTimeoutMs
    offers.set(host.uid, { seat: first, roomId, expiresAt })
    offers.set(guest.uid, { seat: second, roomId, expiresAt })
  } catch (error) {
    if (roomId) void rooms.get(roomId)?.disconnect()
    for (const { uid } of [host, guest]) {
      release(uid, marker)
      if (roomId) release(uid, roomId)
    }
    console.error('Could not reserve a matchmaking room.', error)
  }
}

const timer = setInterval(matchWaiting, 500)
timer.unref()

export function startSearch(profile: UserProfile) {
  const now = Date.now()
  sweep(now)
  if (!hasLanguages(profile)) throw new RequestError(400, 'Choose valid fluent and learning languages in Profile.')
  const entry = enqueue(profile, now)
  if (!entry) {
    const offer = offers.get(profile.uid)
    if (offer && !rooms.get(offer.roomId)?.hasJoined(profile.uid)) return { status: 'searching', waitedMs: 0 }
    const state = activity(profile.uid)
    if (state && 'room' in state && typeof state.room === 'symbol') return { status: 'searching', waitedMs: 0 }
    throw new RequestError(409, 'You already have a room or a match is being assigned.')
  }
  matchWaiting()
  return { status: 'searching', waitedMs: now - entry.joinedAt }
}

export function searchStatus(uid: string) {
  const now = Date.now()
  sweep(now)
  const offer = offers.get(uid)
  if (offer && !rooms.get(offer.roomId)?.hasJoined(uid)) return { status: 'matched', seat: offer.seat }
  const state = activity(uid)
  if (state && 'queue' in state) {
    state.queue.lastSeenAt = now
    matchWaiting()
    return { status: 'searching', waitedMs: now - state.queue.joinedAt }
  }
  if (state && 'room' in state && typeof state.room === 'symbol') return { status: 'searching' }
  return { status: 'idle' }
}

export function stopSearch(uid: string) {
  sweep(Date.now())
  const state = activity(uid)
  const offer = offers.get(uid)
  if (offer && rooms.get(offer.roomId)?.cancelPendingMatch()) {
    for (const [player, pending] of offers) {
      if (pending.roomId === offer.roomId) offers.delete(player)
    }
    return
  }
  if (state && 'room' in state && typeof state.room === 'symbol') {
    release(uid, state.room)
    return
  }
  if (state && 'room' in state) throw new RequestError(409, 'Your match is already being assigned.')
  cancelSearch(uid)
}
