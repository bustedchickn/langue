import { languages, type Language } from '../types'
import type { GameConfig } from './contracts'

export const codenamesConfig = {
  id: 'codenames', name: 'Codenames',
  description: 'Give a one-word clue and help your partner find the team’s secret words.',
  minPlayers: 2, maxPlayers: 2,
  scoring: { pointsPerWord: 1 }, supportedLanguages: languages, assets: {},
} satisfies GameConfig
export const codenamesBoardSize = 25
export const codenamesTeamWords = 9

export type WordCard = { id: string; words: Record<Language, string>; definition: string }
export const wordCards: WordCard[] = [
  { id: 'apple', words: { English: 'Apple', French: 'Pomme', Spanish: 'Manzana' }, definition: 'A round fruit that grows on a tree.' },
  { id: 'bird', words: { English: 'Bird', French: 'Oiseau', Spanish: 'Pájaro' }, definition: 'An animal with feathers, wings, and a beak.' },
  { id: 'bridge', words: { English: 'Bridge', French: 'Pont', Spanish: 'Puente' }, definition: 'A structure that carries a road over water or a gap.' },
  { id: 'book', words: { English: 'Book', French: 'Livre', Spanish: 'Libro' }, definition: 'A collection of pages you can read.' },
  { id: 'cloud', words: { English: 'Cloud', French: 'Nuage', Spanish: 'Nube' }, definition: 'A visible mass of water droplets in the sky.' },
  { id: 'key', words: { English: 'Key', French: 'Clé', Spanish: 'Llave' }, definition: 'A small object used to open a lock.' },
  { id: 'moon', words: { English: 'Moon', French: 'Lune', Spanish: 'Luna' }, definition: 'The bright object that travels around Earth.' },
  { id: 'tree', words: { English: 'Tree', French: 'Arbre', Spanish: 'Árbol' }, definition: 'A tall plant with a wooden trunk and branches.' },
  { id: 'boat', words: { English: 'Boat', French: 'Bateau', Spanish: 'Barco' }, definition: 'A vessel that travels on water.' },
  { id: 'star', words: { English: 'Star', French: 'Étoile', Spanish: 'Estrella' }, definition: 'A distant sun visible as a point of light at night.' },
  { id: 'flower', words: { English: 'Flower', French: 'Fleur', Spanish: 'Flor' }, definition: 'The colorful part of a plant that produces seeds.' },
  { id: 'clock', words: { English: 'Clock', French: 'Horloge', Spanish: 'Reloj' }, definition: 'An object that shows the time.' },
  { id: 'fish', words: { English: 'Fish', French: 'Poisson', Spanish: 'Pez' }, definition: 'An animal that lives and breathes in water.' },
  { id: 'window', words: { English: 'Window', French: 'Fenêtre', Spanish: 'Ventana' }, definition: 'An opening in a wall that lets in light.' },
  { id: 'shoe', words: { English: 'Shoe', French: 'Chaussure', Spanish: 'Zapato' }, definition: 'Something worn to protect a foot.' },
  { id: 'rain', words: { English: 'Rain', French: 'Pluie', Spanish: 'Lluvia' }, definition: 'Drops of water falling from clouds.' },
  { id: 'bread', words: { English: 'Bread', French: 'Pain', Spanish: 'Pan' }, definition: 'Food baked from flour and water.' },
  { id: 'mountain', words: { English: 'Mountain', French: 'Montagne', Spanish: 'Montaña' }, definition: 'A very high area of land with steep sides.' },
  { id: 'house', words: { English: 'House', French: 'Maison', Spanish: 'Casa' }, definition: 'A building where people live.' },
  { id: 'sun', words: { English: 'Sun', French: 'Soleil', Spanish: 'Sol' }, definition: 'The star that gives Earth light and warmth.' },
  { id: 'river', words: { English: 'River', French: 'Rivière', Spanish: 'Río' }, definition: 'A natural stream of water flowing across land.' },
  { id: 'garden', words: { English: 'Garden', French: 'Jardin', Spanish: 'Jardín' }, definition: 'A place where people grow plants.' },
  { id: 'chair', words: { English: 'Chair', French: 'Chaise', Spanish: 'Silla' }, definition: 'A seat for one person, usually with a back.' },
  { id: 'school', words: { English: 'School', French: 'École', Spanish: 'Escuela' }, definition: 'A place where people go to learn.' },
  { id: 'forest', words: { English: 'Forest', French: 'Forêt', Spanish: 'Bosque' }, definition: 'A large area covered with trees.' },
  { id: 'beach', words: { English: 'Beach', French: 'Plage', Spanish: 'Playa' }, definition: 'A sandy or pebbly shore beside water.' },
  { id: 'bear', words: { English: 'Bear', French: 'Ours', Spanish: 'Oso' }, definition: 'A large furry animal with strong paws.' },
  { id: 'train', words: { English: 'Train', French: 'Train', Spanish: 'Tren' }, definition: 'A group of connected vehicles that travels on rails.' },
  { id: 'door', words: { English: 'Door', French: 'Porte', Spanish: 'Puerta' }, definition: 'A movable panel used to enter or leave a room.' },
  { id: 'ice', words: { English: 'Ice', French: 'Glace', Spanish: 'Hielo' }, definition: 'Water that has frozen solid.' },
  { id: 'horse', words: { English: 'Horse', French: 'Cheval', Spanish: 'Caballo' }, definition: 'A large animal people can ride.' },
  { id: 'music', words: { English: 'Music', French: 'Musique', Spanish: 'Música' }, definition: 'Sounds arranged in a rhythm or melody.' },
  { id: 'ocean', words: { English: 'Ocean', French: 'Océan', Spanish: 'Océano' }, definition: 'A vast area of salt water.' },
  { id: 'light', words: { English: 'Light', French: 'Lumière', Spanish: 'Luz' }, definition: 'What makes things visible to your eyes.' },
  { id: 'table', words: { English: 'Table', French: 'Table', Spanish: 'Mesa' }, definition: 'Furniture with a flat top for eating or working.' },
  { id: 'snow', words: { English: 'Snow', French: 'Neige', Spanish: 'Nieve' }, definition: 'Soft white ice crystals that fall in cold weather.' },
]

export type CardKind = 'team' | 'neutral' | 'assassin'
export type CodenamesView = {
  role: 'clue-giver' | 'guesser'
  language: Language
  cards: { id: string; revealed?: CardKind; kind?: CardKind }[]
  clue?: string
  remaining: number
  turnsLeft: number
  suddenDeath: boolean
  revision: number
}
