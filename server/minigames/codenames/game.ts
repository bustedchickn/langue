import { randomInt } from 'node:crypto'
import type { GamePlayers, Seat } from '../../../shared/minigames/contracts'
import { codenamesBoardSize, codenamesTeamWords, codenamesConfig as config, isBoardWord, normalizeClue, wordCards, type CardKind, type CodenamesResults, type CodenamesView } from '../../../shared/minigames/codenames'
import type { ActiveMinigame, ServerMinigame } from '../contracts'

export function startCodenames(matchId: string, players: GamePlayers, now: number, pick = randomInt): ActiveMinigame {
  const pool = [...wordCards]
  const cards = Array.from({ length: codenamesBoardSize }, () => pool.splice(pick(pool.length), 1)[0])
  const kinds: CardKind[] = [...Array<CardKind>(codenamesTeamWords).fill('team'),
    ...Array<CardKind>(codenamesBoardSize - codenamesTeamWords - 1).fill('neutral'), 'assassin']
  for (let index = kinds.length - 1; index > 0; index--) {
    const next = pick(index + 1)
    ;[kinds[index], kinds[next]] = [kinds[next], kinds[index]]
  }
  const revealed = new Set<string>()
  const hintsUnlocked = new Set<string>()
  const startsAt = now + 3000
  const endsAt = Number.MAX_SAFE_INTEGER
  let clue: string | undefined
  let remaining = 0
  let completed = 0
  let wrongGuesses = 0
  let revision = 0
  let turnsLeft = 9
  let suddenDeath = false
  let result: CodenamesResults | undefined
  const score = () => completed * config.scoring.pointsPerWord -
    hintsUnlocked.size * config.scoring.hintPenalty - wrongGuesses * config.scoring.incorrectPenalty
  function finish(outcome: CodenamesResults['outcome'], time: number, lossReason?: CodenamesResults['lossReason'], endedEarly = false) {
    result = { gameId: config.id, outcome, completed, attempted: revealed.size,
      elapsedMs: Math.max(0, time - startsAt), score: score(), hintsUsed: hintsUnlocked.size, wrongGuesses,
      players: [players.host.name, players.guest.name],
      ...(lossReason ? { lossReason } : {}) }
    if (endedEarly) result.endedEarly = true
  }
  function endTurn() {
    turnsLeft--
    clue = undefined
    remaining = 0
    if (turnsLeft === 0) suddenDeath = true
  }
  return {
    updateIntervalMs: 60000,
    progress: time => ({ gameId: config.id, matchId, round: 1, completed, score: score(), startsAt, endsAt, serverNow: time, untimed: true }),
    view(seat): CodenamesView {
      return {
        role: seat === 'host' ? 'clue-giver' : 'guesser', language: players[seat].learningLanguage,
        fluentLanguage: players[seat].fluentLanguage ?? 'English',
        cards: cards.map((card, index) => ({
          id: card.id, ...(revealed.has(card.id) ? { revealed: kinds[index] } : {}),
          ...(seat === 'host' ? { kind: kinds[index] } : {}),
        })),
        ...(clue ? { clue } : {}), remaining, revision, turnsLeft, suddenDeath, hintsUnlocked: [...hintsUnlocked],
      }
    },
    tick() {},
    finishEarly(time) { if (!result) finish('defeat', time, undefined, true) },
    results: () => result,
    act(seat: Seat, input: unknown, time: number) {
      if (result || time < startsAt || !input || typeof input !== 'object') return false
      const action = input as Record<string, unknown>
      if (action.revision !== revision) return false
      if (action.type === 'hint' && typeof action.id === 'string' &&
          cards.some(card => card.id === action.id) && !hintsUnlocked.has(action.id)) {
        hintsUnlocked.add(action.id)
        revision++
        return true
      }
      if (seat === 'host' && action.type === 'clue' && remaining === 0 && !suddenDeath &&
          typeof action.word === 'string' && Number.isInteger(action.count) &&
          Number(action.count) >= 1 && Number(action.count) <= codenamesTeamWords - completed) {
        const word = normalizeClue(action.word)
        const language = players.host.learningLanguage
        if (!word || isBoardWord(word, cards.map(card => card.words[language]), language)) return false
        clue = word
        remaining = Number(action.count)
        revision++
        return true
      }
      if (seat === 'guest' && action.type === 'guess' && (remaining > 0 || suddenDeath) && typeof action.id === 'string') {
        const index = cards.findIndex(card => card.id === action.id)
        if (index < 0 || revealed.has(action.id)) return false
        revealed.add(action.id)
        revision++
        if (kinds[index] === 'assassin') {
          wrongGuesses++
          finish('defeat', time, 'assassin')
        }
        else if (kinds[index] === 'team') {
          completed++
          if (!suddenDeath) remaining--
          if (completed === codenamesTeamWords) finish('victory', time)
        } else {
          wrongGuesses++
          if (suddenDeath) finish('defeat', time, 'neutral')
          else remaining = 0
        }
        if (!result && !suddenDeath && remaining === 0) endTurn()
        return true
      }
      if (seat === 'guest' && action.type === 'pass' && remaining > 0) {
        endTurn()
        revision++
        return true
      }
      return false
    },
  }
}

export const codenamesServer: ServerMinigame = {
  config,
  start: (matchId, players, now) => startCodenames(matchId, players, now),
}
