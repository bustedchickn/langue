import { randomInt } from 'node:crypto'
import type { Language } from '../../../shared/types'
import { lostInstructions, pieceName, shapeColors, type Color, type Piece, type Shape } from '../../../shared/minigames/lost-instructions'

type Translations = Partial<Record<Language, string>> & { English: string }
export interface Puzzle {
  id: string
  objects: readonly Piece[]
  initial: readonly string[]
  solution: readonly string[]
  instructions: Translations
  difficulty: 'easy' | 'medium'
  hints?: Translations
}

export function arrangementInstructions(order: readonly Piece[]): Record<Language, string> {
  if (order.length !== 3) throw new Error('A shape prompt requires exactly three pieces.')
  const names = (language: Language) => order.map(piece => pieceName(piece, language))
  const [enLeft, enMiddle, enRight] = names('English')
  const [frLeft, frMiddle, frRight] = names('French')
  const [esLeft, esMiddle, esRight] = names('Spanish')
  return {
    English: `Put the ${enLeft} on the left, the ${enMiddle} in the middle, and the ${enRight} on the right.`,
    French: `Place ${frLeft} à gauche, ${frMiddle} au milieu et ${frRight} à droite.`,
    Spanish: `Pon ${esLeft} a la izquierda, ${esMiddle} en el centro y ${esRight} a la derecha.`,
  }
}

function shuffled<T>(items: readonly T[], pick: (maximum: number) => number) {
  const remaining = [...items]
  return Array.from({ length: remaining.length }, () => remaining.splice(pick(remaining.length), 1)[0])
}

export function generatePuzzle(id: string, pick = randomInt): Puzzle {
  // Sample pairs without replacement. Shapes and colors can each repeat, while
  // the complete pair is always unique and can be named unambiguously.
  const pairs = (Object.keys(lostInstructions.assets) as Shape[]).flatMap(shape =>
    (Object.keys(shapeColors) as Color[]).map(color => ({ id: color + '-' + shape, shape, color })))
  const objects = Array.from({ length: 3 }, () => pairs.splice(pick(pairs.length), 1)[0])
  const order = shuffled(objects, pick)
  const solution = order.map(piece => piece.id)
  const initial = shuffled(solution, pick)
  if (initial.every((piece, index) => piece === solution[index])) [initial[0], initial[1]] = [initial[1], initial[0]]
  return {
    id, objects, initial, solution, difficulty: 'easy',
    instructions: arrangementInstructions(order),
    hints: {
      English: `Start with the ${pieceName(order[0], 'English')} on the left. Match both its color and its shape.`,
      French: `Commence par ${pieceName(order[0], 'French')} à gauche. Vérifie sa couleur et sa forme.`,
      Spanish: `Empieza con ${pieceName(order[0], 'Spanish')} a la izquierda. Comprueba su color y su forma.`,
    },
  }
}

export function generatePuzzles(count: number, pick = randomInt): Puzzle[] {
  if (!Number.isSafeInteger(count) || count < 1) throw new Error('Invalid round count.')
  return Array.from({ length: count }, (_, index) => generatePuzzle('round-' + (index + 1), pick))
}
