import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addGameScore } from '../server/leaderboard'

test('leaderboard scores accumulate for both games and retain each personal best', () => {
  const first = addGameScore(undefined, 'codenames', 50)
  const second = addGameScore(first, 'codenames', -50)
  const third = addGameScore(second, 'tandem-drive', 75)
  assert.deepEqual(first, { total: 50, gamesPlayed: 1, games: { codenames: { highScore: 50, totalScore: 50, gamesPlayed: 1 } } })
  assert.deepEqual(third, {
    total: 75, gamesPlayed: 3,
    games: {
      codenames: { highScore: 50, totalScore: 0, gamesPlayed: 2 },
      'tandem-drive': { highScore: 75, totalScore: 75, gamesPlayed: 1 },
    },
  })
})
