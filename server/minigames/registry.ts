import { lostInstructionsServer } from './lost-instructions/game'
import type { ServerMinigame } from './contracts'

export const defaultMinigame = lostInstructionsServer.config.id
export const minigames: ReadonlyMap<string, ServerMinigame> = new Map([
  [defaultMinigame, lostInstructionsServer],
])
