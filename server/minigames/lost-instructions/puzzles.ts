import type { Language } from '../../../shared/types'
import type { Piece } from '../../../shared/minigames/lost-instructions'

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

const objects = [
  { id: 'circle', shape: 'circle', color: 'red' },
  { id: 'square', shape: 'square', color: 'blue' },
  { id: 'triangle', shape: 'triangle', color: 'yellow' },
] as const

export const puzzles: readonly Puzzle[] = [
  {
    id: 'circle-first', objects, difficulty: 'easy',
    initial: ['square', 'circle', 'triangle'], solution: ['circle', 'square', 'triangle'],
    instructions: {
      English: 'Put the red circle on the left, the blue square in the middle, and the yellow triangle on the right.',
      French: 'Place le cercle rouge à gauche, le carré bleu au milieu et le triangle jaune à droite.',
      Spanish: 'Pon el círculo rojo a la izquierda, el cuadrado azul en el centro y el triángulo amarillo a la derecha.',
    },
    hints: { English: 'The square goes between the other two shapes.' },
  },
  {
    id: 'triangle-first', objects, difficulty: 'easy',
    initial: ['circle', 'triangle', 'square'], solution: ['triangle', 'circle', 'square'],
    instructions: {
      English: 'Put the yellow triangle on the left, the red circle in the middle, and the blue square on the right.',
      French: 'Place le triangle jaune à gauche, le cercle rouge au milieu et le carré bleu à droite.',
      Spanish: 'Pon el triángulo amarillo a la izquierda, el círculo rojo en el centro y el cuadrado azul a la derecha.',
    },
  },
  {
    id: 'square-first', objects, difficulty: 'easy',
    initial: ['triangle', 'square', 'circle'], solution: ['square', 'triangle', 'circle'],
    instructions: {
      English: 'Put the blue square on the left, the yellow triangle in the middle, and the red circle on the right.',
      French: 'Place le carré bleu à gauche, le triangle jaune au milieu et le cercle rouge à droite.',
      Spanish: 'Pon el cuadrado azul a la izquierda, el triángulo amarillo en el centro y el círculo rojo a la derecha.',
    },
  },
  {
    id: 'square-between', objects, difficulty: 'medium',
    initial: ['square', 'circle', 'triangle'], solution: ['triangle', 'square', 'circle'],
    instructions: {
      English: 'Put the blue square between the other two shapes. The yellow triangle is to its left.',
      French: 'Place le carré bleu entre les deux autres formes. Le triangle jaune est à sa gauche.',
      Spanish: 'Pon el cuadrado azul entre las otras dos figuras. El triángulo amarillo está a su izquierda.',
    },
  },
  {
    id: 'triangle-between', objects, difficulty: 'medium',
    initial: ['circle', 'triangle', 'square'], solution: ['square', 'triangle', 'circle'],
    instructions: {
      English: 'Put the yellow triangle between the other two shapes. The red circle is to its right.',
      French: 'Place le triangle jaune entre les deux autres formes. Le cercle rouge est à sa droite.',
      Spanish: 'Pon el triángulo amarillo entre las otras dos figuras. El círculo rojo está a su derecha.',
    },
  },
]
