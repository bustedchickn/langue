import { languages, type Language } from '../types'
import type { GameConfig, GameResults, Seat } from './contracts'
import { vocabularyEntry } from './vocabulary'

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
  German: { vocabulary: ['Geh geradeaus', 'Bieg links ab', 'Bieg rechts ab', 'Bleib hier stehen', 'An der Ecke', 'Geh daran vorbei', 'Neben', 'Geh zurück'] },
  Italian: { vocabulary: ['Vai dritto', 'Gira a sinistra', 'Gira a destra', 'Fermati qui', 'All’angolo', 'Passa oltre', 'Accanto a', 'Torna indietro'] },
  Portuguese: { vocabulary: ['Siga em frente', 'Vire à esquerda', 'Vire à direita', 'Pare aqui', 'Na esquina', 'Passe por', 'Ao lado de', 'Volte'] },
  Japanese: { vocabulary: ['まっすぐ進んで', '左に曲がって', '右に曲がって', 'ここで止まって', '角で', '通り過ぎて', '隣に', '戻って'] },
  Korean: { vocabulary: ['직진하세요', '왼쪽으로 도세요', '오른쪽으로 도세요', '여기서 멈추세요', '모퉁이에서', '지나가세요', '옆에', '되돌아가세요'] },
  Chinese: { vocabulary: ['直走', '左转', '右转', '在这里停下', '在拐角处', '经过', '在旁边', '往回走'] },
  Russian: { vocabulary: ['Иди прямо', 'Поверни налево', 'Поверни направо', 'Остановись здесь', 'На углу', 'Пройди мимо', 'Рядом с', 'Вернись назад'] },
}

const landmarkWords = {
  Park: vocabularyEntry('Park', 'Parc', 'Parque', ['Park', 'Parco', 'Parque', '公園', '공원', '公园', 'Парк']),
  Café: vocabularyEntry('Café', 'Café', 'Cafetería', ['Café', 'Bar', 'Cafeteria', 'カフェ', '카페', '咖啡馆', 'Кафе']),
  Bakery: vocabularyEntry('Bakery', 'Boulangerie', 'Panadería', ['Bäckerei', 'Panetteria', 'Padaria', 'パン屋', '빵집', '面包店', 'Пекарня']),
  Library: vocabularyEntry('Library', 'Bibliothèque', 'Biblioteca', ['Bibliothek', 'Biblioteca', 'Biblioteca', '図書館', '도서관', '图书馆', 'Библиотека']),
  Fountain: vocabularyEntry('Fountain', 'Fontaine', 'Fuente', ['Brunnen', 'Fontana', 'Fonte', '噴水', '분수', '喷泉', 'Фонтан']),
  Museum: vocabularyEntry('Museum', 'Musée', 'Museo', ['Museum', 'Museo', 'Museu', '博物館', '박물관', '博物馆', 'Музей']),
  Market: vocabularyEntry('Market', 'Marché', 'Mercado', ['Markt', 'Mercato', 'Mercado', '市場', '시장', '市场', 'Рынок']),
  Cinema: vocabularyEntry('Cinema', 'Cinéma', 'Cine', ['Kino', 'Cinema', 'Cinema', '映画館', '영화관', '电影院', 'Кинотеатр']),
  Station: vocabularyEntry('Station', 'Gare', 'Estación', ['Bahnhof', 'Stazione', 'Estação', '駅', '기차역', '火车站', 'Вокзал']),
} satisfies Record<typeof mapNavigatorLandmarks[number]['name'], Record<Language, string>>

export function mapNavigatorLanguage(language: Language) {
  const selected = copy[language]
  return {
    landmarks: mapNavigatorLandmarks.map(landmark => ({ ...landmark, name: landmarkWords[landmark.name][language] })),
    vocabulary: selected.vocabulary.map((translated, i) => ({ english: copy.English.vocabulary[i], translated })),
  }
}

export type { Seat }
