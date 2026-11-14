import { languages } from '../types'
import type { Language } from '../types'
import type { GameConfig, GameResults, Seat } from './contracts'

export const iconCommunicationConfig = {
  id: 'icon-communication',
  name: 'Icon Communication',
  description: 'Describe a mystery icon so your partner can pick it before time runs out.',
  minPlayers: 2,
  maxPlayers: 2,
  gridRows: 3,
  gridColumns: 3,
  minimumRevealDelayMs: 3000,
  maximumRevealDelayMs: 10000,
  roundDurationMs: 10000,
  incorrectGuessPenaltyMs: 2000,
  scoring: { pointsPerCorrectGuess: 1 },
  allowRepeatedGuesses: true,
  randomizeGridEachRound: true,
  supportedLanguages: languages,
  assets: {},
} satisfies GameConfig & {
  gridRows: number; gridColumns: number
  minimumRevealDelayMs: number; maximumRevealDelayMs: number; roundDurationMs: number
  incorrectGuessPenaltyMs: number; allowRepeatedGuesses: boolean; randomizeGridEachRound: boolean
}

type RoundView = {
  language: Language
  feedback?: 'correct' | 'incorrect'
  revision: number
}

export type IconView = RoundView & (
  | { role: 'selector'; grid: string[]; revealed: boolean; guessed: string[] }
  | { role: 'describer'; target?: string }
)

export type IconResults = GameResults & {
  incorrectGuesses: number
  vocabulary: string[]
  learningLanguages: Record<Seat, Language>
}
