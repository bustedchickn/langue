import { languages, type Language } from '../types'
import type { GameConfig, GameResults, Seat } from './contracts'

export const mapNavigatorConfig = {
  id: 'map-navigator',
  name: 'Map Navigator',
  description: 'Give directions in your learning language and guide your partner across Sunnyville.',
  minPlayers: 2,
  maxPlayers: 2,
  durationMs: 120_000,
  countdownMs: 3_000,
  scoring: { pointsPerRoute: 100, wrongTurnPenalty: 5 },
  supportedLanguages: languages,
  assets: {},
} satisfies GameConfig

export type Point = { row: number; column: number }
export type MapDirection = 'up' | 'down' | 'left' | 'right'
export type NavigatorAction =
  | { type: 'move'; direction: MapDirection }
  | { type: 'finish' }
  | { type: 'reset' }

export type MapNavigatorView = {
  role: 'navigator' | 'traveler'
  language: Language
  position: Point
  direction: MapDirection
  goal?: Point
  route?: Point[]
  moves: number
  wrongTurns: number
  checkpoints: number
  waypoints?: Point[]
  feedback?: 'moved' | 'wrong' | 'blocked' | 'success' | 'checkpoint'
  landmarks: ReadonlyArray<{ row: number; column: number; name: string; emoji: string }>
  vocabulary: ReadonlyArray<{ english: string; translated: string }>
}

export type MapNavigatorResults = GameResults & { moves: number; wrongTurns: number; completedRoute: boolean }

export const mapNavigatorGrid = { rows: 7, columns: 7 } as const
export const mapNavigatorStart: Point = { row: 0, column: 2 }
export const mapNavigatorGoal: Point = { row: 4, column: 6 }
export const mapNavigatorRoute: Point[] = [
  { row: 0, column: 2 }, { row: 1, column: 2 }, { row: 2, column: 2 }, { row: 2, column: 3 },
  { row: 2, column: 4 }, { row: 3, column: 4 }, { row: 4, column: 4 }, { row: 4, column: 5 },
  { row: 4, column: 6 },
]

export const mapNavigatorLandmarks = [
  { row: 0, column: 3, name: 'Park', emoji: '🌳' }, { row: 1, column: 1, name: 'Café', emoji: '☕' },
  { row: 1, column: 3, name: 'Park', emoji: '🌳' }, { row: 1, column: 5, name: 'Bakery', emoji: '🥐' },
  { row: 3, column: 0, name: 'Library', emoji: '📚' }, { row: 3, column: 2, name: 'Fountain', emoji: '⛲' },
  { row: 3, column: 4, name: 'Museum', emoji: '🏛️' }, { row: 3, column: 6, name: 'Market', emoji: '🛍️' },
  { row: 5, column: 1, name: 'Cinema', emoji: '🎬' }, { row: 5, column: 3, name: 'Station', emoji: '🚉' },
  { row: 5, column: 5, name: 'Park', emoji: '🌳' },
] as const

const copy: Record<Language, { vocabulary: string[] }> = {
  English: { vocabulary: ['Go straight', 'Turn left', 'Turn right', 'Stop here', 'At the corner', 'Go past', 'Next to', 'Go back'] },
  French: { vocabulary: ['Tout droit', 'Tournez à gauche', 'Tournez à droite', 'Arrêtez-vous ici', 'Au coin', 'Passez devant', 'À côté de', 'Revenez en arrière'] },
  Spanish: { vocabulary: ['Sigue recto', 'Gira a la izquierda', 'Gira a la derecha', 'Detente aquí', 'En la esquina', 'Pasa', 'Al lado de', 'Vuelve atrás'] },
}

export function mapNavigatorLanguage(language: Language) {
  const selected = copy[language]
  return { vocabulary: selected.vocabulary.map((translated, i) => ({ english: copy.English.vocabulary[i], translated })) }
}

export type { Seat }
