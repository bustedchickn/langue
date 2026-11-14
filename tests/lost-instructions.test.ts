import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lostInstructions, pieceName, shapeColors, type Color, type LostView, type Piece, type Shape } from '../shared/minigames/lost-instructions'
import { startLostInstructions, translate } from '../server/minigames/lost-instructions/game'
import { arrangementInstructions, generatePuzzle, generatePuzzles } from '../server/minigames/lost-instructions/puzzles'

const start = 10_000
const gameplay = start + lostInstructions.countdownMs
const players = {
  host: { name: 'Alice', learningLanguage: 'French' },
  guest: { name: 'Bob', learningLanguage: 'Spanish' },
} as const
const selected = generatePuzzles(lostInstructions.rounds, () => 0)
const game = () => startLostInstructions('match', players, start, selected)
const operator = (view: unknown) => view as Extract<LostView, { role: 'operator' }>

test('generated puzzles have unique pairs, unsolved arrangements, and a clue matching each position in every language', () => {
  let seed = 37
  const pick = (max: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max }
  const puzzles = generatePuzzles(1000, pick)
  const seen = new Set<string>()
  const starts = new Set<string>()
  assert.equal(new Set(puzzles.map(puzzle => puzzle.id)).size, puzzles.length)
  for (const puzzle of puzzles) {
    const ids = puzzle.objects.map(object => object.id).sort()
    assert.equal(ids.length, 3)
    assert.equal(new Set(puzzle.objects.map(piece => piece.shape + ':' + piece.color)).size, 3)
    assert.deepEqual([...puzzle.initial].sort(), ids)
    assert.deepEqual([...puzzle.solution].sort(), ids)
    assert.notDeepEqual(puzzle.initial, puzzle.solution)
    starts.add(puzzle.initial.join(','))
    for (const piece of puzzle.objects) seen.add(piece.shape + ':' + piece.color)
    for (const language of lostInstructions.supportedLanguages) {
      const clue = puzzle.instructions[language]!
      const positions = puzzle.solution.map(id => clue.indexOf(pieceName(puzzle.objects.find(piece => piece.id === id)!, language)))
      assert.ok(positions.every(position => position >= 0))
      assert.ok(positions[0] < positions[1] && positions[1] < positions[2], 'prompt order must match the private solution')
      assert.ok(puzzle.hints?.[language])
      assert.ok(!clue.includes('undefined'))
    }
  }
  assert.equal(seen.size, Object.keys(lostInstructions.assets).length * Object.keys(shapeColors).length)
  assert.ok(starts.size > 100)
  assert.deepEqual(generatePuzzles(3, () => 0), selected)
  assert.throws(() => generatePuzzles(0))
  assert.throws(() => generatePuzzles(1.5))
})

test('a board may repeat shapes and colors at the same time without repeating a complete pair', () => {
  const choices = [3, 0, 6]
  const puzzle = generatePuzzle('repeated-features', maximum => (choices.shift() ?? 0) % maximum)
  assert.deepEqual(puzzle.objects.map(piece => [piece.shape, piece.color]), [
    ['circle', 'green'], ['circle', 'red'], ['square', 'red'],
  ])
  assert.equal(new Set(puzzle.objects.map(piece => piece.id)).size, 3)
  assert.match(puzzle.instructions.English, /green circle.*red circle.*red square/)
})

test('every shape and color has a prompt in every position, with gender-correct translated colors', () => {
  for (const shape of Object.keys(lostInstructions.assets) as Shape[]) {
    for (const color of Object.keys(shapeColors) as Color[]) {
      const target: Piece = { id: 'target', shape, color }
      const others: Piece[] = ([{ id: 'one', shape: 'square', color: 'red' }, { id: 'two', shape: 'circle', color: 'blue' },
        { id: 'three', shape: 'triangle', color: 'green' }] as Piece[])
        .filter(piece => piece.shape !== shape || piece.color !== color).slice(0, 2)
      for (let index = 0; index < 3; index++) {
        const order = [...others]
        order.splice(index, 0, target)
        const prompt = arrangementInstructions(order)
        for (const language of lostInstructions.supportedLanguages) assert.ok(prompt[language].includes(pieceName(target, language)))
      }
    }
  }
  assert.equal(pieceName({ shape: 'star', color: 'purple' }, 'French'), 'l’étoile violette')
  assert.equal(pieceName({ shape: 'star', color: 'black' }, 'Spanish'), 'la estrella negra')
  assert.equal(pieceName({ shape: 'hexagon', color: 'blue' }, 'French'), 'l’hexagone bleu')
  assert.equal(pieceName({ shape: 'oval', color: 'yellow' }, 'Spanish'), 'el óvalo amarillo')
})

test('translations resolve the learning language and warn on the English fallback', () => {
  const warnings: string[] = []
  const warn = (message: string) => warnings.push(message)
  const { instructions } = selected[0]
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
  const instructor = active.view('host', gameplay) as Extract<LostView, { role: 'instructor' }>
  assert.deepEqual(instructor.targetArrangement?.map(piece => piece.id), selected[0].solution)
  const { slots, role, revision } = operator(active.view('guest', gameplay))
  assert.equal(role, 'operator')
  assert.equal(revision, 0)
  assert.deepEqual(slots?.map(piece => piece.id), selected[0].initial)
  const guest = JSON.stringify(active.view('guest', gameplay))
  for (const key of ['solution', 'instructions', 'hint', 'puzzleId', 'targetArrangement']) assert.ok(!guest.includes(key))
})

test('incorrect submissions leave the round and score unchanged, and invalid or repeated actions are ignored', () => {
  const active = game()
  const move = { type: 'move', piece: selected[0].initial[1], round: 1, revision: 0, slot: 0 }
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
    for (const [slot, piece] of puzzle.solution.entries()) {
      const view = operator(active.view('guest', gameplay))
      if (view.slots![slot].id === piece) continue
      assert.equal(active.act('guest', { type: 'move', piece, slot, round, revision: view.revision }, gameplay), true)
    }
    const view = operator(active.view('guest', gameplay))
    assert.equal(active.act('guest', { type: 'submit', round, revision: view.revision }, gameplay + round), true)
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
