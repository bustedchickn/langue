import type { GameProgress, GameResults } from './minigames/contracts'
import type { MatchType } from './matchmaking'

export const languageTags = { English: 'en', French: 'fr', Spanish: 'es' } as const
export type Language = keyof typeof languageTags
export const languages = Object.keys(languageTags) as Language[]

export interface UserProfile {
  uid: string
  username: string
  displayName: string
  fluentLanguage: Language
  learningLanguage: Language
  createdAt: number
  lastSeenAt: number
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
  fluentLanguage: Language
  learningLanguage: Language
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
  phase: 'lobby' | 'game' | 'results'
  chat: ChatMessage[]
  progress?: GameProgress
  results?: GameResults
}

export type VoiceSignal =
  | { kind: 'state'; joined: boolean }
  | { kind: 'description'; description: RTCSessionDescriptionInit }
  | { kind: 'candidate'; candidate: RTCIceCandidateInit }

