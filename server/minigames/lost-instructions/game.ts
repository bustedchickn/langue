import type { ActiveMinigame, ServerMinigame } from '../contracts'
import type { GamePlayers, GameResults, Seat } from '../../../shared/minigames/contracts'
import { lostInstructions, type LostView } from '../../../shared/minigames/lost-instructions'
import { generatePuzzles, type Puzzle } from './puzzles'
import type { Language } from '../../../shared/types'
import { gameTimeMultiplier, practiceDuration } from '../../../shared/minigames/timing'

export function translate(text: Puzzle['instructions'], language: string, warn: (message: string) => void): { text: string; language: Language } {
  if (Object.hasOwn(text, language)) {
    const value = text[language as keyof typeof text]
    if (value) return { text: value, language: language as Language }
  }
  warn('Missing Lost Instructions translation for ' + language + '; using English.')
  return { text: text.English, language: 'English' }
}

export function startLostInstructions(
  matchId: string, players: GamePlayers, now: number, selected: readonly Puzzle[],
  config = lostInstructions,
  log: (event: string, data?: object) => void = () => {},
  warn: (message: string) => void = () => {},
): ActiveMinigame {
  if (!selected.length) throw new Error('Lost Instructions requires at least one puzzle.')
  const startsAt = now + config.countdownMs
  const timeMultiplier = gameTimeMultiplier(players)
  const endsAt = startsAt + practiceDuration(config.durationMs, timeMultiplier)
  let completed = 0
  let score = 0
  let revision = 0
  let slots = [...selected[0].initial]
  let feedback: 'incorrect' | undefined
  let result: GameResults | undefined
  const clues = selected.map(puzzle => ({
    instruction: translate(puzzle.instructions, players.host.learningLanguage, warn),
    hint: puzzle.hints && translate(puzzle.hints, players.host.learningLanguage, warn),
  }))

  log('roles-assigned', { host: 'instructor', guest: 'operator' })

  function finish(outcome: GameResults['outcome'], time: number, endedEarly = false) {
    result = {
      gameId: config.id, outcome, completed, attempted: endedEarly && time < startsAt ? 0 : Math.min(completed + 1, selected.length),
      elapsedMs: Math.max(0, time - startsAt), score, players: [players.host.name, players.guest.name],
      ...(endedEarly ? { endedEarly: true } : {}),
    }
    log('game-completed', { outcome, completed, score })
  }

  function tick(time: number) {
    if (!result && time >= endsAt) finish('defeat', endsAt)
  }

  return {
    tick,
    finishEarly(time) { tick(time); if (!result) finish('defeat', time, true) },
    results: () => result,
    progress: time => ({
      gameId: config.id, matchId, round: Math.min(completed + 1, selected.length), rounds: selected.length,
      completed, score, startsAt, endsAt, serverNow: time, timeMultiplier,
    }),
    view(seat: Seat, time: number): LostView {
      const active = time >= startsAt && !result
      if (seat === 'host') {
        if (!active) return { role: 'instructor' }
        const { instruction, hint } = clues[completed]
        return { role: 'instructor', instruction: instruction.text, language: instruction.language, hint: hint?.text, hintLanguage: hint?.language,
          targetArrangement: selected[completed].solution.map(id => ({ ...selected[completed].objects.find(piece => piece.id === id)! })) }
      }
      if (!active) return { role: 'operator', revision }
      const { objects } = selected[completed]
      return { role: 'operator', slots: slots.map(id => {
        const { shape, color } = objects.find(object => object.id === id)!
        return { id, shape, color }
      }), revision, feedback }
    },
    act(seat, payload, time) {
      tick(time)
      if (result || time < startsAt || seat !== 'guest' || !payload || typeof payload !== 'object') return false
      const { type, piece, slot, round, revision: expected } = payload as Record<string, unknown>
      if (round !== completed + 1 || expected !== revision) return false
      const puzzle = selected[completed]

      if (type === 'move') {
        if (typeof piece !== 'string' || typeof slot !== 'number' ||
            !Number.isInteger(slot) || slot < 0 || slot >= slots.length) return false
        const from = slots.indexOf(piece)
        if (from < 0 || from === slot) return false
        ;[slots[from], slots[slot]] = [slots[slot], slots[from]]
        revision++
        feedback = undefined
        log('operator-move', { round, slot })
        return true
      }

      if (type !== 'submit') return false
      const correct = slots.every((id, index) => id === puzzle.solution[index])
      log('puzzle-validated', { round, correct })
      revision++
      if (!correct) {
        feedback = 'incorrect'
        return true
      }

      completed++
      score += config.scoring.pointsPerPuzzle
      log('round-completed', { round, score })
      if (completed === selected.length) {
        finish('victory', time)
      } else {
        slots = [...selected[completed].initial]
        feedback = undefined
      }
      return true
    },
  }
}

export const lostInstructionsServer: ServerMinigame = {
  config: lostInstructions,
  start: (matchId, players, now, log) => startLostInstructions(
    matchId, players, now, generatePuzzles(lostInstructions.rounds), lostInstructions, log,
    message => { if (process.env.NODE_ENV !== 'production') console.warn(message) },
  ),
}
