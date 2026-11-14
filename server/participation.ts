import type { UserProfile } from '../shared/types'
import type { QueueEntry } from './matchmaking-rules'

type Participation = { queue: QueueEntry } | { room: string | symbol }
const players = new Map<string, Participation>()

export function activity(uid: string) { return players.get(uid) }

export function enqueue(profile: UserProfile, now: number) {
  const current = players.get(profile.uid)
  if (current && 'room' in current) return
  if (current) {
    current.queue.lastSeenAt = now
    return current.queue
  }
  const queue = { profile, joinedAt: now, lastSeenAt: now }
  players.set(profile.uid, { queue })
  return queue
}

export function waiting(now: number, timeout: number) {
  const entries: QueueEntry[] = []
  for (const [uid, state] of players) {
    if ('room' in state) continue
    if (now - state.queue.lastSeenAt >= timeout) players.delete(uid)
    else entries.push(state.queue)
  }
  return entries
}

export function cancelSearch(uid: string) {
  const state = players.get(uid)
  if (state && 'queue' in state) players.delete(uid)
}

export function claimRoom(uid: string, room: string, previous?: symbol) {
  const state = players.get(uid)
  if (previous ? !state || !('room' in state) || state.room !== previous : state !== undefined) return false
  players.set(uid, { room })
  return true
}

export function claimPair(entries: readonly [QueueEntry, QueueEntry], marker: symbol) {
  if (entries[0].profile.uid === entries[1].profile.uid || entries.some(entry => {
    const state = players.get(entry.profile.uid)
    return !state || !('queue' in state) || state.queue !== entry
  })) return false
  for (const { profile } of entries) players.set(profile.uid, { room: marker })
  return true
}

export function release(uid: string, room: string | symbol) {
  const state = players.get(uid)
  if (state && 'room' in state && state.room === room) players.delete(uid)
}
