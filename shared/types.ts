import type { GameProgress, GameResults } from './minigames/contracts'
import type { MatchType } from './matchmaking'

export const languageTags = { English: 'en', French: 'fr', Spanish: 'es' } as const
export type Language = keyof typeof languageTags
export const languages = Object.keys(languageTags) as Language[]
export const communicationLevels = ['Just Starting', 'Beginner', 'Conversational', 'Comfortable', 'Fluent'] as const
export type CommunicationLevel = typeof communicationLevels[number]
export interface LanguageAssessment {
  level: CommunicationLevel
  fluent: boolean
}

export interface UserProfile {
  uid: string
  username: string
  displayName: string
  fluentLanguage: Language
  learningLanguage: Language
  assessments?: Partial<Record<Language, LanguageAssessment>>
  scores?: ProfileScores
  createdAt: number
  lastSeenAt: number
}

export interface GameScore {
  highScore: number
  totalScore: number
  gamesPlayed: number
}

export interface ProfileScores {
  total: number
  gamesPlayed: number
  games: Record<string, GameScore>
}

export interface LeaderboardEntry {
  uid: string
  displayName: string
  score: number
  gamesPlayed: number
}

export interface Leaderboards {
  overall: LeaderboardEntry[]
  games: Record<string, LeaderboardEntry[]>
  mine: ProfileScores
}

export type ProfileFields = Pick<UserProfile, 'username' | 'displayName' | 'fluentLanguage' | 'learningLanguage'>

export interface Friendship {
  members: [string, string]
  from: string
  to: string
  status: 'pending' | 'accepted'
}

export interface Invitation {
  from: string
  to: string
  expiresAt: number
  status: 'pending' | 'accepted' | 'declined'
}

export interface Player {
  name: string
  username: string
  photoURL?: string
  fluentLanguage: Language
  learningLanguage: Language
  communicationLevel?: CommunicationLevel
  connected: boolean
}

export interface ChatMessage {
  sender: string
  text: string
  timestamp: number
}

export interface Session {
  host: Player | null
  guest: Player | null
  gameId: string
  matchType?: MatchType
  phase: 'lobby' | 'confirmation' | 'introduction' | 'game' | 'results'
  ready: { host: boolean; guest: boolean }
  rolesSwapped: boolean
  friendship?: { host: boolean; guest: boolean; accepted: boolean }
  chat: ChatMessage[]
  progress?: GameProgress
  results?: GameResults
}

export interface VoiceConfiguration {
  iceServers: RTCIceServer[]
  /** Milliseconds since Unix epoch, for clients whose clocks differ from the server. */
  serverTime: number
  expiresAt: number | null
  relayConfigured: boolean
}

export type VoiceSignal =
  | { kind: 'state'; joined: boolean }
  | { kind: 'restart'; manual?: boolean }
  | { kind: 'description'; negotiationId: string; description: RTCSessionDescriptionInit }
  | { kind: 'candidate'; negotiationId: string; candidate: RTCIceCandidateInit }

