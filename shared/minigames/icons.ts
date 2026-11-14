import type { Language } from '../types'
import { vocabularyEntry, type AdditionalTranslations } from './vocabulary'

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

const additional = {
  cat: ['Katze', 'Gatto', 'Gato', '猫', '고양이', '猫', 'Кошка'],
  fish: ['Fisch', 'Pesce', 'Peixe', '魚', '물고기', '鱼', 'Рыба'],
  bird: ['Vogel', 'Uccello', 'Pássaro', '鳥', '새', '鸟', 'Птица'],
  tree: ['Baum', 'Albero', 'Árvore', '木', '나무', '树', 'Дерево'],
  flower: ['Blume', 'Fiore', 'Flor', '花', '꽃', '花', 'Цветок'],
  leaf: ['Blatt', 'Foglia', 'Folha', '葉', '잎', '叶子', 'Лист'],
  mountain: ['Berg', 'Montagna', 'Montanha', '山', '산', '山', 'Гора'],
  sun: ['Sonne', 'Sole', 'Sol', '太陽', '해', '太阳', 'Солнце'],
  moon: ['Mond', 'Luna', 'Lua', '月', '달', '月亮', 'Луна'],
  cloud: ['Wolke', 'Nuvola', 'Nuvem', '雲', '구름', '云', 'Облако'],
  umbrella: ['Regenschirm', 'Ombrello', 'Guarda-chuva', '傘', '우산', '雨伞', 'Зонт'],
  key: ['Schlüssel', 'Chiave', 'Chave', '鍵', '열쇠', '钥匙', 'Ключ'],
  book: ['Buch', 'Libro', 'Livro', '本', '책', '书', 'Книга'],
  cup: ['Tasse', 'Tazza', 'Xícara', 'カップ', '컵', '杯子', 'Чашка'],
  clock: ['Uhr', 'Orologio', 'Relógio', '時計', '시계', '时钟', 'Часы'],
  bell: ['Glocke', 'Campana', 'Sino', '鐘', '종', '铃铛', 'Колокол'],
  house: ['Haus', 'Casa', 'Casa', '家', '집', '房子', 'Дом'],
  boat: ['Boot', 'Barca', 'Barco', 'ボート', '배', '小船', 'Лодка'],
  bicycle: ['Fahrrad', 'Bicicletta', 'Bicicleta', '自転車', '자전거', '自行车', 'Велосипед'],
  apple: ['Apfel', 'Mela', 'Maçã', 'りんご', '사과', '苹果', 'Яблоко'],
} satisfies Record<typeof vocabulary[number][0], AdditionalTranslations>

export const gameIcons: ReadonlyMap<string, GameIcon & { translations: Record<Language, string> }> =
  new Map(vocabulary.map(([id, name, French, Spanish, category]) =>
    [id, { id, name, assetPath: '/icons/' + id + '.svg', category, translations: vocabularyEntry(name, French, Spanish, additional[id]) }]))
