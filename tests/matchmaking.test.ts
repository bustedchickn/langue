import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Language, UserProfile } from '../shared/types'
import { compatibility, nextPair } from '../server/matchmaking-rules'
import { activity, cancelSearch, claimPair, claimRoom, enqueue, release, waiting } from '../server/participation'

function profile(uid: string, fluentLanguage: Language, learningLanguage: Language): UserProfile {
  return { uid, username: uid, displayName: uid, fluentLanguage, learningLanguage, createdAt: 0, lastSeenAt: 0 }
}
const first = profile('first', 'English', 'French')
const reciprocal = profile('reciprocal', 'French', 'English')
const shared = profile('shared', 'Spanish', 'French')
const incompatible = profile('incompatible', 'Spanish', 'English')
const entry = (profile: UserProfile, joinedAt = 0) => ({ profile, joinedAt, lastSeenAt: joinedAt })

test('evaluates reciprocal first, shared learning second, and rejects unrelated and invalid languages', () => {
  assert.equal(compatibility(first, reciprocal), 'reciprocal')
  assert.equal(compatibility(first, shared), 'shared-learning')
  assert.equal(compatibility(first, incompatible), undefined)
  assert.equal(compatibility(first, { ...shared, learningLanguage: undefined! }), undefined)
  assert.equal(compatibility(first, { ...shared, fluentLanguage: 'invalid' as Language }), undefined)
})

test('reserves the first ten seconds for reciprocal matches and still prefers them after the delay', () => {
  assert.equal(nextPair([entry(first), entry(shared)], 9999, 10000), undefined)
  assert.equal(nextPair([entry(first), entry(shared, 5000)], 10000, 10000), undefined)
  assert.equal(nextPair([entry(first), entry(shared)], 10000, 10000)?.type, 'shared-learning')
  assert.equal(nextPair([entry(first), entry(shared), entry(reciprocal)], 10000, 10000)?.type, 'reciprocal')
  assert.equal(nextPair([entry(first), entry(incompatible)], 1000000), undefined)
  assert.equal(nextPair([entry(first), entry(first)], 1000000), undefined)
})

test('deduplicates heartbeats, expires disconnected queue entries, cancels, and claims each player once', () => {
  const a = enqueue(first, 1)!
  assert.equal(enqueue(first, 2), a)
  assert.equal(a.joinedAt, 1)
  assert.ok(waiting(16, 15).includes(a))
  assert.equal(waiting(17, 15).length, 0)
  assert.equal(activity(first.uid), undefined)
  const left = enqueue(first, 18)!
  cancelSearch(first.uid)
  assert.equal(activity(first.uid), undefined)
  const active = enqueue(first, 20)!
  const right = enqueue(reciprocal, 20)!
  const marker = Symbol()
  assert.equal(claimPair([left, right], marker), false)
  assert.equal(claimPair([active, right], marker), true)
  assert.equal(claimPair([active, right], Symbol()), false)
  assert.equal(claimRoom(first.uid, 'another'), false)
  assert.equal(enqueue(first, 21), undefined)
  assert.equal(claimRoom(first.uid, 'room', marker), true)
  release(first.uid, marker)
  assert.deepEqual(activity(first.uid), { room: 'room' })
  release(first.uid, 'room')
  release(reciprocal.uid, marker)
})
