import { randomInt } from 'node:crypto'
import { registeredLanguages, type Language } from '../../../shared/types'
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

const arrangement: Record<Language, (left: string, middle: string, right: string) => string> = {
  English: (l, m, r) => `Put the ${l} on the left, the ${m} in the middle, and the ${r} on the right.`,
  French: (l, m, r) => `Place ${l} à gauche, ${m} au milieu et ${r} à droite.`,
  Spanish: (l, m, r) => `Pon ${l} a la izquierda, ${m} en el centro y ${r} a la derecha.`,
  German: (l, m, r) => `Lege ${l} nach links, ${m} in die Mitte und ${r} nach rechts.`,
  Italian: (l, m, r) => `Metti ${l} a sinistra, ${m} al centro e ${r} a destra.`,
  Portuguese: (l, m, r) => `Coloque ${l} à esquerda, ${m} no meio e ${r} à direita.`,
  Japanese: (l, m, r) => `${l}は左、${m}は真ん中、${r}は右に置いてください。`,
  Korean: (l, m, r) => `${l} 조각은 왼쪽에, ${m} 조각은 가운데에, ${r} 조각은 오른쪽에 놓으세요.`,
  Chinese: (l, m, r) => `把${l}放在左边，${m}放在中间，${r}放在右边。`,
  Russian: (l, m, r) => `Положи ${l} слева, ${m} посередине, а ${r} справа.`,
}

const hints: Record<Language, (left: string) => string> = {
  English: l => `Start with the ${l} on the left. Match both its color and its shape.`,
  French: l => `Commence par ${l} à gauche. Vérifie sa couleur et sa forme.`,
  Spanish: l => `Empieza con ${l} a la izquierda. Comprueba su color y su forma.`,
  German: l => `Lege zuerst ${l} nach links. Achte auf Farbe und Form.`,
  Italian: l => `Metti prima ${l} a sinistra. Controlla il colore e la forma.`,
  Portuguese: l => `Comece colocando ${l} à esquerda. Confira a cor e o formato.`,
  Japanese: l => `まず${l}を左に置いてください。色と形を確認しましょう。`,
  Korean: l => `먼저 왼쪽에 ${l} 조각을 놓으세요. 색과 모양을 모두 확인하세요.`,
  Chinese: l => `先把${l}放在左边。颜色和形状都要对上。`,
  Russian: l => `Сначала положи ${l} слева. Проверь и цвет, и форму.`,
}

function allTranslations(format: (language: Language) => string): Record<Language, string> {
  return Object.fromEntries(registeredLanguages.map(language => [language, format(language)])) as Record<Language, string>
}

export function arrangementInstructions(order: readonly Piece[]): Record<Language, string> {
  if (order.length !== 3) throw new Error('A shape prompt requires exactly three pieces.')
  const [left, middle, right] = order
  return allTranslations(language => arrangement[language](pieceName(left, language), pieceName(middle, language), pieceName(right, language)))
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
    hints: allTranslations(language => hints[language](pieceName(order[0], language))),
  }
}

export function generatePuzzles(count: number, pick = randomInt): Puzzle[] {
  if (!Number.isSafeInteger(count) || count < 1) throw new Error('Invalid round count.')
  return Array.from({ length: count }, (_, index) => generatePuzzle('round-' + (index + 1), pick))
}
