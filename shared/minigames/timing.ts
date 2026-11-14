import type { CommunicationLevel, LanguageAssessment } from '../types'
import type { GamePlayers } from './contracts'

export const practiceTimeMultipliers: Record<CommunicationLevel, number> = {
  'Just Starting': 2, Beginner: 1.5, Conversational: 1.25, Comfortable: 1.1, Fluent: 1,
}

export function assessmentLevel(assessment?: LanguageAssessment): CommunicationLevel | undefined {
  return assessment?.fluent ? 'Fluent' : assessment?.level
}

/** Both players share a clock, so use the allowance of the less experienced player. */
export function teamTimeMultiplier(levels: readonly (CommunicationLevel | undefined)[]) {
  return Math.max(1, ...levels.map(level => level ? practiceTimeMultipliers[level] ?? 1 : 1))
}

export function gameTimeMultiplier(players: GamePlayers) {
  return teamTimeMultiplier([players.host.communicationLevel, players.guest.communicationLevel])
}

export function practiceDuration(baseMs: number, multiplier: number) {
  return Math.round(baseMs * multiplier)
}

export function durationLabel(milliseconds: number) {
  const seconds = Math.round(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return minutes ? `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}${remainder ? ` ${remainder} seconds` : ''}` : `${seconds} seconds`
}
