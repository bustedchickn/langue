import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startCodenames } from '../server/minigames/codenames/game'
import { languageTags, registeredLanguages } from '../shared/types'
import { isBoardWord, normalizeClue, wordCards, type CodenamesResults, type CodenamesView } from '../shared/minigames/codenames'

test('dictionary contains 100 unique translated terms and definitions', () => {
  assert.equal(wordCards.length, 100)
  assert.equal(new Set(wordCards.map(card => card.id)).size, 100)
  for (const language of registeredLanguages) {
    assert.equal(new Set(wordCards.map(card => card.words[language].normalize('NFC').toLocaleLowerCase(languageTags[language]))).size, 100, language)
    assert.ok(wordCards.every(card => card.words[language].trim() && card.definitions[language].trim()), language)
  }
  const cloud = wordCards.find(card => card.id === 'cloud')!
  assert.equal(cloud.words.English, 'Cloud')
  assert.equal(cloud.words.Spanish, 'Nube')
})

test('clue validation accepts Unicode letters and rejects canonical board-word equivalents', () => {
  for (const word of ['Eichhörnchen', 'コンピューター', '한글', '语言', 'дорога', '𠮷'.repeat(30)]) {
    assert.equal(normalizeClue(' ' + word + ' '), word)
  }
  for (const word of ['two words', '🦊', '\u0301', 'a1', '𠮷'.repeat(31)]) assert.equal(normalizeClue(word), undefined)
  assert.equal(normalizeClue('Ba\u0308r'), 'Bär')
  assert.ok(isBoardWord('BA\u0308R', ['Bär'], 'German'))
  assert.ok(isBoardWord('한글', ['한글'], 'Korean'))
  assert.ok(!isBoardWord('Bar', ['Bär'], 'German'))
})

test('a Japanese game rejects a displayed board word and shares a valid clue', () => {
  const game = startCodenames('japanese', {
    host: { name: 'Host', learningLanguage: 'Japanese', fluentLanguage: 'Italian' },
    guest: { name: 'Guest', learningLanguage: 'Japanese', fluentLanguage: 'Korean' },
  }, 0, () => 0)
  const host = game.view('host', 3000) as CodenamesView
  const guest = game.view('guest', 3000) as CodenamesView
  assert.deepEqual(host.cards.map(card => card.id), guest.cards.map(card => card.id))
  assert.equal(host.fluentLanguage, 'Italian')
  assert.equal(guest.fluentLanguage, 'Korean')
  const boardWord = wordCards.find(card => card.id === host.cards[0].id)!.words.Japanese
  assert.equal(game.act('host', { type: 'clue', word: boardWord, count: 1, revision: 0 }, 3000), false)
  assert.equal(game.act('host', { type: 'clue', word: '果物', count: 1, revision: 0 }, 3000), true)
  assert.equal((game.view('guest', 3000) as CodenamesView).clue, '果物')
})

test('codenames keeps the key private and validates turns, guesses and duplicate actions', () => {
  const game = startCodenames('test', {
    host: { name: 'Clue giver', learningLanguage: 'French', fluentLanguage: 'Spanish' },
    guest: { name: 'Guesser', learningLanguage: 'English', fluentLanguage: 'French' },
  }, 0, () => 0)
  const host = () => game.view('host', 3000) as CodenamesView
  const guest = () => game.view('guest', 3000) as CodenamesView
  assert.equal(host().cards.length, 25)
  assert.deepEqual(host().cards.map(card => card.id), guest().cards.map(card => card.id))
  assert.equal(host().language, 'French')
  assert.equal(host().fluentLanguage, 'Spanish')
  assert.equal(guest().language, 'English')
  assert.equal(guest().fluentLanguage, 'French')
  assert.equal(host().cards.filter(card => card.kind === 'team').length, 9)
  assert.ok(guest().cards.every(card => !('kind' in card)))
  assert.equal(game.act('guest', { type: 'clue', word: 'fruit', count: 2, revision: 0 }, 3000), false)
  assert.equal(game.act('host', { type: 'clue', word: 'Pomme', count: 2, revision: 0 }, 3000), false)
  assert.equal(game.act('host', { type: 'clue', word: 'fruit', count: 2, revision: 0 }, 3000), true)
  const target = host().cards.find(card => card.kind === 'team')!
  assert.equal(game.act('host', { type: 'guess', id: target.id, revision: 1 }, 3000), false)
  assert.equal(game.act('guest', { type: 'guess', id: target.id, revision: 1 }, 3000), true)
  assert.equal(game.act('guest', { type: 'guess', id: target.id, revision: 1 }, 3000), false)
  assert.equal(guest().cards.find(card => card.id === target.id)?.revealed, 'team')
  assert.equal(guest().remaining, 2)
  assert.equal(game.act('guest', { type: 'pass', revision: 2 }, 3000), true)
  assert.equal(guest().remaining, 0)
})

test('hints cost 10 once per card, correct guesses add 50, and wrong guesses cost 50', () => {
  const players = {
    host: { name: 'A', learningLanguage: 'English' as const },
    guest: { name: 'B', learningLanguage: 'French' as const },
  }
  const game = startCodenames('points', players, 0, () => 0)
  const host = () => game.view('host', 3000) as CodenamesView
  const team = host().cards.find(card => card.kind === 'team')!
  const neutral = host().cards.find(card => card.kind === 'neutral')!
  assert.equal(game.act('host', { type: 'hint', id: team.id, revision: 0 }, 3000), true)
  assert.equal(game.progress(3000).score, -10)
  assert.deepEqual(host().hintsUnlocked, [team.id])
  assert.equal(game.act('guest', { type: 'hint', id: team.id, revision: 1 }, 3000), false)
  assert.equal(game.progress(3000).score, -10)
  assert.equal(game.act('host', { type: 'clue', word: 'example', count: 2, revision: 1 }, 3000), true)
  assert.equal(game.act('guest', { type: 'guess', id: team.id, revision: 2 }, 3000), true)
  assert.equal(game.progress(3000).score, 40)
  assert.equal(game.act('guest', { type: 'guess', id: neutral.id, revision: 3 }, 3000), true)
  assert.equal(game.progress(3000).score, -10)
})

test('the clue count grants one optional bonus guess and passing returns control to the giver', () => {
  const players = { host: { name: 'A', learningLanguage: 'English' as const }, guest: { name: 'B', learningLanguage: 'French' as const } }
  const game = startCodenames('bonus', players, 0, () => 0)
  const view = () => game.view('guest', 3000) as CodenamesView
  const targets = (game.view('host', 3000) as CodenamesView).cards.filter(card => card.kind === 'team')
  assert.equal(game.act('host', { type: 'clue', word: 'example', count: 1, revision: 0 }, 3000), true)
  assert.equal(view().remaining, 2)
  assert.equal(view().clueCount, 1)
  assert.equal(view().bonusGuess, false)
  game.act('guest', { type: 'guess', id: targets[0].id, revision: view().revision }, 3000)
  assert.equal(view().remaining, 1)
  assert.equal(view().bonusGuess, true)
  assert.equal(game.act('host', { type: 'clue', word: 'other', count: 1, revision: view().revision }, 3000), false)
  game.act('guest', { type: 'guess', id: targets[1].id, revision: view().revision }, 3000)
  assert.equal(view().remaining, 0)
  assert.equal(view().turnsLeft, 8)
  game.act('host', { type: 'clue', word: 'other', count: 1, revision: view().revision }, 3000)
  game.act('guest', { type: 'pass', revision: view().revision }, 3000)
  assert.equal(view().remaining, 0)
  assert.equal(view().bonusGuess, false)
  assert.equal(game.progress(3000).score, 100)
})

test('codenames uses turns and ends when the assassin is chosen', () => {
  const players = { host: { name: 'A', learningLanguage: 'English' as const }, guest: { name: 'B', learningLanguage: 'French' as const } }
  const game = startCodenames('a', players, 0, () => 0)
  const assassin = (game.view('host', 3000) as CodenamesView).cards.find(card => card.kind === 'assassin')!
  assert.equal(game.act('host', { type: 'clue', word: 'danger', count: 1, revision: 0 }, 3000), true)
  assert.equal(game.act('guest', { type: 'guess', id: assassin.id, revision: 1 }, 3001), true)
  assert.equal(game.results()?.outcome, 'defeat')
  assert.equal((game.results() as CodenamesResults).lossReason, 'assassin')
  assert.equal(game.results()?.score, -50)
  const timed = startCodenames('b', players, 0, () => 0)
  timed.tick(1000000000)
  assert.equal(timed.results(), undefined)
  for (let turn = 0; turn < 9; turn++) {
    const view = timed.view('host', 1000000000) as CodenamesView
    const neutral = view.cards.find(card => card.kind === 'neutral' && !card.revealed)!
    assert.equal(timed.act('host', { type: 'clue', word: 'danger', count: 1, revision: view.revision }, 1000000000), true)
    assert.equal(timed.act('guest', { type: 'guess', id: neutral.id, revision: view.revision + 1 }, 1000000000), true)
  }
  const final = timed.view('guest', 1000000000) as CodenamesView
  assert.equal(final.turnsLeft, 0)
  assert.equal(final.suddenDeath, true)
  const neutral = (timed.view('host', 1000000000) as CodenamesView).cards.find(card => card.kind === 'neutral' && !card.revealed)!
  assert.equal(timed.act('guest', { type: 'guess', id: neutral.id, revision: final.revision }, 1000000000), true)
  assert.equal(timed.results()?.outcome, 'defeat')
  assert.equal((timed.results() as CodenamesResults).lossReason, 'neutral')
})
