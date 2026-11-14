import { languages, type Language } from '../types'
import type { GameConfig } from './contracts'

export const lostInstructions = {
  id: 'lost-instructions',
  name: 'Lost Instructions',
  description: 'Relay clues in your learning language. Work together to arrange the shapes.',
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
  },
} satisfies GameConfig

export type Shape = keyof typeof lostInstructions.assets
export type Color = 'red' | 'blue' | 'yellow'
export type Piece = { id: string; shape: Shape; color: Color }
export type LostView =
  | { role: 'instructor'; instruction?: string; hint?: string; language?: Language; hintLanguage?: Language }
  | { role: 'operator'; slots?: Piece[]; revision: number; feedback?: 'incorrect' }

export type LostAction =
  | { type: 'move'; piece: string; slot: number }
  | { type: 'submit' }
