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

test('has 20 distinct illustrated icons, a 1–3 second reveal delay, and 20 seconds for the first round', () => {
  assert.ok(gameIcons.size >= 20)
  for (const icon of gameIcons.values()) assert.match(readFileSync('public' + icon.assetPath, 'utf8'), /<svg/)
  assert.equal(new Set([...gameIcons.values()].map(icon => readFileSync('public' + icon.assetPath, 'utf8'))).size, gameIcons.size)
  assert.equal(start().progress(0).startsAt, 1000)
  assert.equal(start(max => max - 1).progress(0).startsAt, 3000)
  const game = start()
  assert.equal(Object.hasOwn(view(game, 'guest', 0), 'target'), false)
  const selector = view(game, 'host', 0)
  assert.ok(selector.role === 'selector')
  assert.equal(new Set(selector.grid).size, 9)
  assert.equal(selector.revealed, false)
  game.tick(999)
  assert.equal(Object.hasOwn(view(game, 'guest', 999), 'target'), false)
  game.tick(1000)
  const describer = view(game, 'guest', 1000)
  assert.ok(describer.role === 'describer' && describer.target && selector.grid.includes(describer.target))
  assert.equal(Object.hasOwn(view(game, 'host', 1000), 'target'), false)
  assert.equal(Object.hasOwn(describer, 'grid'), false)
  assert.equal(game.progress(1000).endsAt - 1000, 20000)
  assert.equal(game.progress(1000).rounds, 10)
  assert.equal(start(max => max - 1).progress(0).endsAt, 23000)
})

test('validates roles, duplicates, rounds and deadlines, and preserves the target after misses', () => {
  const game = start()
  const guess = { type: 'guess', icon: 'fish', round: 1, revision: 0 }
  assert.equal(game.act('host', guess, 900), false)
  game.tick(3000)
  assert.equal(game.act('guest', guess, 3001), false)
  assert.equal(game.act('host', { ...guess, icon: 'outside-grid' }, 3001), false)
  const target = view(game, 'guest', 3001)
  assert.equal(game.act('host', guess, 3100), true)
  assert.equal(game.act('host', guess, 3100), false)
  assert.equal(game.progress(3100).round, 1)
  assert.equal(game.progress(3100).endsAt, 19000)
  assert.deepEqual(view(game, 'guest', 3100), { ...target, revision: 1, feedback: 'incorrect' })
  assert.equal(game.act('host', { ...guess, icon: 'cat', revision: 1 }, 4000), true)
  assert.equal(game.progress(4000).score, 1)
  assert.equal(game.progress(4000).round, 2)
  assert.equal(game.progress(4000).startsAt, 5000)
  assert.equal(game.progress(4000).endsAt, 15000)
  game.tick(5000)
  assert.notDeepEqual(view(game, 'guest', 5000), target)
  assert.equal(game.act('host', { ...guess, round: 2, revision: 2 }, 15000), false)
  assert.equal((game.results() as IconResults).incorrectGuesses, 1)
  assert.equal(game.results()?.elapsedMs, 15000)
})

test('a penalty consuming the last seconds ends the game immediately and replay starts fresh', () => {
  const game = start()
  const guess = { type: 'guess', icon: 'fish', round: 1, revision: 0 }
  game.tick(1000)
  assert.equal(game.act('host', guess, 19000), true)
  assert.equal(game.progress(19000).endsAt, 19000)
  assert.equal(game.act('host', { ...guess, revision: 1 }, 19000), false)
  assert.equal((game.results() as IconResults).incorrectGuesses, 1)
  assert.deepEqual((game.results() as IconResults).vocabulary, ['cat'])
  assert.equal(start().progress(0).round, 1)
  assert.equal(start().progress(0).score, 0)
  assert.equal(start().progress(0).endsAt - start().progress(0).startsAt, 20000)
})
