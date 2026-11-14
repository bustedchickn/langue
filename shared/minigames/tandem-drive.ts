import { languages } from '../types'
import type { Language } from '../types'
import type { GameConfig } from './contracts'
import { wordCards } from './codenames-words'

export const tandemDrive = {
  id: 'tandem-drive', name: 'Tandem Drive',
  description: 'Share the pedals, navigate solid barriers, and unlock gates on the beat.',
  minPlayers: 2, maxPlayers: 2, durationMs: 150000, scoring: { gate: 1 },
  supportedLanguages: languages, assets: {},
} satisfies GameConfig

export const laneX = [-180, -60, 60, 180] as const
const gateWordIds = [
  ['apple', 'bird', 'book', 'key'],
  ['moon', 'tree', 'boat', 'star'],
  ['flower', 'clock', 'fish', 'bread'],
  ['house', 'sun', 'river', 'door'],
] as const
const gateWordCards = new Map(wordCards.map(card => [card.id, card]))
export function gateWordsFor(stage: number, language: Language): string[] {
  return gateWordIds[Math.min(stage, gateWordIds.length - 1)].map(id => gateWordCards.get(id)!.words[language])
}
export const gateDistance = 680
export const stages = 4
export const beatMs = 850
export const switchChancePercent = 30
export const switchDistance = 2 * gateDistance + 108
export const releaseRange = 180
export const releaseDuration = 4500

export type DriveMap = {
  id: string
  name: string
  subtitle: string
  background: string
  road: string
  grid: string
  leftRail: string
  rightRail: string
  accent: string
  gate: string
  hazard: string
}

export const driveMaps: readonly DriveMap[] = [
  { id: 'neon-yard', name: 'Neon Yard', subtitle: 'A clear training route', background: '#21172e', road: '#302240', grid: 'rgba(255, 255, 255, 0.09)', leftRail: '#fbf3b9', rightRail: '#8b5cf6', accent: '#f26a8d', gate: '#b7b1f2', hazard: '#b7b1f2' },
  { id: 'ember-canyon', name: 'Ember Canyon', subtitle: 'Watch the narrow turns', background: '#2b1929', road: '#382034', grid: 'rgba(255, 207, 219, 0.12)', leftRail: '#f9c18a', rightRail: '#8b5cf6', accent: '#fbf3b9', gate: '#f8b1d4', hazard: '#ffdccc' },
  { id: 'frost-station', name: 'Frost Station', subtitle: 'Keep your callouts crisp', background: '#171f38', road: '#25344c', grid: 'rgba(199, 239, 255, 0.12)', leftRail: '#fbf3b9', rightRail: '#8b5cf6', accent: '#f26a8d', gate: '#b7b1f2', hazard: '#b7b1f2' },
] as const

export type Hazard = { x: number; y: number; w: number; h: number; shape: 'crate' | 'drum' | 'rail'; vis: 'P1_ONLY' | 'P2_ONLY' | 'BOTH'; label: string }
export type DriveView = {
  x: number; angle: number; distance: number; stage: number; hull: number; hazards: Hazard[];
  map: DriveMap
  language: Language
  side: 'left' | 'right'; left: boolean; right: boolean;
  swapped: boolean; switchAhead: boolean; message: string; gateKind: 'lane' | 'cycle'
  unlockedUntil: number; serverNow: number; impact: number; blocked: boolean
} & ({ role: 'navigation'; gate?: number } | { role: 'cadence'; beatStartsAt: number; openBeat: number })

