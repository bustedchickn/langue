import type { ComponentType } from 'react'
import type { GameConfig, GameProgress } from '../../shared/minigames/contracts'
import { lostInstructions } from '../../shared/minigames/lost-instructions'
import { LostInstructionsView } from './lost-instructions/View'

type MinigameClient = {
  config: GameConfig
  View: ComponentType<{ progress: GameProgress; data: unknown; disabled: boolean; send: (action: unknown) => void }>
}

export const minigames: ReadonlyMap<string, MinigameClient> = new Map([
  [lostInstructions.id, { config: lostInstructions, View: LostInstructionsView }],
])
