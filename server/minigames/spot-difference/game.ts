import { randomInt } from 'node:crypto'
import { gameTimeMultiplier, practiceDuration } from '../../../shared/minigames/timing'
import type { ActiveMinigame, ServerMinigame } from '../contracts'
import type { GamePlayers, Seat } from '../../../shared/minigames/contracts'
import { sceneObjects, spotDifferenceConfig as config, spotLanguage, type SceneKind, type SceneObject, type SpotDifferenceResults, type SpotDifferenceView } from '../../../shared/minigames/spot-difference'

function sceneFor(seat: Seat, objects: SceneObject[]): SceneObject[] {
  return objects.map(object => {
    if (seat === 'host' && object.id === 'plant') return { ...object, name: 'Cactus', emoji: '🌵', color: '#89E7E9' }
    if (seat === 'host' && object.id === 'clock') return { ...object, emoji: '🕘' }
    if (seat === 'guest' && object.id === 'lamp') return { ...object, name: 'Candle', emoji: '🕯️', color: '#FDB7EA' }
    if (seat === 'guest' && object.id === 'cat') return { ...object, name: 'Dog', emoji: '🐕' }
    if (seat === 'guest' && object.id === 'book') return { ...object, emoji: '📕', color: '#F26A8D' }
    return { ...object }
  })
}

export function startSpotDifference(matchId: string, players: GamePlayers, now: number, gameConfig = config, pick = randomInt): ActiveMinigame {
  const timeMultiplier = gameTimeMultiplier(players)
  const startsAt = now + gameConfig.countdownMs!
  const endsAt = startsAt + practiceDuration(gameConfig.durationMs!, timeMultiplier)
  let found: string[] = []; let incorrectGuesses = 0; let feedback: SpotDifferenceView['feedback']; let result: SpotDifferenceResults | undefined
  const sceneKinds: SceneKind[] = ['peach', 'lilac', 'aqua', 'lemon', 'rose']
  const sceneKind = sceneKinds[pick(sceneKinds.length)]
  const differencePool = ['plant', 'clock', 'lamp', 'cat', 'book']
  const shuffle = <T,>(items: T[]) => items.map(item => ({ item, sort: pick(1_000_000) })).sort((a, b) => a.sort - b.sort).map(({ item }) => item)
  const selectedDifferenceIds = shuffle(differencePool).slice(0, 3)
  const decoys = sceneObjects.filter(object => !differencePool.includes(object.id))
  const boardObjects = [...selectedDifferenceIds, ...shuffle(decoys.map(object => object.id)).slice(0, 2)]
    .map(id => sceneObjects.find(object => object.id === id)!)
  function finish(outcome: SpotDifferenceResults['outcome'], time: number, endedEarly = false) { result = { gameId: config.id, outcome, completed: found.length, attempted: time < startsAt ? 0 : Math.max(1, found.length + 1), elapsedMs: Math.max(0, time - startsAt), score: found.length * config.scoring.pointsPerDifference - incorrectGuesses * config.scoring.wrongGuessPenalty, players: [players.host.name, players.guest.name], found: found.length, incorrectGuesses, ...(endedEarly ? { endedEarly: true } : {}) } }
  function tick(time: number) { if (!result && time >= endsAt) finish('defeat', endsAt) }
  return {
    tick,
    finishEarly(time) { tick(time); if (!result) finish('defeat', time, true) },
    progress: time => ({ gameId: config.id, matchId, round: 1, completed: found.length, score: found.length * config.scoring.pointsPerDifference, startsAt, endsAt, serverNow: time, timeMultiplier }),
    view(seat): SpotDifferenceView {
      const language = players[seat].learningLanguage
      return { scene: seat === 'host' ? 'player-one' : 'player-two', sceneKind, language, roundName: 'Find the Difference', objects: sceneFor(seat, boardObjects), found, totalDifferences: selectedDifferenceIds.length, incorrectGuesses, feedback, ...spotLanguage(language) }
    },
    act(seat, payload, time) {
      tick(time); if (result || time < startsAt || !payload || typeof payload !== 'object') return false
      const action = payload as { type?: string; objectId?: unknown }
      if (action.type === 'reset') { found = []; incorrectGuesses = 0; feedback = undefined; result = undefined; return true }
      if (action.type === 'finish') { finish(found.length === selectedDifferenceIds.length ? 'victory' : 'defeat', time); feedback = found.length === selectedDifferenceIds.length ? 'complete' : 'incomplete'; return true }
      if (action.type !== 'select' || typeof action.objectId !== 'string') return false
      if (found.includes(action.objectId)) return false
      if (selectedDifferenceIds.includes(action.objectId)) { found = [...found, action.objectId]; feedback = 'correct'; if (found.length === selectedDifferenceIds.length) { feedback = 'complete'; finish('victory', time) } }
      else { incorrectGuesses++; feedback = 'incorrect' }
      return true
    },
    results: () => result,
  }
}

export const spotDifferenceServer: ServerMinigame = { config, start: (matchId, players, now) => startSpotDifference(matchId, players, now) }
