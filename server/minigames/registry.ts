import { lostInstructionsServer } from './lost-instructions/game'
import type { ServerMinigame } from './contracts'
import { iconCommunicationServer } from './icon-communication/game'

export const defaultMinigame = lostInstructionsServer.config.id
export const minigames: ReadonlyMap<string, ServerMinigame> = new Map([
  [defaultMinigame, lostInstructionsServer],
  [iconCommunicationServer.config.id, iconCommunicationServer],
])
