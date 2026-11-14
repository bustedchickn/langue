import type { GameProgress, GameResults } from './minigames/contracts'
import type { MatchType } from './matchmaking'

export const languageTags = {
  English: 'en', French: 'fr', Spanish: 'es', German: 'de', Italian: 'it',
  Portuguese: 'pt-BR', Japanese: 'ja', Korean: 'ko', Chinese: 'zh-CN', Russian: 'ru',
} as const
export type Language = keyof typeof languageTags
export const registeredLanguages = Object.keys(languageTags) as Language[]
/** Every registered language has complete public game-flow coverage. */
export type EnabledLanguage = Language
export const languages: readonly EnabledLanguage[] = registeredLanguages
export function isEnabledLanguage(language: unknown): language is EnabledLanguage {
  return languages.includes(language as Language)
}
export const languageNames = {
  English: 'English', French: 'Français', Spanish: 'Español', German: 'Deutsch', Italian: 'Italiano',
  Portuguese: 'Português (Brasil)', Japanese: '日本語', Korean: '한국어', Chinese: '简体中文', Russian: 'Русский',
} satisfies Record<Language, string>
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
  interfaceLanguage?: EnabledLanguage
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

export type ProfileFields = Pick<UserProfile, 'username' | 'displayName' | 'fluentLanguage' | 'learningLanguage' | 'interfaceLanguage'>

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

