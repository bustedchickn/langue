import { languages, type Language } from '../types'
import type { GameConfig, GameResults } from './contracts'

export const spotDifferenceConfig = {
  id: 'spot-difference', name: 'Spot the Difference',
  description: 'Describe your private scenes and find the three differences among five objects before time runs out.',
  minPlayers: 2, maxPlayers: 2, durationMs: 120_000, countdownMs: 3_000,
  scoring: { pointsPerDifference: 20, wrongGuessPenalty: 2 }, supportedLanguages: languages, assets: {},
} satisfies GameConfig

export type SceneObject = { id: string; name: string; emoji: string; color: string; detail: string }
export type SpotDifferenceAction = { type: 'select'; objectId: string } | { type: 'finish' } | { type: 'reset' }
export type SceneKind = 'peach' | 'lilac' | 'aqua' | 'lemon' | 'rose'
export type SpotDifferenceView = {
  scene: 'player-one' | 'player-two'; sceneKind: SceneKind; language: Language; roundName: string
  objects: SceneObject[]; found: string[]; totalDifferences: number; incorrectGuesses: number
  feedback?: 'correct' | 'incorrect' | 'complete' | 'incomplete'; prompts: ReadonlyArray<{ english: string; translated: string; hint: string }>
  vocabulary: ReadonlyArray<{ english: string; translated: string; hint: string }>
}
export type SpotDifferenceResults = GameResults & { found: number; incorrectGuesses: number }

const objectWords: Record<string, Record<Language, string>> = {
  Desk: { English: 'Desk', French: 'Bureau', Spanish: 'Escritorio' },
  Chair: { English: 'Chair', French: 'Chaise', Spanish: 'Silla' },
  Plant: { English: 'Plant', French: 'Plante', Spanish: 'Planta' },
  Cactus: { English: 'Cactus', French: 'Cactus', Spanish: 'Cactus' },
  Clock: { English: 'Clock', French: 'Horloge', Spanish: 'Reloj' },
  Lamp: { English: 'Lamp', French: 'Lampe', Spanish: 'Lámpara' },
  Candle: { English: 'Candle', French: 'Bougie', Spanish: 'Vela' },
  Cat: { English: 'Cat', French: 'Chat', Spanish: 'Gato' },
  Dog: { English: 'Dog', French: 'Chien', Spanish: 'Perro' },
  Book: { English: 'Book', French: 'Livre', Spanish: 'Libro' },
  Window: { English: 'Window', French: 'Fenêtre', Spanish: 'Ventana' },
  Mug: { English: 'Mug', French: 'Tasse', Spanish: 'Taza' },
  Globe: { English: 'Globe', French: 'Globe terrestre', Spanish: 'Globo terráqueo' },
  Star: { English: 'Star', French: 'Étoile', Spanish: 'Estrella' },
  Sofa: { English: 'Sofa', French: 'Canapé', Spanish: 'Sofá' },
  Vase: { English: 'Vase', French: 'Vase', Spanish: 'Jarrón' },
  Picture: { English: 'Picture', French: 'Tableau', Spanish: 'Cuadro' },
  Backpack: { English: 'Backpack', French: 'Sac à dos', Spanish: 'Mochila' },
  Basket: { English: 'Basket', French: 'Panier', Spanish: 'Cesta' },
  Pencil: { English: 'Pencil', French: 'Crayon', Spanish: 'Lápiz' },
}

export function sceneObjectWord(name: string, language: Language) {
  return objectWords[name]?.[language] ?? name
}

const words: Record<Language, string[]> = {
  English: ['Chair', 'Plant', 'Clock', 'Lamp', 'Cat', 'Book', 'Above', 'Left', 'Right'],
  French: ['Chaise', 'Plante', 'Horloge', 'Lampe', 'Chat', 'Livre', 'Au-dessus', 'Gauche', 'Droite'],
  Spanish: ['Silla', 'Planta', 'Reloj', 'Lámpara', 'Gato', 'Libro', 'Encima', 'Izquierda', 'Derecha'],
}

export const sceneObjects: SceneObject[] = [
  { id: 'desk', name: 'Chair', emoji: '🪑', color: '#FBF3B9', detail: 'chair / seat' }, { id: 'plant', name: 'Plant', emoji: '🪴', color: '#89E7E9', detail: 'potted greenery' },
  { id: 'clock', name: 'Clock', emoji: '🕒', color: '#FDB7EA', detail: 'wall timepiece' }, { id: 'lamp', name: 'Lamp', emoji: '💡', color: '#FFDCCC', detail: 'light source' },
  { id: 'cat', name: 'Cat', emoji: '🐈', color: '#F26A8D', detail: 'small pet' }, { id: 'book', name: 'Book', emoji: '📖', color: '#B7B1F2', detail: 'reading item' },
  { id: 'window', name: 'Window', emoji: '🪟', color: '#89E7E9', detail: 'view outside' }, { id: 'mug', name: 'Mug', emoji: '☕', color: '#FBF3B9', detail: 'drink cup' },
  { id: 'globe', name: 'Globe', emoji: '🌍', color: '#B7B1F2', detail: 'world model' }, { id: 'star', name: 'Star', emoji: '⭐', color: '#FFDCCC', detail: 'bright shape' },
  { id: 'sofa', name: 'Sofa', emoji: '🛋️', color: '#FFDCCC', detail: 'soft seat' }, { id: 'vase', name: 'Vase', emoji: '🏺', color: '#89E7E9', detail: 'decorative vase' },
  { id: 'picture', name: 'Picture', emoji: '🖼️', color: '#FBF3B9', detail: 'wall picture' }, { id: 'backpack', name: 'Backpack', emoji: '🎒', color: '#FDB7EA', detail: 'school bag' },
  { id: 'basket', name: 'Basket', emoji: '🧺', color: '#FFDCCC', detail: 'woven basket' }, { id: 'pencil', name: 'Pencil', emoji: '✏️', color: '#FBF3B9', detail: 'writing tool' },
]
export const differenceIds = ['plant', 'clock', 'lamp', 'cat', 'book']

export function spotLanguage(language: Language) {
  const w = words[language].map((translated, i) => ({ english: words.English[i], translated, hint: sceneObjects[i]?.detail ?? 'position' }))
  return { prompts: [], vocabulary: w }
}

export type { GameResults }
