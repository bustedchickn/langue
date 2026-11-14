import { languages, type Language } from '../types'
import type { GameConfig, GameResults } from './contracts'

export const spotDifferenceConfig = {
  id: 'spot-difference', name: 'Spot the Difference',
  description: 'Compare two scenes, talk about what you see, and find five differences together.',
  minPlayers: 2, maxPlayers: 2, durationMs: 120_000, countdownMs: 3_000,
  scoring: { pointsPerDifference: 20, wrongGuessPenalty: 2 }, supportedLanguages: languages, assets: {},
} satisfies GameConfig

export type SceneObject = { id: string; name: string; emoji: string; color: string; detail: string }
export type SpotDifferenceAction = { type: 'select'; objectId: string } | { type: 'finish' } | { type: 'reset' }
export type SceneKind = 'kitchen' | 'bedroom' | 'office' | 'classroom' | 'park'
export type SpotDifferenceView = {
  scene: 'player-one' | 'player-two'; sceneKind: SceneKind; language: Language; roundName: string
  objects: SceneObject[]; found: string[]; totalDifferences: number; incorrectGuesses: number
  feedback?: 'correct' | 'incorrect' | 'complete' | 'incomplete'; prompts: ReadonlyArray<{ english: string; translated: string; hint: string }>
  vocabulary: ReadonlyArray<{ english: string; translated: string; hint: string }>
}
export type SpotDifferenceResults = GameResults & { found: number; incorrectGuesses: number }

const words: Record<Language, string[]> = {
  English: ['Desk', 'Plant', 'Clock', 'Lamp', 'Cat', 'Book', 'Above', 'Left', 'Right'],
  French: ['Bureau', 'Plante', 'Horloge', 'Lampe', 'Chat', 'Livre', 'Au-dessus', 'Gauche', 'Droite'],
  Spanish: ['Escritorio', 'Planta', 'Reloj', 'Lámpara', 'Gato', 'Libro', 'Encima', 'Izquierda', 'Derecha'],
}

export const sceneObjects: SceneObject[] = [
  { id: 'desk', name: 'Desk', emoji: '🪑', color: '#FBF3B9', detail: 'table / surface' }, { id: 'plant', name: 'Plant', emoji: '🪴', color: '#89E7E9', detail: 'potted greenery' },
  { id: 'clock', name: 'Clock', emoji: '🕒', color: '#FDB7EA', detail: 'wall timepiece' }, { id: 'lamp', name: 'Lamp', emoji: '💡', color: '#FFDCCC', detail: 'light source' },
  { id: 'cat', name: 'Cat', emoji: '🐈', color: '#F26A8D', detail: 'small pet' }, { id: 'book', name: 'Book', emoji: '📖', color: '#B7B1F2', detail: 'reading item' },
  { id: 'window', name: 'Window', emoji: '🪟', color: '#89E7E9', detail: 'view outside' }, { id: 'mug', name: 'Mug', emoji: '☕', color: '#FBF3B9', detail: 'drink cup' },
  { id: 'globe', name: 'Globe', emoji: '🌍', color: '#B7B1F2', detail: 'world model' }, { id: 'star', name: 'Star', emoji: '⭐', color: '#FFDCCC', detail: 'bright shape' },
]
export const differenceIds = ['plant', 'clock', 'lamp', 'cat', 'book']

export function spotLanguage(language: Language) {
  const w = words[language].map((translated, i) => ({ english: words.English[i], translated, hint: sceneObjects[i]?.detail ?? 'position' }))
  return { prompts: [], vocabulary: w }
}

export type { GameResults }
