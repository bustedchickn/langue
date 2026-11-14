import { languages, languageTags, type Language } from '../types'
import type { GameConfig, GameResults } from './contracts'
export { wordCards } from './codenames-words'

export const codenamesConfig = {
  id: 'codenames', name: 'Nicknames',
  description: 'Give a one-word clue and help your partner find the team’s secret words.',
  minPlayers: 2, maxPlayers: 2,
  scoring: { pointsPerWord: 50, hintPenalty: 10, incorrectPenalty: 50 }, supportedLanguages: languages, assets: {},
} satisfies GameConfig
export const codenamesBoardSize = 25
export const codenamesTeamWords = 9

export type WordCard = { id: string; words: Record<Language, string>; definitions: Record<Language, string> }

export function normalizeClue(input: string): string | undefined {
  const word = input.trim().normalize('NFC')
  // Japanese prolonged sound marks and combining accents are valid within a word.
  return /^\p{L}[\p{L}\p{M}]*$/u.test(word) && [...word].length <= 30 ? word : undefined
}

export function isBoardWord(clue: string, words: Iterable<string>, language: Language): boolean {
  const key = (word: string) => word.normalize('NFC').toLocaleLowerCase(languageTags[language])
  const value = key(clue)
  for (const word of words) if (key(word) === value) return true
  return false
}

export type CardKind = 'team' | 'neutral' | 'assassin'
export type CodenamesResults = GameResults & { lossReason?: 'assassin' | 'neutral'; hintsUsed: number; wrongGuesses: number }
export type CodenamesView = {
  role: 'clue-giver' | 'guesser'
  language: Language
  fluentLanguage: Language
  cards: { id: string; revealed?: CardKind; kind?: CardKind }[]
  hintsUnlocked: string[]
  clue?: string
  remaining: number
  turnsLeft: number
  suddenDeath: boolean
  revision: number
}
