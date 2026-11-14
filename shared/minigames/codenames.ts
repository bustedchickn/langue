import { languages, type Language } from '../types'
import type { GameConfig, GameResults } from './contracts'
export { wordCards } from './codenames-words'

export const codenamesConfig = {
  id: 'codenames', name: 'Codenames',
  description: 'Give a one-word clue and help your partner find the team’s secret words.',
  minPlayers: 2, maxPlayers: 2,
  scoring: { pointsPerWord: 50, incorrectPenalty: 50 }, supportedLanguages: languages, assets: {},
} satisfies GameConfig
export const codenamesBoardSize = 16
export const codenamesTeamWords = 6

export type WordCard = { id: string; words: Record<Language, string>; definitions: Record<Language, string> }

export type CardKind = 'team' | 'neutral' | 'assassin'
export type CodenamesResults = GameResults & { lossReason?: 'assassin' | 'neutral'; wrongGuesses: number }
export type CodenamesView = {
  role: 'clue-giver' | 'guesser'
  language: Language
  fluentLanguage: Language
  cards: { id: string; revealed?: CardKind; kind?: CardKind }[]
  clue?: string
  remaining: number
  turnsLeft: number
  suddenDeath: boolean
  revision: number
}
