import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { db, getProfile, profileRef, saveProfile } from '../server/store'
import { getLeaderboards, recordGameScore } from '../server/leaderboard'
import type { GameResults } from '../shared/minigames/contracts'

if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Run this check with the Firestore emulator.')

const ids = [randomUUID(), randomUUID()] as const
const matchId = randomUUID()
const result: GameResults = {
  gameId: 'codenames', outcome: 'victory', completed: 6, attempted: 6,
  elapsedMs: 1000, score: 300, players: ['First', 'Second'],
}
try {
  for (const [index, uid] of ids.entries()) {
    await saveProfile(uid, {
      username: 'smoke_' + uid.replaceAll('-', '').slice(0, 16),
      displayName: index === 0 ? 'First' : 'Second',
      fluentLanguage: 'English', learningLanguage: 'French',
    })
  }
  assert.equal(await recordGameScore(matchId, result, [...ids]), true)
  assert.equal(await recordGameScore(matchId, result, [...ids]), false)
  await saveProfile(ids[0], {
    displayName: 'Renamed Player', fluentLanguage: 'English', learningLanguage: 'French',
  })
  const board = await getLeaderboards(ids[0])
  assert.equal((await getProfile(ids[0]))?.scores?.total, 300)
  assert.equal(board.mine.games.codenames.highScore, 300)
  assert.equal(board.mine.gamesPlayed, 1)
  assert.equal(board.overall.find(row => row.uid === ids[0])?.displayName, 'Renamed Player')
  assert.equal(board.games.codenames.find(row => row.uid === ids[0])?.score, 300)
  console.log('Leaderboard emulator check passed.')
} finally {
  const batch = db.batch()
  for (const uid of ids) {
    batch.delete(profileRef(uid))
    batch.delete(db.collection('usernames').doc('smoke_' + uid.replaceAll('-', '').slice(0, 16)))
  }
  batch.delete(db.collection('scoredMatches').doc(matchId))
  await batch.commit()
}
