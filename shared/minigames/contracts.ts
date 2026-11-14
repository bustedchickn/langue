import type { CommunicationLevel, Language } from '../types'

export type Seat = 'host' | 'guest'
export type GamePlayers = Record<Seat, { name: string; learningLanguage: Language; fluentLanguage?: Language; communicationLevel?: CommunicationLevel }>

export interface GameConfig {
  id: string
  name: string
  description: string
  minPlayers: number
  maxPlayers: number
  durationMs?: number
  rounds?: number
  countdownMs?: number
  scoring: Readonly<Record<string, number>>
  supportedLanguages: readonly Language[]
  assets: Readonly<Record<string, string>>
}

export interface GameProgress {
  gameId: string
  matchId: string
  round: number
  rounds?: number
  hidePreparationTimer?: boolean
  untimed?: boolean
  timeMultiplier?: number
  completed: number
  score: number
  startsAt: number
  endsAt: number
  serverNow: number
}

export interface GameResults {
  gameId: string
  outcome: 'victory' | 'defeat'
  completed: number
  attempted: number
  elapsedMs: number
  score: number
  players: [string, string]
  endedEarly?: boolean
}

export interface PrivateGameView {
  gameId: string
  matchId: string
  round: number
  data: unknown
}
