import type { Language } from '../types'

export interface GameIcon {
  id: string
  name: string
  assetPath: string
  category?: string
  translations?: Partial<Record<Language, string>>
  difficulty?: 'easy' | 'medium'
}

const vocabulary = [
  ['cat', 'Cat', 'Chat', 'Gato', 'Animals'],
  ['fish', 'Fish', 'Poisson', 'Pez', 'Animals'],
  ['bird', 'Bird', 'Oiseau', 'Pájaro', 'Animals'],
  ['tree', 'Tree', 'Arbre', 'Árbol', 'Nature'],
  ['flower', 'Flower', 'Fleur', 'Flor', 'Nature'],
  ['leaf', 'Leaf', 'Feuille', 'Hoja', 'Nature'],
  ['mountain', 'Mountain', 'Montagne', 'Montaña', 'Nature'],
  ['sun', 'Sun', 'Soleil', 'Sol', 'Sky'],
  ['moon', 'Moon', 'Lune', 'Luna', 'Sky'],
  ['cloud', 'Cloud', 'Nuage', 'Nube', 'Sky'],
  ['umbrella', 'Umbrella', 'Parapluie', 'Paraguas', 'Objects'],
  ['key', 'Key', 'Clé', 'Llave', 'Objects'],
  ['book', 'Book', 'Livre', 'Libro', 'Objects'],
  ['cup', 'Cup', 'Tasse', 'Taza', 'Objects'],
  ['clock', 'Clock', 'Horloge', 'Reloj', 'Objects'],
  ['bell', 'Bell', 'Cloche', 'Campana', 'Objects'],
  ['house', 'House', 'Maison', 'Casa', 'Places'],
  ['boat', 'Boat', 'Bateau', 'Barco', 'Transport'],
  ['bicycle', 'Bicycle', 'Vélo', 'Bicicleta', 'Transport'],
  ['apple', 'Apple', 'Pomme', 'Manzana', 'Food'],
] as const

export const gameIcons: ReadonlyMap<string, GameIcon> = new Map(vocabulary.map(([id, name, French, Spanish, category]) =>
  [id, { id, name, assetPath: '/icons/' + id + '.svg', category, translations: { English: name, French, Spanish } }]))
