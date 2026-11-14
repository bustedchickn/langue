import { languages, type UserProfile } from '../shared/types'
import type { MatchType } from '../shared/matchmaking'

export const matchmakingConfig = {
  reciprocalPriorityMs: Number(process.env.MATCH_RECIPROCAL_PRIORITY_MS ?? 10000),
  maxPlayersPerRoom: 2,
  heartbeatTimeoutMs: 15000,
  seatTimeoutMs: 25000,
}

if (!Number.isSafeInteger(matchmakingConfig.reciprocalPriorityMs) || matchmakingConfig.reciprocalPriorityMs < 0) {
  throw new Error('MATCH_RECIPROCAL_PRIORITY_MS must be a nonnegative integer.')
}

type Preferences = Pick<UserProfile, 'fluentLanguage' | 'learningLanguage' | 'assessments'>
export type QueueEntry = { profile: UserProfile; joinedAt: number; lastSeenAt: number }

export function hasLanguages(profile: Preferences) {
  return languages.includes(profile.fluentLanguage) && languages.includes(profile.learningLanguage)
}

export function compatibility(first: Preferences, second: Preferences): MatchType | undefined {
  if (!hasLanguages(first) || !hasLanguages(second)) return
  const speaks = (profile: Preferences, language: UserProfile['learningLanguage']) =>
    profile.assessments?.[language]?.fluent ?? profile.fluentLanguage === language
  if (speaks(first, second.learningLanguage) && speaks(second, first.learningLanguage)) return 'reciprocal'
  if (first.learningLanguage === second.learningLanguage) return 'shared-learning'
}

export function nextPair(entries: readonly QueueEntry[], now: number, delay = matchmakingConfig.reciprocalPriorityMs) {
  let shared: [QueueEntry, QueueEntry] | undefined
  for (const [index, first] of entries.entries()) {
    for (let other = index + 1; other < entries.length; other++) {
      const second = entries[other]
      if (first.profile.uid === second.profile.uid) continue
      const type = compatibility(first.profile, second.profile)
      if (type === 'reciprocal') return { players: [first, second] as const, type }
      if (type === 'shared-learning' && !shared && now - Math.max(first.joinedAt, second.joinedAt) >= delay) {
        shared = [first, second]
      }
    }
  }
  if (shared) return { players: shared, type: 'shared-learning' as const }
}
