import { randomInt } from 'node:crypto'
import { gameTimeMultiplier, practiceDuration } from '../../../shared/minigames/timing'
import type { ActiveMinigame, ServerMinigame } from '../contracts'
import type { GamePlayers, Seat } from '../../../shared/minigames/contracts'
import { mapNavigatorConfig as config, mapNavigatorGrid, mapNavigatorLanguage, type MapNavigatorResults, type MapNavigatorView, type NavigatorAction, type Point } from '../../../shared/minigames/map-navigator'

function same(a: Point, b: Point) { return a.row === b.row && a.column === b.column }
function clone(point: Point): Point { return { ...point } }

const corners: Point[] = [
  { row: 0, column: 0 }, { row: 0, column: mapNavigatorGrid.columns - 1 },
  { row: mapNavigatorGrid.rows - 1, column: 0 },
  { row: mapNavigatorGrid.rows - 1, column: mapNavigatorGrid.columns - 1 },
]
let previousStart = -1
let previousGoal = -1

function createRandomRoute(pick = randomInt) {
  const destinations = Array.from({ length: mapNavigatorGrid.rows * mapNavigatorGrid.columns }, (_, index) =>
    ({ row: Math.floor(index / mapNavigatorGrid.columns), column: index % mapNavigatorGrid.columns }))
    .filter(point => point.row * mapNavigatorGrid.columns + point.column !== previousGoal)
  const goal = destinations[pick(destinations.length)]
  previousGoal = goal.row * mapNavigatorGrid.columns + goal.column
  const startingCorners = corners.map((point, index) => ({ point, index }))
    .filter(({ point, index }) => index !== previousStart &&
      Math.abs(point.row - goal.row) + Math.abs(point.column - goal.column) >= 4)
  const chosenStart = startingCorners[pick(startingCorners.length)]
  const start = chosenStart.point
  previousStart = chosenStart.index
  const route = [clone(start)]
  let row = start.row
  let column = start.column
  while (row !== goal.row || column !== goal.column) {
    const vertical = Math.abs(goal.row - row)
    const horizontal = Math.abs(goal.column - column)
    if (vertical > 0 && (horizontal === 0 || pick(vertical + horizontal) < vertical)) row += Math.sign(goal.row - row)
    else column += Math.sign(goal.column - column)
    route.push({ row, column })
  }
  return { route, start, goal }
}

function checkpointsOn(route: Point[]) {
  const steps = route.length - 1
  return [route[Math.floor(steps / 3)], route[Math.floor(steps * 2 / 3)]]
}

export function startMapNavigator(matchId: string, players: GamePlayers, now: number, gameConfig = config): ActiveMinigame {
  const timeMultiplier = gameTimeMultiplier(players)
  const durationMs = practiceDuration(gameConfig.durationMs!, timeMultiplier)
  let startsAt = now + gameConfig.countdownMs!
  let endsAt = startsAt + durationMs
  let layout = createRandomRoute()
  let position = clone(layout.start)
  let direction: MapNavigatorView['direction'] = 'down'
  let moves = 0
  let wrongTurns = 0
  let checkpoints = 0
  let route = layout.route
  let waypoints = checkpointsOn(route)
  let feedback: MapNavigatorView['feedback']
  let result: MapNavigatorResults | undefined
  const language = players.host.learningLanguage
  const translated = mapNavigatorLanguage(language)

  function finish(outcome: MapNavigatorResults['outcome'], time: number, completedRoute: boolean, endedEarly = false) {
    result = { gameId: gameConfig.id, outcome, completed: completedRoute ? 1 : 0, attempted: time < startsAt ? 0 : 1, elapsedMs: Math.max(0, time - startsAt), score: completedRoute ? Math.max(0, gameConfig.scoring.pointsPerRoute - wrongTurns * gameConfig.scoring.wrongTurnPenalty) : 0, players: [players.host.name, players.guest.name], moves, wrongTurns, completedRoute, ...(endedEarly ? { endedEarly: true } : {}) }
  }
  function tick(time: number) { if (!result && time >= endsAt) finish('defeat', endsAt, false) }
  function reset(time: number) {
    startsAt = time + gameConfig.countdownMs!
    endsAt = startsAt + durationMs
    layout = createRandomRoute(); route = layout.route; waypoints = checkpointsOn(route)
    position = clone(layout.start); direction = 'down'; moves = 0; wrongTurns = 0; checkpoints = 0; feedback = undefined; result = undefined
  }

  return {
    tick,
    finishEarly(time) { tick(time); if (!result) finish('defeat', time, false, true) },
    progress: time => ({ gameId: config.id, matchId, round: 1, completed: result?.completed ?? 0, score: result?.score ?? 0, startsAt, endsAt, serverNow: time, timeMultiplier }),
    view(seat): MapNavigatorView {
      return { role: seat === 'host' ? 'navigator' : 'traveler', language, position: clone(position), direction,
        ...(seat === 'host' ? { goal: clone(layout.goal), route: route.map(clone), waypoints: waypoints.map(clone) } : {}),
        moves, wrongTurns, checkpoints, feedback, ...translated }
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
      const previousIndex = route.findIndex(point => same(point, position))
      const next = { row: position.row + delta[0], column: position.column + delta[1] }
      moves++
      if (next.row < 0 || next.row >= mapNavigatorGrid.rows || next.column < 0 || next.column >= mapNavigatorGrid.columns) { wrongTurns++; feedback = 'blocked'; return true }
      position = next
      const nextIndex = route.findIndex(point => same(point, position))
      feedback = nextIndex === previousIndex + 1 ? 'moved' : 'wrong'
      if (feedback === 'wrong') wrongTurns++
      if (checkpoints < waypoints.length && same(position, waypoints[checkpoints])) {
        checkpoints++
        feedback = 'checkpoint'
      }
      if (checkpoints === waypoints.length && same(position, layout.goal)) finish('victory', time, true)
      return true
    },
    results: () => result,
  }
}

export const mapNavigatorServer: ServerMinigame = { config, start: (matchId, players, now, log) => startMapNavigator(matchId, players, now, config) }
