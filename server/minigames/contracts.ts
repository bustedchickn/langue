import type { GameConfig, GamePlayers, GameProgress, GameResults, Seat } from '../../shared/minigames/contracts'

export interface ActiveMinigame {
  progress(now: number): GameProgress
  view(seat: Seat, now: number): unknown
  act(seat: Seat, action: unknown, now: number): boolean
  tick(now: number): void
  results(): GameResults | undefined
}

export interface ServerMinigame {
  config: GameConfig
  start(matchId: string, players: GamePlayers, now: number, log: (event: string, data?: object) => void): ActiveMinigame
}
