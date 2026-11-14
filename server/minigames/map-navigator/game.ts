import type { ActiveMinigame, ServerMinigame } from '../contracts'
import type { GamePlayers, Seat } from '../../../shared/minigames/contracts'
import { mapNavigatorConfig as config, mapNavigatorGoal, mapNavigatorGrid, mapNavigatorLanguage, mapNavigatorLandmarks, mapNavigatorRoute, mapNavigatorStart, type MapNavigatorResults, type MapNavigatorView, type NavigatorAction, type Point } from '../../../shared/minigames/map-navigator'

function same(a: Point, b: Point) { return a.row === b.row && a.column === b.column }
function clone(point: Point): Point { return { ...point } }

export function startMapNavigator(matchId: string, players: GamePlayers, now: number, gameConfig = config): ActiveMinigame {
  let startsAt = now + gameConfig.countdownMs!
  let endsAt = startsAt + gameConfig.durationMs!
  let position = clone(mapNavigatorStart)
  let direction: MapNavigatorView['direction'] = 'down'
  let moves = 0
  let wrongTurns = 0
  let checkpoints = 0
  const waypoints = [mapNavigatorRoute[2], mapNavigatorRoute[6]]
  let feedback: MapNavigatorView['feedback']
  let result: MapNavigatorResults | undefined
  const language = players.host.learningLanguage
  const translated = mapNavigatorLanguage(language)

  function finish(outcome: MapNavigatorResults['outcome'], time: number, completedRoute: boolean) {
    result = { gameId: gameConfig.id, outcome, completed: completedRoute ? 1 : 0, attempted: 1, elapsedMs: Math.max(0, time - startsAt), score: completedRoute ? Math.max(0, gameConfig.scoring.pointsPerRoute - wrongTurns * gameConfig.scoring.wrongTurnPenalty) : 0, players: [players.host.name, players.guest.name], moves, wrongTurns, completedRoute }
  }
  function tick(time: number) { if (!result && time >= endsAt) finish('defeat', endsAt, false) }
  function reset(time: number) {
    startsAt = time + gameConfig.countdownMs!
    endsAt = startsAt + gameConfig.durationMs!
    position = clone(mapNavigatorStart); direction = 'down'; moves = 0; wrongTurns = 0; checkpoints = 0; feedback = undefined; result = undefined
  }

  return {
    tick,
    progress: time => ({ gameId: config.id, matchId, round: 1, completed: result?.completed ?? 0, score: result?.score ?? 0, startsAt, endsAt, serverNow: time }),
    view(seat): MapNavigatorView {
      return { role: seat === 'host' ? 'navigator' : 'traveler', language, position: clone(position), direction,
        ...(seat === 'host' ? { goal: clone(mapNavigatorGoal), route: mapNavigatorRoute.map(clone), waypoints } : {}),
        moves, wrongTurns, checkpoints, feedback, landmarks: mapNavigatorLandmarks, ...translated }
    },
    act(seat: Seat, payload: unknown, time: number) {
      tick(time)
      if (result || time < startsAt || !payload || typeof payload !== 'object') return false
      const action = payload as NavigatorAction
      if (action.type === 'reset') { if (!['host', 'guest'].includes(seat)) return false; reset(time); return true }
      if (seat !== 'guest' || action.type !== 'move') return false
      const delta = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[action.direction]
      if (!Object.hasOwn({ up: 1, down: 1, left: 1, right: 1 }, action.direction) || !delta) return false
      direction = action.direction
      const previousIndex = mapNavigatorRoute.findIndex(point => same(point, position))
      const next = { row: position.row + delta[0], column: position.column + delta[1] }
      moves++
      if (next.row < 0 || next.row >= mapNavigatorGrid.rows || next.column < 0 || next.column >= mapNavigatorGrid.columns) { wrongTurns++; feedback = 'blocked'; return true }
      position = next
      const nextIndex = mapNavigatorRoute.findIndex(point => same(point, position))
      feedback = nextIndex === previousIndex + 1 ? 'moved' : 'wrong'
      if (feedback === 'wrong') wrongTurns++
      if (checkpoints < waypoints.length && same(position, waypoints[checkpoints])) {
        checkpoints++
        feedback = 'checkpoint'
      }
      if (checkpoints === waypoints.length && same(position, mapNavigatorGoal)) finish('victory', time, true)
      return true
    },
    results: () => result,
  }
}

export const mapNavigatorServer: ServerMinigame = { config, start: (matchId, players, now, log) => startMapNavigator(matchId, players, now, config) }
