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

export type Hazard = { x: number; y: number; w: number; h: number; shape: 'crate' | 'drum' | 'rail'; vis: 'P1_ONLY' | 'P2_ONLY' | 'BOTH'; label: string }
export type DriveView = {
  x: number; angle: number; distance: number; stage: number; hull: number; hazards: Hazard[];
  side: 'left' | 'right'; left: boolean; right: boolean;
  swapped: boolean; switchAhead: boolean; message: string; gateKind: 'lane' | 'cycle'
  unlockedUntil: number; serverNow: number; impact: number; blocked: boolean
} & ({ role: 'navigation'; gate?: number } | { role: 'cadence'; beatStartsAt: number; openBeat: number })

