import { languages } from '../types'
import type { GameConfig } from './contracts'

export const tandemDrive = {
  id: 'tandem-drive', name: 'Tandem Drive',
  description: 'Share the pedals, navigate solid barriers, and unlock gates on the beat.',
  minPlayers: 2, maxPlayers: 2, durationMs: 150000, scoring: { gate: 1 },
  supportedLanguages: languages, assets: {},
} satisfies GameConfig

export const lanes = ['ALPHA', 'BRAVO', 'DELTA', 'OMEGA'] as const
export const laneX = [-180, -60, 60, 180] as const
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
  { id: 'neon-yard', name: 'Neon Yard', subtitle: 'A clear training route', background: '#020617', road: '#111622', grid: 'rgba(148, 163, 184, 0.07)', leftRail: '#f59e0b', rightRail: '#06b6d4', accent: '#34d399', gate: '#94a3b8', hazard: '#94a3b8' },
  { id: 'ember-canyon', name: 'Ember Canyon', subtitle: 'Watch the narrow turns', background: '#1c1010', road: '#261719', grid: 'rgba(251, 146, 60, 0.12)', leftRail: '#fb923c', rightRail: '#f43f5e', accent: '#fbbf24', gate: '#fdba74', hazard: '#fda4af' },
  { id: 'frost-station', name: 'Frost Station', subtitle: 'Keep your callouts crisp', background: '#071521', road: '#0c2430', grid: 'rgba(125, 211, 252, 0.12)', leftRail: '#38bdf8', rightRail: '#a78bfa', accent: '#67e8f9', gate: '#bae6fd', hazard: '#c4b5fd' },
] as const

export type Hazard = { x: number; y: number; w: number; h: number; shape: 'crate' | 'drum' | 'rail'; vis: 'P1_ONLY' | 'P2_ONLY' | 'BOTH'; label: string }
export type DriveView = {
  x: number; angle: number; distance: number; stage: number; hull: number; hazards: Hazard[];
  map: DriveMap
  side: 'left' | 'right'; left: boolean; right: boolean;
  swapped: boolean; switchAhead: boolean; message: string; gateKind: 'lane' | 'cycle'
  unlockedUntil: number; serverNow: number; impact: number; blocked: boolean
} & ({ role: 'navigation'; gate?: number } | { role: 'cadence'; beatStartsAt: number; openBeat: number })

