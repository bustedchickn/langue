import type { ComponentType } from 'react'
import type { GameConfig, GameProgress, GameResults, Seat } from '../../shared/minigames/contracts'
import { lostInstructions } from '../../shared/minigames/lost-instructions'
import { LostInstructionsView } from './lost-instructions/View'
import { iconCommunicationConfig } from '../../shared/minigames/icon-communication'
import { IconCommunicationResults, IconCommunicationView } from './icon-communication/View'
import { mapNavigatorConfig } from '../../shared/minigames/map-navigator'
import { MapNavigatorView } from './map-navigator/View'

type MinigameClient = {
  config: GameConfig
  View: ComponentType<{ progress: GameProgress; data: unknown; disabled: boolean; send: (action: unknown) => void }>
  Results?: ComponentType<{ result: GameResults; seat: Seat }>
}

export const minigames: ReadonlyMap<string, MinigameClient> = new Map([
  [lostInstructions.id, { config: lostInstructions, View: LostInstructionsView }],
  [iconCommunicationConfig.id, { config: iconCommunicationConfig, View: IconCommunicationView, Results: IconCommunicationResults }],
  [mapNavigatorConfig.id, { config: mapNavigatorConfig, View: MapNavigatorView }],
])
