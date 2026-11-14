import type { Language } from './types'

export type Mastery = 'new' | 'learning' | 'mastered'
export type VocabularyWord = {
  id: string
  term: string
  translation: string
  partOfSpeech: string
  example: string
  notes: string
  emoji: string
  imageUrl: string
  favorite: boolean
  mastery: Mastery
}
export type VocabularySet = {
  id: string
  ownerUid: string
  name: string
  topic: string
  description: string
  sourceLanguage: Language
  targetLanguage: Language
  words: VocabularyWord[]
  createdAt: number
  updatedAt: number
  lastPracticedAt: number | null
}

export const blankWord = (): VocabularyWord => ({
  id: crypto.randomUUID(), term: '', translation: '', partOfSpeech: '', example: '', notes: '', emoji: '', imageUrl: '',
  favorite: false, mastery: 'new',
})

export function wordProgress(words: readonly VocabularyWord[]) {
  const mastered = words.filter(word => word.mastery === 'mastered').length
  const learning = words.filter(word => word.mastery === 'learning').length
  return { mastered, learning, new: words.length - mastered - learning,
    percent: words.length ? Math.round(mastered / words.length * 100) : 0 }
}

export function parseWordImport(text: string) {
  const words: VocabularyWord[] = []
  const errors: number[] = []
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return
    const parts = line.split(/\s+[—–-]\s+|\t/)
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
      errors.push(index + 1)
      return
    }
    words.push({ ...blankWord(), term: parts[0].trim(), translation: parts[1].trim() })
  })
  return { words, errors }
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim()
}

export function acceptsAnswer(input: string, answer: string) {
  const actual = normalize(input)
  const expected = normalize(answer)
  if (!actual || !expected) return false
  if (actual === expected) return true
  if (Math.abs(actual.length - expected.length) > 1 || expected.length < 5) return false
  let previous = Array.from({ length: expected.length + 1 }, (_, index) => index)
  for (let row = 1; row <= actual.length; row++) {
    const next = [row]
    for (let column = 1; column <= expected.length; column++) {
      next[column] = Math.min(next[column - 1] + 1, previous[column] + 1,
        previous[column - 1] + (actual[row - 1] === expected[column - 1] ? 0 : 1))
    }
    previous = next
  }
  return previous[expected.length] <= 1
}

type StarterTerm = [english: string, french: string, spanish: string, exampleEnglish: string, exampleFrench: string, exampleSpanish: string]
const starterTopics: { name: string; topic: string; description: string; terms: StarterTerm[] }[] = [
  { name: 'Travel Basics', topic: 'Travel', description: 'Useful words for a new journey.', terms: [
    ['Ticket', 'Billet', 'Boleto', 'I have a ticket.', 'J’ai un billet.', 'Tengo un boleto.'],
    ['Train', 'Train', 'Tren', 'The train arrives soon.', 'Le train arrive bientôt.', 'El tren llega pronto.'],
    ['Airport', 'Aéroport', 'Aeropuerto', 'The airport is nearby.', 'L’aéroport est proche.', 'El aeropuerto está cerca.'],
    ['Suitcase', 'Valise', 'Maleta', 'My suitcase is heavy.', 'Ma valise est lourde.', 'Mi maleta es pesada.'],
  ] },
  { name: 'Food and Café', topic: 'Food', description: 'Order and enjoy something delicious.', terms: [
    ['Coffee', 'Café', 'Café', 'I would like a coffee.', 'Je voudrais un café.', 'Quisiera un café.'],
    ['Water', 'Eau', 'Agua', 'May I have water?', 'Puis-je avoir de l’eau ?', '¿Me da agua?'],
    ['Bread', 'Pain', 'Pan', 'The bread is fresh.', 'Le pain est frais.', 'El pan está fresco.'],
    ['Menu', 'Carte', 'Menú', 'Can I see the menu?', 'Puis-je voir la carte ?', '¿Puedo ver el menú?'],
  ] },
  { name: 'Directions', topic: 'Getting around', description: 'Find your way together.', terms: [
    ['Left', 'Gauche', 'Izquierda', 'Turn left here.', 'Tournez à gauche ici.', 'Gira a la izquierda aquí.'],
    ['Right', 'Droite', 'Derecha', 'Turn right there.', 'Tournez à droite là-bas.', 'Gira a la derecha allí.'],
    ['Straight ahead', 'Tout droit', 'Todo recto', 'Go straight ahead.', 'Allez tout droit.', 'Sigue todo recto.'],
    ['Near', 'Près', 'Cerca', 'The park is near.', 'Le parc est près.', 'El parque está cerca.'],
  ] },
  { name: 'School and Study', topic: 'School', description: 'Talk about the classroom.', terms: [
    ['Book', 'Livre', 'Libro', 'Open your book.', 'Ouvrez votre livre.', 'Abre tu libro.'],
    ['Teacher', 'Professeur', 'Profesor', 'The teacher is here.', 'Le professeur est ici.', 'El profesor está aquí.'],
    ['Question', 'Question', 'Pregunta', 'I have a question.', 'J’ai une question.', 'Tengo una pregunta.'],
    ['Notebook', 'Cahier', 'Cuaderno', 'My notebook is blue.', 'Mon cahier est bleu.', 'Mi cuaderno es azul.'],
  ] },
  { name: 'Everyday Conversation', topic: 'Conversation', description: 'Start a friendly chat.', terms: [
    ['Hello', 'Bonjour', 'Hola', 'Hello, how are you?', 'Bonjour, comment allez-vous ?', 'Hola, ¿cómo estás?'],
    ['Thank you', 'Merci', 'Gracias', 'Thank you for helping.', 'Merci pour votre aide.', 'Gracias por ayudar.'],
    ['Please', 'S’il vous plaît', 'Por favor', 'Please sit down.', 'Asseyez-vous, s’il vous plaît.', 'Siéntate, por favor.'],
    ['See you soon', 'À bientôt', 'Hasta pronto', 'See you soon, my friend.', 'À bientôt, mon ami.', 'Hasta pronto, amigo.'],
  ] },
]

export function starterVocabulary(ownerUid: string, now = Date.now()): VocabularySet[] {
  return (['English', 'French', 'Spanish'] as const).flatMap(targetLanguage => starterTopics.map((topic, index) => {
    const sourceLanguage = targetLanguage === 'English' ? 'French' : 'English'
    const wordIndex = { English: 0, French: 1, Spanish: 2 } as const
    const exampleIndex = { English: 3, French: 4, Spanish: 5 } as const
    return {
      id: `starter-${targetLanguage.toLowerCase()}-${index}`,
      ownerUid, name: topic.name, topic: topic.topic, description: topic.description,
      sourceLanguage, targetLanguage,
      words: topic.terms.map((term, termIndex) => ({
        ...blankWord(), id: `starter-${index}-${termIndex}`,
        term: term[wordIndex[sourceLanguage]], translation: term[wordIndex[targetLanguage]],
        example: term[exampleIndex[targetLanguage]],
      })),
      createdAt: now, updatedAt: now, lastPracticedAt: null,
    }
  }))
}
