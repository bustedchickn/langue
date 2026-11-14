import assert from 'node:assert/strict'
import { test } from 'node:test'
import { acceptsAnswer, parseWordImport, starterVocabulary, wordProgress } from '../shared/vocabulary'

test('starter vocabulary provides five sets in each learning language with translated examples', () => {
  const sets = starterVocabulary('player', 100)
  assert.equal(sets.length, 15)
  for (const language of ['English', 'French', 'Spanish']) {
    const selected = sets.filter(set => set.targetLanguage === language)
    assert.deepEqual(selected.map(set => set.name), [
      'Travel Basics', 'Food and Café', 'Directions', 'School and Study', 'Everyday Conversation',
    ])
    assert.ok(selected.every(set => set.ownerUid === 'player' && set.words.length === 4))
  }
  assert.equal(sets.find(set => set.targetLanguage === 'French')?.words[0].translation, 'Billet')
  assert.equal(sets.find(set => set.targetLanguage === 'Spanish')?.words[0].translation, 'Boleto')
  assert.equal(sets.find(set => set.targetLanguage === 'English')?.words[0].translation, 'Ticket')
})

test('imports word pairs and reports lines that cannot be parsed', () => {
  const parsed = parseWordImport('hello — bonjour\nthank you — merci\nbroken line\n\nbook - livre')
  assert.deepEqual(parsed.words.map(word => [word.term, word.translation]), [
    ['hello', 'bonjour'], ['thank you', 'merci'], ['book', 'livre'],
  ])
  assert.deepEqual(parsed.errors, [3])
  assert.deepEqual(wordProgress(parsed.words), { mastered: 0, learning: 0, new: 3, percent: 0 })
})

test('typed answers accept accents and one small typo but reject unrelated words', () => {
  assert.equal(acceptsAnswer('  AEROPORT ', 'Aéroport'), true)
  assert.equal(acceptsAnswer('aeropor', 'Aéroport'), true)
  assert.equal(acceptsAnswer('aerobport', 'Aéroport'), true)
  assert.equal(acceptsAnswer('aerodrome', 'Aéroport'), false)
  assert.equal(acceptsAnswer('cat', 'car'), false)
  assert.equal(acceptsAnswer('', 'Aéroport'), false)
})
