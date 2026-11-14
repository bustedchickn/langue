import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { GamePlayers } from '../shared/minigames/contracts'
import type { CodenamesResults, CodenamesView } from '../shared/minigames/codenames'
import { codenamesConfig } from '../shared/minigames/codenames'
import type { IconView } from '../shared/minigames/icon-communication'
import type { LostView } from '../shared/minigames/lost-instructions'
import type { MapNavigatorResults, MapNavigatorView } from '../shared/minigames/map-navigator'
import type { SpotDifferenceResults, SpotDifferenceView } from '../shared/minigames/spot-difference'
import type { DriveView } from '../shared/minigames/tandem-drive'
import { startCodenames } from '../server/minigames/codenames/game'
import { startIconCommunication } from '../server/minigames/icon-communication/game'
import { startLostInstructions } from '../server/minigames/lost-instructions/game'
import { generatePuzzles } from '../server/minigames/lost-instructions/puzzles'
import { startMapNavigator } from '../server/minigames/map-navigator/game'
import { startSpotDifference } from '../server/minigames/spot-difference/game'
import { startTandemDrive } from '../server/minigames/tandem-drive/game'

const players: GamePlayers = {
  host: { name: 'Alice', learningLanguage: 'French' }, guest: { name: 'Bob', learningLanguage: 'English' },
}
const puzzles = generatePuzzles(3, () => 0)
const games = [
  ['shapes', () => startLostInstructions('shapes', players, 1000, puzzles)],
  ['icons', () => startIconCommunication('icons', players, 1000, undefined, () => 0)],
  ['map', () => startMapNavigator('map', players, 1000)],
  ['spot', () => startSpotDifference('spot', players, 1000, undefined, () => 0)],
  ['driving', () => startTandemDrive('driving', players, 1000)],
  ['codenames', () => startCodenames('codenames', players, 1000, () => 0)],
] as const

for (const [name, start] of games) {
  test(name + ': can end during preparation or play, freezes results, and rejects later actions', () => {
    for (const preparing of [true, false]) {
      const game = start()
      const time = preparing ? 1000 : game.progress(1000).startsAt + 200
      game.finishEarly(time)
      const result = structuredClone(game.results())!
      assert.equal(result.endedEarly, true)
      assert.equal(result.completed, 0)
      assert.equal(result.score, 0)
      assert.ok(result.elapsedMs >= 0)
      assert.deepEqual(result.players, ['Alice', 'Bob'])
      for (const action of [{ type: 'reset' }, { type: 'finish' }, { type: 'submit', round: 1, revision: 0 }]) {
        assert.equal(game.act('guest', action, time + 1), false)
      }
      game.finishEarly(time + 1000000)
      game.tick(time + 1000000)
      assert.deepEqual(game.results(), result, 'duplicate end and later deadlines must not overwrite results')
    }
  })

  if (name !== 'codenames') test(name + ': an elapsed deadline stays a normal result', () => {
    const game = start()
    game.finishEarly(game.progress(1000).endsAt + 1)
    assert.equal(game.results()?.outcome, 'defeat')
    assert.equal(game.results()?.endedEarly, undefined)
  })
}

test('ending shapes after a solved puzzle retains the earned points', () => {
  const game = games[0][1]()
  const time = game.progress(1000).startsAt
  for (const [slot, piece] of puzzles[0].solution.entries()) {
    const view = game.view('guest', time) as Extract<LostView, { role: 'operator' }>
    if (view.slots![slot].id !== piece) assert.equal(game.act('guest', { type: 'move', piece, slot, round: 1, revision: view.revision }, time), true)
  }
  const view = game.view('guest', time) as Extract<LostView, { role: 'operator' }>
  assert.equal(game.act('guest', { type: 'submit', round: 1, revision: view.revision }, time), true)
  const progress = game.progress(time)
  game.finishEarly(time + 500)
  assert.equal(game.results()?.completed, 1)
  assert.equal(game.results()?.score, progress.score)
  assert.ok(progress.score > 0)
})

test('ending icons keeps solved rounds and vocabulary, including during the next reveal delay', () => {
  const game = games[1][1]()
  const time = game.progress(1000).startsAt
  game.tick(time)
  const view = game.view('guest', time) as Extract<IconView, { role: 'describer' }>
  assert.equal(game.act('host', { type: 'guess', icon: view.target, round: 1, revision: 0 }, time), true)
  const progress = game.progress(time)
  game.finishEarly(time)
  assert.equal(game.results()?.completed, 1)
  assert.equal(game.results()?.attempted, 1)
  assert.equal(game.results()?.score, progress.score)
  assert.ok(JSON.stringify(game.results()).includes(view.target!))
})

test('ending the map retains movement and wrong turn counts', () => {
  const game = games[2][1]()
  const time = game.progress(1000).startsAt
  const view = game.view('guest', time) as MapNavigatorView
  const direction = view.position.row === 0 ? 'up' : 'down'
  assert.equal(game.act('guest', { type: 'move', direction }, time), true)
  game.finishEarly(time + 500)
  const result = game.results() as MapNavigatorResults
  assert.equal(result.moves, 1)
  assert.equal(result.wrongTurns, 1)
  assert.equal(result.completedRoute, false)
})

test('ending Spot the Difference retains partial finds and mistake penalties', () => {
  const game = games[3][1]()
  const time = game.progress(1000).startsAt
  const host = game.view('host', time) as SpotDifferenceView
  const guest = game.view('guest', time) as SpotDifferenceView
  const different = host.objects.find(object => JSON.stringify(object) !== JSON.stringify(guest.objects.find(other => other.id === object.id)))!
  const same = host.objects.find(object => JSON.stringify(object) === JSON.stringify(guest.objects.find(other => other.id === object.id)))!
  assert.equal(game.act('host', { type: 'select', objectId: different.id }, time), true)
  assert.equal(game.act('guest', { type: 'select', objectId: same.id }, time + 1), true)
  game.finishEarly(time + 500)
  const result = game.results() as SpotDifferenceResults
  assert.equal(result.found, 1)
  assert.equal(result.incorrectGuesses, 1)
  assert.equal(result.completed, 1)
})

test('ending driving releases both held thrusters', () => {
  const game = games[4][1]()
  const time = game.progress(1000).startsAt
  assert.equal(game.act('host', { type: 'pedal', down: true, swapped: false }, time), true)
  assert.equal(game.act('guest', { type: 'pedal', down: true, swapped: false }, time), true)
  game.finishEarly(time + 100)
  const view = game.view('host', time + 100) as DriveView
  assert.equal(view.left, false)
  assert.equal(view.right, false)
})

test('ending Codenames retains hint deductions, found words, and the shared score', () => {
  const game = games[5][1]()
  const time = game.progress(1000).startsAt
  const target = (game.view('host', time) as CodenamesView).cards.find(card => card.kind === 'team')!
  assert.equal(game.act('guest', { type: 'hint', id: target.id, revision: 0 }, time), true)
  assert.equal(game.act('host', { type: 'clue', word: 'example', count: 1, revision: 1 }, time), true)
  assert.equal(game.act('guest', { type: 'guess', id: target.id, revision: 2 }, time), true)
  game.finishEarly(time + 500)
  const result = game.results() as CodenamesResults
  assert.equal(result.completed, 1)
  assert.equal(result.attempted, 1)
  assert.equal(result.hintsUsed, 1)
  assert.equal(result.score, codenamesConfig.scoring.pointsPerWord - codenamesConfig.scoring.hintPenalty)
  assert.equal(result.lossReason, undefined)
})

test('ending an already completed Codenames game preserves its original result', () => {
  const game = games[5][1]()
  const time = game.progress(1000).startsAt
  const assassin = (game.view('host', time) as CodenamesView).cards.find(card => card.kind === 'assassin')!
  game.act('host', { type: 'clue', word: 'danger', count: 1, revision: 0 }, time)
  game.act('guest', { type: 'guess', id: assassin.id, revision: 1 }, time)
  const result = structuredClone(game.results())
  game.finishEarly(time + 1)
  assert.deepEqual(game.results(), result)
  assert.equal(game.results()?.endedEarly, undefined)
})
