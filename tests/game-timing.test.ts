import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assessmentLevel, durationLabel, gameTimeMultiplier, practiceTimeMultipliers } from '../shared/minigames/timing'
import type { GamePlayers } from '../shared/minigames/contracts'
import type { CommunicationLevel } from '../shared/types'
import { startLostInstructions } from '../server/minigames/lost-instructions/game'
import { generatePuzzles } from '../server/minigames/lost-instructions/puzzles'
import { startIconCommunication } from '../server/minigames/icon-communication/game'
import { startMapNavigator } from '../server/minigames/map-navigator/game'
import { startSpotDifference } from '../server/minigames/spot-difference/game'
import { startTandemDrive } from '../server/minigames/tandem-drive/game'
import { startCodenames } from '../server/minigames/codenames/game'
import type { IconView } from '../shared/minigames/icon-communication'

function players(first?: CommunicationLevel, second?: CommunicationLevel): GamePlayers {
  return { host: { name: 'A', learningLanguage: 'French', communicationLevel: first },
    guest: { name: 'B', learningLanguage: 'English', communicationLevel: second } }
}
const starts = [
  { duration: 90000, start: (p: GamePlayers) => startLostInstructions('shape', p, 1000, generatePuzzles(3, () => 0)) },
  { duration: 20000, start: (p: GamePlayers) => startIconCommunication('icon', p, 1000) },
  { duration: 120000, start: (p: GamePlayers) => startMapNavigator('map', p, 1000) },
  { duration: 120000, start: (p: GamePlayers) => startSpotDifference('spot', p, 1000) },
  { duration: 150000, start: (p: GamePlayers) => startTandemDrive('drive', p, 1000) },
]

test('all timed games share the longer allowance and keep fluent/unassessed baseline timings', () => {
  for (const { start, duration } of starts) {
    for (const level of Object.keys(practiceTimeMultipliers) as CommunicationLevel[]) {
      const game = start(players('Fluent', level))
      const progress = game.progress(1000)
      const expected = Math.round(duration * practiceTimeMultipliers[level])
      assert.equal(progress.endsAt - progress.startsAt, expected)
      assert.equal(progress.timeMultiplier, practiceTimeMultipliers[level])
      assert.equal(game.progress(2000).endsAt, progress.endsAt, 'clock does not reset during sync')
      const reversed = start(players(level, 'Fluent')).progress(1000)
      assert.equal(reversed.endsAt - reversed.startsAt, expected, 'role swaps must retain the same allowance')
    }
    const normal = start(players()).progress(1000)
    assert.equal(normal.endsAt - normal.startsAt, duration)
  }
})

test('fluent checkbox overrides the chosen level and the least experienced teammate still sets the clock', () => {
  assert.equal(assessmentLevel({ level: 'Just Starting', fluent: true }), 'Fluent')
  assert.equal(assessmentLevel({ level: 'Beginner', fluent: false }), 'Beginner')
  assert.equal(assessmentLevel(), undefined)
  assert.equal(gameTimeMultiplier(players('Fluent', 'Beginner')), 1.5)
  assert.equal(gameTimeMultiplier(players('Just Starting', 'Beginner')), 2)
  assert.equal(gameTimeMultiplier(players('Comfortable', 'Conversational')), 1.25)
})

test('beginner Icon rounds get 30 seconds first, then 15, without extending preparation or penalties', () => {
  const game = startIconCommunication('icons', players('Beginner', 'Fluent'), 0, undefined, () => 0)
  assert.equal(game.progress(0).startsAt, 1000)
  assert.equal(game.progress(0).endsAt, 31000)
  game.tick(1000)
  const target = game.view('guest', 1000) as Extract<IconView, { role: 'describer' }>
  assert.equal(game.act('host', { type: 'guess', icon: target.target, round: 1, revision: 0 }, 1001), true)
  const progress = game.progress(1001)
  assert.equal(progress.endsAt - progress.startsAt, 15000)
  game.tick(progress.startsAt)
  const second = game.view('guest', progress.startsAt) as Extract<IconView, { role: 'describer' }>
  const selector = game.view('host', progress.startsAt) as Extract<IconView, { role: 'selector' }>
  game.act('host', { type: 'guess', icon: selector.grid.find(id => id !== second.target), round: 2, revision: selector.revision }, progress.startsAt)
  assert.equal(game.progress(progress.startsAt).endsAt, progress.endsAt - 2000)
})

test('extended deadlines remain authoritative and map reset retains the assessment allowance', () => {
  const p = players('Beginner', 'Fluent')
  const shape = starts[0].start(p)
  const { startsAt, endsAt } = shape.progress(1000)
  shape.tick(startsAt + 90000)
  assert.equal(shape.results(), undefined)
  shape.tick(endsAt)
  assert.equal(shape.results()?.elapsedMs, 135000)
  assert.equal(shape.act('guest', { type: 'submit', round: 1, revision: 0 }, endsAt), false)
  const map = startMapNavigator('reset', p, 0)
  assert.equal(map.act('host', { type: 'reset' }, 5000), true)
  const reset = map.progress(5000)
  assert.equal(reset.endsAt - reset.startsAt, 180000)
  const codenames = startCodenames('words', p, 0)
  assert.equal(codenames.progress(0).untimed, true)
  codenames.tick(100000000)
  assert.equal(codenames.results(), undefined)
  assert.equal(durationLabel(135000), '2 minutes 15 seconds')
})
