import { languages, type Language } from '../types'
import type { GameConfig } from './contracts'

export const lostInstructions = {
  id: 'lost-instructions',
  name: 'In Good Shape',
  description: 'Describe each shape and its color so your partner can arrange three pieces from left to right. Solve three puzzles together.',
  minPlayers: 2,
  maxPlayers: 2,
  durationMs: 90_000,
  rounds: 3,
  countdownMs: 3_000,
  scoring: { pointsPerPuzzle: 100 },
  supportedLanguages: languages,
  assets: {
    circle: 'shape-circle',
    square: 'shape-square',
    triangle: 'shape-triangle',
    rectangle: 'shape-rectangle',
    star: 'shape-star',
    diamond: 'shape-diamond',
    hexagon: 'shape-hexagon',
    oval: 'shape-oval',
  },
} satisfies GameConfig

export type Shape = keyof typeof lostInstructions.assets
export const shapeColors = {
  red: '#df4262', blue: '#327ccc', yellow: '#f5cc3d', green: '#348352',
  orange: '#e9872d', purple: '#8750bb', pink: '#ed97c6', black: '#343442',
} as const
export type Color = keyof typeof shapeColors
export type Piece = { id: string; shape: Shape; color: Color }

const shapeNames: Record<Shape, { French: string; Spanish: string }> = {
  circle: { French: 'le cercle', Spanish: 'el círculo' },
  square: { French: 'le carré', Spanish: 'el cuadrado' },
  triangle: { French: 'le triangle', Spanish: 'el triángulo' },
  rectangle: { French: 'le rectangle', Spanish: 'el rectángulo' },
  star: { French: 'l’étoile', Spanish: 'la estrella' },
  diamond: { French: 'le losange', Spanish: 'el rombo' },
  hexagon: { French: 'l’hexagone', Spanish: 'el hexágono' },
  oval: { French: 'l’ovale', Spanish: 'el óvalo' },
}
const colorNames: Record<Color, { French: readonly [string, string]; Spanish: readonly [string, string] }> = {
  red: { French: ['rouge', 'rouge'], Spanish: ['rojo', 'roja'] },
  blue: { French: ['bleu', 'bleue'], Spanish: ['azul', 'azul'] },
  yellow: { French: ['jaune', 'jaune'], Spanish: ['amarillo', 'amarilla'] },
  green: { French: ['vert', 'verte'], Spanish: ['verde', 'verde'] },
  orange: { French: ['orange', 'orange'], Spanish: ['naranja', 'naranja'] },
  purple: { French: ['violet', 'violette'], Spanish: ['morado', 'morada'] },
  pink: { French: ['rose', 'rose'], Spanish: ['rosa', 'rosa'] },
  black: { French: ['noir', 'noire'], Spanish: ['negro', 'negra'] },
}

/** Vocabulary for every supported pair; private positions and solutions stay on the server. */
export function pieceName(piece: Pick<Piece, 'shape' | 'color'>, language: Language): string {
  if (language === 'English') return piece.color + ' ' + piece.shape
  return shapeNames[piece.shape][language] + ' ' + colorNames[piece.color][language][piece.shape === 'star' ? 1 : 0]
}
export type LostView =
  | { role: 'instructor'; instruction?: string; hint?: string; language?: Language; hintLanguage?: Language }
  | { role: 'operator'; slots?: Piece[]; revision: number; feedback?: 'incorrect' }

export type LostAction =
  | { type: 'move'; piece: string; slot: number }
  | { type: 'submit' }
