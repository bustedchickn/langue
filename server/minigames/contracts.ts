import type { GameConfig, GamePlayers, GameProgress, GameResults, Seat } from '../../shared/minigames/contracts'

export interface ActiveMinigame {
  updateIntervalMs?: number
  suspend?(now: number): void
  progress(now: number): GameProgress
  view(seat: Seat, now: number): unknown
  act(seat: Seat, action: unknown, now: number): boolean
  tick(now: number): void
  finishEarly(now: number): void
  results(): GameResults | undefined
}

export interface ServerMinigame {
  config: GameConfig
  start(matchId: string, players: GamePlayers, now: number, log: (event: string, data?: object) => void): ActiveMinigame
}
