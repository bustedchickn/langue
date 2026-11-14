import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startCodenames } from '../server/minigames/codenames/game'
import type { CodenamesView } from '../shared/minigames/codenames'

test('codenames keeps the key private and validates turns, guesses and duplicate actions', () => {
  const game = startCodenames('test', {
    host: { name: 'Clue giver', learningLanguage: 'French' },
    guest: { name: 'Guesser', learningLanguage: 'English' },
  }, 0, () => 0)
  const host = () => game.view('host', 3000) as CodenamesView
  const guest = () => game.view('guest', 3000) as CodenamesView
  assert.equal(host().cards.length, 25)
  assert.equal(host().cards.filter(card => card.kind === 'team').length, 9)
  assert.ok(guest().cards.every(card => !('kind' in card)))
  assert.equal(game.act('guest', { type: 'clue', word: 'fruit', count: 2, revision: 0 }, 3000), false)
  assert.equal(game.act('host', { type: 'clue', word: 'Pomme', count: 2, revision: 0 }, 3000), false)
  assert.equal(game.act('host', { type: 'clue', word: 'fruit', count: 2, revision: 0 }, 3000), true)
  const target = host().cards.find(card => card.kind === 'team')!
  assert.equal(game.act('host', { type: 'guess', id: target.id, revision: 1 }, 3000), false)
  assert.equal(game.act('guest', { type: 'guess', id: target.id, revision: 1 }, 3000), true)
  assert.equal(game.act('guest', { type: 'guess', id: target.id, revision: 1 }, 3000), false)
  assert.equal(guest().cards.find(card => card.id === target.id)?.revealed, 'team')
  assert.equal(guest().remaining, 1)
  assert.equal(game.act('guest', { type: 'pass', revision: 2 }, 3000), true)
  assert.equal(guest().remaining, 0)
})

test('codenames uses turns and ends when the assassin is chosen', () => {
  const players = { host: { name: 'A', learningLanguage: 'English' as const }, guest: { name: 'B', learningLanguage: 'French' as const } }
  const game = startCodenames('a', players, 0, () => 0)
  const assassin = (game.view('host', 3000) as CodenamesView).cards.find(card => card.kind === 'assassin')!
  assert.equal(game.act('host', { type: 'clue', word: 'danger', count: 1, revision: 0 }, 3000), true)
  assert.equal(game.act('guest', { type: 'guess', id: assassin.id, revision: 1 }, 3001), true)
  assert.equal(game.results()?.outcome, 'defeat')
  const timed = startCodenames('b', players, 0, () => 0)
  timed.tick(1000000000)
  assert.equal(timed.results(), undefined)
  for (let turn = 0; turn < 9; turn++) {
    const view = timed.view('host', 1000000000) as CodenamesView
    const neutral = view.cards.find(card => card.kind === 'neutral' && !card.revealed)!
    assert.equal(timed.act('host', { type: 'clue', word: 'danger', count: 1, revision: view.revision }, 1000000000), true)
    assert.equal(timed.act('guest', { type: 'guess', id: neutral.id, revision: view.revision + 1 }, 1000000000), true)
  }
  const final = timed.view('guest', 1000000000) as CodenamesView
  assert.equal(final.turnsLeft, 0)
  assert.equal(final.suddenDeath, true)
  const assassin2 = (timed.view('host', 1000000000) as CodenamesView).cards.find(card => card.kind === 'assassin')!
  assert.equal(timed.act('guest', { type: 'guess', id: assassin2.id, revision: final.revision }, 1000000000), true)
  assert.equal(timed.results()?.outcome, 'defeat')
})
