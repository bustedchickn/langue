import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { startIconCommunication } from '../server/minigames/icon-communication/game'
import { gameIcons } from '../shared/minigames/icons'
import { iconCommunicationConfig as config, type IconResults, type IconView } from '../shared/minigames/icon-communication'
import type { GamePlayers, Seat } from '../shared/minigames/contracts'

const players: GamePlayers = {
  host: { name: 'Selector', learningLanguage: 'French' },
  guest: { name: 'Describer', learningLanguage: 'English' },
}
const start = (pick = (_: number) => 0) => startIconCommunication('match', players, 0, config, pick)
const view = (game: ReturnType<typeof start>, seat: Seat, now: number) => game.view(seat, now) as IconView

test('has 20 distinct illustrated icons and holds the reveal for 3–10 seconds', () => {
  assert.ok(gameIcons.size >= 20)
  for (const icon of gameIcons.values()) assert.match(readFileSync('public' + icon.assetPath, 'utf8'), /<svg/)
  assert.equal(start().progress(0).startsAt, 3000)
  assert.equal(start(max => max - 1).progress(0).startsAt, 10000)
  const game = start()
  assert.equal(Object.hasOwn(view(game, 'guest', 0), 'target'), false)
  const selector = view(game, 'host', 0)
  assert.ok(selector.role === 'selector')
  assert.equal(new Set(selector.grid).size, 9)
  assert.equal(selector.revealed, false)
  game.tick(2999)
  assert.equal(Object.hasOwn(view(game, 'guest', 2999), 'target'), false)
  game.tick(3000)
  const describer = view(game, 'guest', 3000)
  assert.ok(describer.role === 'describer' && describer.target && selector.grid.includes(describer.target))
  assert.equal(Object.hasOwn(view(game, 'host', 3000), 'target'), false)
  assert.equal(Object.hasOwn(describer, 'grid'), false)
  assert.equal(game.progress(3000).endsAt - 3000, 10000)
})

test('validates roles, duplicates, rounds and deadlines, and preserves the target after misses', () => {
  const game = start()
  const guess = { type: 'guess', icon: 'fish', round: 1, revision: 0 }
  assert.equal(game.act('host', guess, 2000), false)
  game.tick(3000)
  assert.equal(game.act('guest', guess, 3001), false)
  assert.equal(game.act('host', { ...guess, icon: 'outside-grid' }, 3001), false)
  const target = view(game, 'guest', 3001)
  assert.equal(game.act('host', guess, 3100), true)
  assert.equal(game.act('host', guess, 3100), false)
  assert.equal(game.progress(3100).round, 1)
  assert.equal(game.progress(3100).endsAt, 11000)
  assert.deepEqual(view(game, 'guest', 3100), { ...target, revision: 1, feedback: 'incorrect' })
  assert.equal(game.act('host', { ...guess, icon: 'cat', revision: 1 }, 4000), true)
  assert.equal(game.progress(4000).score, 1)
  assert.equal(game.progress(4000).round, 2)
  assert.equal(game.progress(4000).startsAt, 7000)
  assert.equal(game.progress(4000).endsAt, 17000)
  game.tick(7000)
  assert.notDeepEqual(view(game, 'guest', 7000), target)
  assert.equal(game.act('host', { ...guess, round: 2, revision: 2 }, 17000), false)
  assert.equal((game.results() as IconResults).incorrectGuesses, 1)
  assert.equal(game.results()?.elapsedMs, 17000)
})

test('a penalty consuming the last seconds ends the game immediately and replay starts fresh', () => {
  const game = start()
  const guess = { type: 'guess', icon: 'fish', round: 1, revision: 0 }
  game.tick(3000)
  assert.equal(game.act('host', guess, 12000), true)
  assert.equal(game.progress(12000).endsAt, 12000)
  assert.equal(game.act('host', { ...guess, revision: 1 }, 12000), false)
  assert.equal((game.results() as IconResults).incorrectGuesses, 1)
  assert.deepEqual((game.results() as IconResults).vocabulary, ['cat'])
  assert.equal(start().progress(0).round, 1)
  assert.equal(start().progress(0).score, 0)
})
