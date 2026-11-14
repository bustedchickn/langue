import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lostInstructions, type LostView } from '../shared/minigames/lost-instructions'
import { selectPuzzles, startLostInstructions, translate } from '../server/minigames/lost-instructions/game'
import { puzzles } from '../server/minigames/lost-instructions/puzzles'

const start = 10_000
const gameplay = start + lostInstructions.countdownMs
const players = {
  host: { name: 'Alice', learningLanguage: 'French' },
  guest: { name: 'Bob', learningLanguage: 'Spanish' },
} as const
const selected = puzzles.slice(0, lostInstructions.rounds)
const game = () => startLostInstructions('match', players, start, selected)
const operator = (view: unknown) => view as Extract<LostView, { role: 'operator' }>

test('puzzle definitions contain distinct, unsolved arrangements and all supported clues', () => {
  assert.equal(new Set(puzzles.map(puzzle => puzzle.id)).size, puzzles.length)
  for (const puzzle of puzzles) {
    const ids = puzzle.objects.map(object => object.id).sort()
    assert.deepEqual([...puzzle.initial].sort(), ids)
    assert.deepEqual([...puzzle.solution].sort(), ids)
    assert.notDeepEqual(puzzle.initial, puzzle.solution)
    for (const language of lostInstructions.supportedLanguages) assert.ok(puzzle.instructions[language])
  }
  assert.deepEqual(selectPuzzles(puzzles, 3, () => 0), selected)
  assert.throws(() => selectPuzzles(puzzles, puzzles.length + 1))
})

test('translations resolve the learning language and warn on the English fallback', () => {
  const warnings: string[] = []
  const warn = (message: string) => warnings.push(message)
  const { instructions } = puzzles[0]
  for (const language of lostInstructions.supportedLanguages) {
    assert.deepEqual(translate(instructions, language, warn), { text: instructions[language], language })
  }
  assert.deepEqual(warnings, [])
  assert.deepEqual(translate({ English: 'Fallback' }, 'French', warn), { text: 'Fallback', language: 'English' })
  assert.match(warnings[0], /French.*English/)
})

test('roles receive distinct data and cannot act before the countdown ends', () => {
  const active = game()
  assert.deepEqual(active.view('host', gameplay - 1), { role: 'instructor' })
  assert.deepEqual(active.view('guest', gameplay - 1), { role: 'operator', revision: 0 })
  assert.equal(active.act('guest', { type: 'submit', round: 1, revision: 0 }, gameplay - 1), false)
  assert.match(JSON.stringify(active.view('host', gameplay)), /cercle rouge/)
  const { slots, role, revision } = operator(active.view('guest', gameplay))
  assert.equal(role, 'operator')
  assert.equal(revision, 0)
  assert.deepEqual(slots?.map(piece => piece.id), puzzles[0].initial)
  const guest = JSON.stringify(active.view('guest', gameplay))
  for (const key of ['solution', 'instructions', 'hint', 'puzzleId']) assert.ok(!guest.includes(key))
})

test('incorrect submissions leave the round and score unchanged, and invalid or repeated actions are ignored', () => {
  const active = game()
  const move = { type: 'move', piece: 'circle', round: 1, revision: 0, slot: 0 }
  assert.equal(active.act('host', move, gameplay), false)
  assert.equal(active.act('guest', { ...move, slot: 42 }, gameplay), false)
  assert.equal(active.act('guest', { ...move, piece: 'fake' }, gameplay), false)
  assert.equal(active.act('guest', { type: 'submit', round: 1, revision: 0 }, gameplay), true)
  assert.equal(operator(active.view('guest', gameplay)).feedback, 'incorrect')
  assert.equal(active.progress(gameplay).completed, 0)
  assert.equal(active.progress(gameplay).score, 0)
  assert.equal(active.act('guest', move, gameplay), false)
  assert.equal(active.act('guest', { ...move, revision: 1 }, gameplay), true)
  assert.equal(active.act('guest', { ...move, revision: 1 }, gameplay), false)
  assert.equal(operator(active.view('guest', gameplay)).feedback, undefined)
})

test('correct arrangements advance rounds and finish with the configured score', () => {
  const active = game()
  for (const [index, puzzle] of selected.entries()) {
    const round = index + 1
    const view = operator(active.view('guest', gameplay))
    assert.equal(active.act('guest', { type: 'move', piece: puzzle.solution[0], slot: 0, round, revision: view.revision }, gameplay), true)
    assert.equal(active.act('guest', { type: 'submit', round, revision: view.revision + 1 }, gameplay + round), true)
    assert.equal(active.progress(gameplay).completed, round)
    assert.equal(active.progress(gameplay).score, round * lostInstructions.scoring.pointsPerPuzzle)
    if (round < selected.length) assert.equal(active.progress(gameplay).round, round + 1)
  }
  assert.deepEqual(active.results(), {
    gameId: lostInstructions.id, outcome: 'victory', completed: selected.length, attempted: selected.length,
    elapsedMs: selected.length, score: 300, players: ['Alice', 'Bob'],
  })
})

test('the deadline defeats a game even without actions and rejects late submissions', () => {
  const active = game()
  const { endsAt } = active.progress(start)
  active.tick(endsAt - 1)
  assert.equal(active.results(), undefined)
  assert.equal(active.act('guest', { type: 'submit', round: 1, revision: 0 }, endsAt), false)
  assert.deepEqual(active.results(), {
    gameId: lostInstructions.id, outcome: 'defeat', completed: 0, attempted: 1,
    elapsedMs: lostInstructions.durationMs, score: 0, players: ['Alice', 'Bob'],
  })
  active.tick(endsAt + 100)
  assert.equal(active.results()?.elapsedMs, lostInstructions.durationMs)
})
