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

type NewLanguage = Exclude<Language, 'English' | 'French' | 'Spanish'>
const shapes = {
  German: { circle: 'Kreis', square: 'Quadrat', triangle: 'Dreieck', rectangle: 'Rechteck', star: 'Stern', diamond: 'Raute', hexagon: 'Sechseck', oval: 'Oval' },
  Italian: { circle: 'cerchio', square: 'quadrato', triangle: 'triangolo', rectangle: 'rettangolo', star: 'stella', diamond: 'rombo', hexagon: 'esagono', oval: 'ovale' },
  Portuguese: { circle: 'círculo', square: 'quadrado', triangle: 'triângulo', rectangle: 'retângulo', star: 'estrela', diamond: 'losango', hexagon: 'hexágono', oval: 'oval' },
  Japanese: { circle: '丸', square: '正方形', triangle: '三角形', rectangle: '長方形', star: '星', diamond: 'ひし形', hexagon: '六角形', oval: '楕円' },
  Korean: { circle: '원', square: '정사각형', triangle: '삼각형', rectangle: '직사각형', star: '별', diamond: '마름모', hexagon: '육각형', oval: '타원' },
  Chinese: { circle: '圆形', square: '正方形', triangle: '三角形', rectangle: '长方形', star: '星形', diamond: '菱形', hexagon: '六边形', oval: '椭圆形' },
  Russian: { circle: 'круг', square: 'квадрат', triangle: 'треугольник', rectangle: 'прямоугольник', star: 'звезду', diamond: 'ромб', hexagon: 'шестиугольник', oval: 'овал' },
} satisfies Record<NewLanguage, Record<Shape, string>>

const colors = {
  German: { red: 'rot', blue: 'blau', yellow: 'gelb', green: 'grün', orange: 'orangefarben', purple: 'lila', pink: 'rosa', black: 'schwarz' },
  Italian: { red: 'ross', blue: 'blu', yellow: 'giall', green: 'verde', orange: 'arancione', purple: 'viola', pink: 'rosa', black: 'ner' },
  Portuguese: { red: 'vermelh', blue: 'azul', yellow: 'amarel', green: 'verde', orange: 'laranja', purple: 'rox', pink: 'rosa', black: 'pret' },
  Japanese: { red: '赤', blue: '青', yellow: '黄色', green: '緑', orange: 'オレンジ色', purple: '紫', pink: 'ピンク', black: '黒' },
  Korean: { red: '빨간색', blue: '파란색', yellow: '노란색', green: '초록색', orange: '주황색', purple: '보라색', pink: '분홍색', black: '검은색' },
  Chinese: { red: '红色', blue: '蓝色', yellow: '黄色', green: '绿色', orange: '橙色', purple: '紫色', pink: '粉色', black: '黑色' },
  Russian: { red: ['красный', 'красную'], blue: ['синий', 'синюю'], yellow: ['жёлтый', 'жёлтую'], green: ['зелёный', 'зелёную'],
    orange: ['оранжевый', 'оранжевую'], purple: ['фиолетовый', 'фиолетовую'], pink: ['розовый', 'розовую'], black: ['чёрный', 'чёрную'] },
} satisfies Record<NewLanguage, Record<Color, string | readonly [string, string]>>

/** Vocabulary for every supported pair; private positions and solutions stay on the server. */
export function pieceName({ shape, color }: Pick<Piece, 'shape' | 'color'>, language: Language): string {
  const feminine = shape === 'star'
  switch (language) {
    case 'English': return color + ' ' + shape
    case 'French':
    case 'Spanish': return shapeNames[shape][language] + ' ' + colorNames[color][language][feminine ? 1 : 0]
    case 'German': {
      const article = shape === 'circle' || shape === 'star' ? 'den' : shape === 'diamond' ? 'die' : 'das'
      const adjective = colors.German[color]
      const ending = color === 'purple' || color === 'pink' ? '' : article === 'den' ? 'en' : 'e'
      return `${article} ${adjective}${ending} ${shapes.German[shape]}`
    }
    case 'Italian': {
      const article = shape === 'star' ? 'la ' : shape === 'hexagon' || shape === 'oval' ? 'l’' : 'il '
      const ending = color === 'red' || color === 'yellow' || color === 'black' ? feminine ? 'a' : 'o' : ''
      return `${article}${shapes.Italian[shape]} ${colors.Italian[color]}${ending}`
    }
    case 'Portuguese': {
      const ending = color === 'red' || color === 'yellow' || color === 'purple' || color === 'black' ? feminine ? 'a' : 'o' : ''
      return `${feminine ? 'a' : 'o'} ${shapes.Portuguese[shape]} ${colors.Portuguese[color]}${ending}`
    }
    case 'Japanese': return `${colors.Japanese[color]}の${shapes.Japanese[shape]}`
    case 'Korean': return `${colors.Korean[color]} ${shapes.Korean[shape]}`
    case 'Chinese': return `${colors.Chinese[color]}的${shapes.Chinese[shape]}`
    case 'Russian': return `${colors.Russian[color][feminine ? 1 : 0]} ${shapes.Russian[shape]}`
  }
}
export type LostView =
  | { role: 'instructor'; instruction?: string; hint?: string; language?: Language; hintLanguage?: Language; targetArrangement?: Piece[] }
  | { role: 'operator'; slots?: Piece[]; revision: number; feedback?: 'incorrect' }

export type LostAction =
  | { type: 'move'; piece: string; slot: number }
  | { type: 'submit' }
