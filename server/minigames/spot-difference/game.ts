import type { ActiveMinigame, ServerMinigame } from '../contracts'
import type { GamePlayers, Seat } from '../../../shared/minigames/contracts'
import { differenceIds, sceneObjects, spotDifferenceConfig as config, spotLanguage, type SceneObject, type SpotDifferenceResults, type SpotDifferenceView } from '../../../shared/minigames/spot-difference'

function sceneFor(seat: Seat): SceneObject[] {
  return sceneObjects.map(object => {
    if (seat === 'host' && object.id === 'plant') return { ...object, emoji: '🌵', color: '#89E7E9' }
    if (seat === 'host' && object.id === 'clock') return { ...object, emoji: '🕘' }
    if (seat === 'guest' && object.id === 'lamp') return { ...object, emoji: '🕯️', color: '#FDB7EA' }
    if (seat === 'guest' && object.id === 'cat') return { ...object, emoji: '🐕' }
    if (seat === 'guest' && object.id === 'book') return { ...object, emoji: '📕', color: '#F26A8D' }
    return { ...object }
  })
}

export function startSpotDifference(matchId: string, players: GamePlayers, now: number, gameConfig = config): ActiveMinigame {
  const startsAt = now + gameConfig.countdownMs!
  const endsAt = startsAt + gameConfig.durationMs!
  let found: string[] = []; let incorrectGuesses = 0; let feedback: SpotDifferenceView['feedback']; let result: SpotDifferenceResults | undefined
  const language = players.host.learningLanguage; const translated = spotLanguage(language)
  function finish(outcome: SpotDifferenceResults['outcome'], time: number) { result = { gameId: config.id, outcome, completed: found.length, attempted: Math.max(1, found.length + 1), elapsedMs: Math.max(0, time - startsAt), score: found.length * config.scoring.pointsPerDifference - incorrectGuesses * config.scoring.wrongGuessPenalty, players: [players.host.name, players.guest.name], found: found.length, incorrectGuesses } }
  function tick(time: number) { if (!result && time >= endsAt) finish('defeat', endsAt) }
  return {
    tick,
    progress: time => ({ gameId: config.id, matchId, round: 1, completed: found.length, score: found.length * config.scoring.pointsPerDifference, startsAt, endsAt, serverNow: time }),
    view(seat): SpotDifferenceView { return { scene: seat === 'host' ? 'player-one' : 'player-two', language, roundName: 'Cozy Art Studio', objects: sceneFor(seat), found, totalDifferences: differenceIds.length, incorrectGuesses, feedback, ...translated } },
    act(seat, payload, time) {
      tick(time); if (result || time < startsAt || !payload || typeof payload !== 'object') return false
      const action = payload as { type?: string; objectId?: unknown }
      if (action.type === 'reset') { found = []; incorrectGuesses = 0; feedback = undefined; result = undefined; return true }
      if (action.type === 'finish') { finish(found.length === differenceIds.length ? 'victory' : 'defeat', time); feedback = found.length === differenceIds.length ? 'complete' : 'incomplete'; return true }
      if (action.type !== 'select' || typeof action.objectId !== 'string') return false
      if (found.includes(action.objectId)) return false
      if (differenceIds.includes(action.objectId)) { found = [...found, action.objectId]; feedback = 'correct'; if (found.length === differenceIds.length) { feedback = 'complete'; finish('victory', time) } }
      else { incorrectGuesses++; feedback = 'incorrect' }
      return true
    },
    results: () => result,
  }
}

export const spotDifferenceServer: ServerMinigame = { config, start: (matchId, players, now) => startSpotDifference(matchId, players, now) }
