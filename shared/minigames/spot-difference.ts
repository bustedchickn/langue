import { languages, type Language } from '../types'
import type { GameConfig, GameResults } from './contracts'
import { vocabularyEntry } from './vocabulary'

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
  Apple: vocabularyEntry("Apple", "Pomme", "Manzana", ["Apfel","Mela","Maçã","りんご","사과","苹果","Яблоко"]),
  Pear: vocabularyEntry("Pear", "Poire", "Pera", ["Birne","Pera","Pera","梨","배","梨","Груша"]),
  Glass: vocabularyEntry("Glass", "Verre", "Vaso", ["Glas","Bicchiere","Copo","グラス","유리잔","玻璃杯","Стакан"]),
  Bottle: vocabularyEntry("Bottle", "Bouteille", "Botella", ["Flasche","Bottiglia","Garrafa","瓶","병","瓶子","Бутылка"]),
  Guitar: vocabularyEntry("Guitar", "Guitare", "Guitarra", ["Gitarre","Chitarra","Violão","ギター","기타","吉他","Гитара"]),
  Violin: vocabularyEntry("Violin", "Violon", "Violín", ["Geige","Violino","Violino","バイオリン","바이올린","小提琴","Скрипка"]),
  Football: vocabularyEntry("Football", "Ballon de football", "Balón de fútbol", ["Fußball","Pallone da calcio","Bola de futebol","サッカーボール","축구공","足球","Футбольный мяч"]),
  Basketball: vocabularyEntry("Basketball", "Ballon de basket", "Balón de baloncesto", ["Basketball","Pallone da basket","Bola de basquete","バスケットボール","농구공","篮球","Баскетбольный мяч"]),
  Car: vocabularyEntry("Car", "Voiture", "Coche", ["Auto","Auto","Carro","車","자동차","汽车","Машина"]),
  Bus: vocabularyEntry("Bus", "Bus", "Autobús", ["Bus","Autobus","Ônibus","バス","버스","公共汽车","Автобус"]),
  Rose: vocabularyEntry("Rose", "Rose", "Rosa", ["Rose","Rosa","Rosa","バラ","장미","玫瑰","Роза"]),
  Tulip: vocabularyEntry("Tulip", "Tulipe", "Tulipán", ["Tulpe","Tulipano","Tulipa","チューリップ","튤립","郁金香","Тюльпан"]),
  Owl: vocabularyEntry("Owl", "Hibou", "Búho", ["Eule","Gufo","Coruja","フクロウ","부엉이","猫头鹰","Сова"]),
  Parrot: vocabularyEntry("Parrot", "Perroquet", "Loro", ["Papagei","Pappagallo","Papagaio","オウム","앵무새","鹦鹉","Попугай"]),
  Cake: vocabularyEntry("Cake", "Gâteau", "Pastel", ["Kuchen","Torta","Bolo","ケーキ","케이크","蛋糕","Торт"]),
  Cookie: vocabularyEntry("Cookie", "Biscuit", "Galleta", ["Keks","Biscotto","Biscoito","クッキー","쿠키","饼干","Печенье"]),
  Shirt: vocabularyEntry("Shirt", "T-shirt", "Camiseta", ["T-Shirt","Maglietta","Camiseta","Tシャツ","티셔츠","T恤","Футболка"]),
  Dress: vocabularyEntry("Dress", "Robe", "Vestido", ["Kleid","Vestito","Vestido","ワンピース","원피스","连衣裙","Платье"]),
  Sun: vocabularyEntry("Sun", "Soleil", "Sol", ["Sonne","Sole","Sol","太陽","해","太阳","Солнце"]),
  Cloud: vocabularyEntry("Cloud", "Nuage", "Nube", ["Wolke","Nuvola","Nuvem","雲","구름","云","Облако"]),
  Desk: vocabularyEntry('Desk', 'Bureau', 'Escritorio', ['Schreibtisch', 'Scrivania', 'Escrivaninha', '机', '책상', '书桌', 'Письменный стол']),
  Chair: vocabularyEntry('Chair', 'Chaise', 'Silla', ['Stuhl', 'Sedia', 'Cadeira', '椅子', '의자', '椅子', 'Стул']),
  Plant: vocabularyEntry('Plant', 'Plante', 'Planta', ['Pflanze', 'Pianta', 'Planta', '植物', '식물', '植物', 'Растение']),
  Cactus: vocabularyEntry('Cactus', 'Cactus', 'Cactus', ['Kaktus', 'Cactus', 'Cacto', 'サボテン', '선인장', '仙人掌', 'Кактус']),
  Clock: vocabularyEntry('Clock', 'Horloge', 'Reloj', ['Uhr', 'Orologio', 'Relógio', '時計', '시계', '时钟', 'Часы']),
  Lamp: vocabularyEntry('Lamp', 'Lampe', 'Lámpara', ['Lampe', 'Lampada', 'Luminária', 'ランプ', '램프', '灯', 'Лампа']),
  Candle: vocabularyEntry('Candle', 'Bougie', 'Vela', ['Kerze', 'Candela', 'Vela', 'ろうそく', '양초', '蜡烛', 'Свеча']),
  Cat: vocabularyEntry('Cat', 'Chat', 'Gato', ['Katze', 'Gatto', 'Gato', '猫', '고양이', '猫', 'Кошка']),
  Dog: vocabularyEntry('Dog', 'Chien', 'Perro', ['Hund', 'Cane', 'Cachorro', '犬', '개', '狗', 'Собака']),
  Book: vocabularyEntry('Book', 'Livre', 'Libro', ['Buch', 'Libro', 'Livro', '本', '책', '书', 'Книга']),
  Window: vocabularyEntry('Window', 'Fenêtre', 'Ventana', ['Fenster', 'Finestra', 'Janela', '窓', '창문', '窗户', 'Окно']),
  Mug: vocabularyEntry('Mug', 'Tasse', 'Taza', ['Becher', 'Tazza', 'Caneca', 'マグカップ', '머그잔', '马克杯', 'Кружка']),
  Globe: vocabularyEntry('Globe', 'Globe terrestre', 'Globo terráqueo', ['Globus', 'Mappamondo', 'Globo terrestre', '地球儀', '지구본', '地球仪', 'Глобус']),
  Star: vocabularyEntry('Star', 'Étoile', 'Estrella', ['Stern', 'Stella', 'Estrela', '星', '별', '星星', 'Звезда']),
  Sofa: vocabularyEntry('Sofa', 'Canapé', 'Sofá', ['Sofa', 'Divano', 'Sofá', 'ソファ', '소파', '沙发', 'Диван']),
  Vase: vocabularyEntry('Vase', 'Vase', 'Jarrón', ['Vase', 'Vaso', 'Vaso', '花瓶', '꽃병', '花瓶', 'Ваза']),
  Picture: vocabularyEntry('Picture', 'Tableau', 'Cuadro', ['Bild', 'Quadro', 'Quadro', '絵', '그림', '画', 'Картина']),
  Backpack: vocabularyEntry('Backpack', 'Sac à dos', 'Mochila', ['Rucksack', 'Zaino', 'Mochila', 'リュック', '배낭', '背包', 'Рюкзак']),
  Basket: vocabularyEntry('Basket', 'Panier', 'Cesta', ['Korb', 'Cesto', 'Cesta', 'かご', '바구니', '篮子', 'Корзина']),
  Pencil: vocabularyEntry('Pencil', 'Crayon', 'Lápiz', ['Bleistift', 'Matita', 'Lápis', '鉛筆', '연필', '铅笔', 'Карандаш']),
}

export function sceneObjectWord(name: string, language: Language) {
  if (!Object.hasOwn(objectWords, name)) throw new Error('Unknown scene object: ' + name)
  return objectWords[name][language]
}

const words = [
  ...['Chair', 'Plant', 'Clock', 'Lamp', 'Cat', 'Book'].map(name => objectWords[name]),
  vocabularyEntry('Above', 'Au-dessus', 'Encima', ['Darüber', 'Sopra', 'Acima', '上', '위', '上方', 'Сверху']),
  vocabularyEntry('Left', 'Gauche', 'Izquierda', ['Links', 'Sinistra', 'Esquerda', '左', '왼쪽', '左边', 'Слева']),
  vocabularyEntry('Right', 'Droite', 'Derecha', ['Rechts', 'Destra', 'Direita', '右', '오른쪽', '右边', 'Справа']),
]

export const sceneObjects: SceneObject[] = [
  { id: 'fruit', name: 'Apple', emoji: '🍎', color: '#FBF3B9', detail: 'fruit' },
  { id: 'drink', name: 'Glass', emoji: '🥛', color: '#FBF3B9', detail: 'drink container' },
  { id: 'music', name: 'Guitar', emoji: '🎸', color: '#FBF3B9', detail: 'string instrument' },
  { id: 'ball', name: 'Football', emoji: '⚽', color: '#FBF3B9', detail: 'sports ball' },
  { id: 'vehicle', name: 'Car', emoji: '🚗', color: '#FBF3B9', detail: 'road vehicle' },
  { id: 'flower', name: 'Rose', emoji: '🌹', color: '#FBF3B9', detail: 'flower' },
  { id: 'bird', name: 'Owl', emoji: '🦉', color: '#FBF3B9', detail: 'bird' },
  { id: 'snack', name: 'Cake', emoji: '🍰', color: '#FBF3B9', detail: 'sweet snack' },
  { id: 'clothing', name: 'Shirt', emoji: '👕', color: '#FBF3B9', detail: 'clothing' },
  { id: 'weather', name: 'Sun', emoji: '☀️', color: '#FBF3B9', detail: 'sky object' },
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

const vocabularyHints = [
  vocabularyEntry('chair / seat', 'chaise / siège', 'silla / asiento', ['Stuhl / Sitz', 'sedia / seduta', 'cadeira / assento', '椅子・座席', '의자 / 좌석', '椅子／座位', 'стул / сиденье']),
  vocabularyEntry('potted greenery', 'plante en pot', 'planta en maceta', ['Topfpflanze', 'pianta in vaso', 'planta em vaso', '鉢植え', '화분에 심은 식물', '盆栽植物', 'растение в горшке']),
  vocabularyEntry('wall timepiece', 'horloge murale', 'reloj de pared', ['Wanduhr', 'orologio da parete', 'relógio de parede', '壁掛け時計', '벽시계', '挂钟', 'настенные часы']),
  vocabularyEntry('light source', 'source de lumière', 'fuente de luz', ['Lichtquelle', 'fonte di luce', 'fonte de luz', '光源', '빛을 내는 물건', '光源', 'источник света']),
  vocabularyEntry('small pet', 'petit animal de compagnie', 'mascota pequeña', ['kleines Haustier', 'piccolo animale domestico', 'animal de estimação pequeno', '小さなペット', '작은 반려동물', '小宠物', 'небольшой питомец']),
  vocabularyEntry('reading item', 'objet à lire', 'objeto para leer', ['Lesestoff', 'qualcosa da leggere', 'algo para ler', '読み物', '읽을거리', '读物', 'то, что можно почитать']),
]
const positionHint = vocabularyEntry('position', 'position', 'posición', ['Position', 'posizione', 'posição', '位置', '위치', '位置', 'положение'])

export function spotLanguage(language: Language) {
  const w = words.map((entry, i) => ({
    english: entry.English, translated: entry[language], hint: (vocabularyHints[i] ?? positionHint)[language],
  }))
  return { prompts: [], vocabulary: w }
}

export type { GameResults }
