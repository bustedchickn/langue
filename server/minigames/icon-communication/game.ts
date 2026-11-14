import { randomInt } from 'node:crypto'
import type { GamePlayers } from '../../../shared/minigames/contracts'
import { gameIcons } from '../../../shared/minigames/icons'
import { iconCommunicationConfig, type IconResults, type IconView } from '../../../shared/minigames/icon-communication'
import type { ActiveMinigame, ServerMinigame } from '../contracts'
import { gameTimeMultiplier, practiceDuration } from '../../../shared/minigames/timing'

export function startIconCommunication(
  matchId: string, players: GamePlayers, now: number,
  config = iconCommunicationConfig, pick = randomInt,
): ActiveMinigame {
  const size = config.gridRows * config.gridColumns
  const timeMultiplier = gameTimeMultiplier(players)
  if (!Number.isSafeInteger(size) || size < 1 || size > gameIcons.size) throw new Error('Invalid icon grid size.')
  let grid: string[] = []
  let startsAt = now
  let endsAt = now
  let target: string | undefined
  let previous: string | undefined
  let revision = 0
  let completed = 0
  let incorrectGuesses = 0
  let guessed = new Set<string>()
  let feedback: IconView['feedback']
  let result: IconResults | undefined
  const seen = new Set<string>()
  const language = players.host.learningLanguage

  function prepare(time: number) {
    if (!grid.length || config.randomizeGridEachRound) {
      const pool = [...gameIcons.keys()]
      grid = Array.from({ length: size }, () => pool.splice(pick(pool.length), 1)[0])
    }
    target = undefined
    guessed = new Set()
    const { minimumRevealDelayMs: min, maximumRevealDelayMs: max } = config
    startsAt = time + min + pick(max - min + 1)
    endsAt = startsAt + practiceDuration(completed === 0 ? config.firstRoundDurationMs : config.roundDurationMs, timeMultiplier)
  }

  function finish(outcome: IconResults['outcome'], time: number, endedEarly = false) {
    result = {
      gameId: config.id, outcome, completed,
      attempted: outcome === 'victory' || time < startsAt ? completed : completed + 1, incorrectGuesses,
      elapsedMs: Math.max(0, time - now), score: completed * config.scoring.pointsPerCorrectGuess,
      players: [players.host.name, players.guest.name], vocabulary: [...seen],
      learningLanguages: { host: players.host.learningLanguage, guest: players.guest.learningLanguage },
      ...(endedEarly ? { endedEarly: true } : {}),
    }
  }

  function tick(time: number) {
    if (result || time < startsAt) return
    if (!target) {
      const candidates = grid.length > 1 ? grid.filter(icon => icon !== previous) : grid
      target = candidates[pick(candidates.length)]
      seen.add(target)
      feedback = undefined
    }
    if (time >= endsAt) finish('defeat', endsAt)
  }

  prepare(now)
  return {
    progress: time => ({
      gameId: config.id, matchId, round: completed + 1, rounds: config.rounds, completed, score: completed * config.scoring.pointsPerCorrectGuess,
      startsAt, endsAt, serverNow: time, hidePreparationTimer: true, timeMultiplier,
    }),
    view(seat): IconView {
      const common = { language, revision, feedback }
      if (seat === 'host') return { ...common, role: 'selector', grid, revealed: !!target, guessed: [...guessed] }
      return target ? { ...common, role: 'describer', target } : { ...common, role: 'describer' }
    },
    tick,
    finishEarly(time) { tick(time); if (!result) finish('defeat', time, true) },
    results: () => result,
    act(seat, action, time) {
      tick(time)
      if (result || seat !== 'host' || !target || !action || typeof action !== 'object') return false
      const candidate = action as Record<string, unknown>
      const { icon } = candidate
      if (candidate.type !== 'guess' || candidate.round !== completed + 1 || candidate.revision !== revision ||
          typeof icon !== 'string' || !grid.includes(icon) || (!config.allowRepeatedGuesses && guessed.has(icon))) return false
      revision++
      if (icon === target) {
        previous = target
        completed++
        feedback = 'correct'
        if (completed >= (config.rounds ?? Number.POSITIVE_INFINITY)) {
          finish('victory', time)
        } else {
          prepare(time)
        }
      } else {
        incorrectGuesses++
        guessed.add(icon)
        feedback = 'incorrect'
        endsAt = Math.max(time, endsAt - config.incorrectGuessPenaltyMs)
        tick(time)
      }
      return true
    },
  }
}

export const iconCommunicationServer: ServerMinigame = {
  config: iconCommunicationConfig,
  start: (matchId, players, now) => startIconCommunication(matchId, players, now),
}

