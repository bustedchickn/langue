import { randomInt } from 'node:crypto'
import type { GamePlayers, GameResults, Seat } from '../../../shared/minigames/contracts'
import { codenamesBoardSize, codenamesTeamWords, codenamesConfig as config, wordCards, type CardKind, type CodenamesView } from '../../../shared/minigames/codenames'
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
  const startsAt = now + 3000
  const endsAt = Number.MAX_SAFE_INTEGER
  let clue: string | undefined
  let remaining = 0
  let completed = 0
  let revision = 0
  let turnsLeft = 9
  let suddenDeath = false
  let result: GameResults | undefined
  function finish(outcome: GameResults['outcome'], time: number) {
    result = { gameId: config.id, outcome, completed, attempted: revealed.size,
      elapsedMs: Math.max(0, time - startsAt), score: completed, players: [players.host.name, players.guest.name] }
  }
  function endTurn() {
    turnsLeft--
    clue = undefined
    remaining = 0
    if (turnsLeft === 0) suddenDeath = true
  }
  return {
    updateIntervalMs: 60000,
    progress: time => ({ gameId: config.id, matchId, round: 1, completed, score: completed, startsAt, endsAt, serverNow: time, untimed: true }),
    view(seat): CodenamesView {
      return {
        role: seat === 'host' ? 'clue-giver' : 'guesser', language: players.host.learningLanguage,
        cards: cards.map((card, index) => ({
          id: card.id, ...(revealed.has(card.id) ? { revealed: kinds[index] } : {}),
          ...(seat === 'host' ? { kind: kinds[index] } : {}),
        })),
        ...(clue ? { clue } : {}), remaining, revision, turnsLeft, suddenDeath,
      }
    },
    tick() {},
    results: () => result,
    act(seat: Seat, input: unknown, time: number) {
      if (result || time < startsAt || !input || typeof input !== 'object') return false
      const action = input as Record<string, unknown>
      if (action.revision !== revision) return false
      if (seat === 'host' && action.type === 'clue' && remaining === 0 && !suddenDeath &&
          typeof action.word === 'string' && /^[\p{L}\p{M}]+$/u.test(action.word.trim()) &&
          action.word.trim().length <= 30 && Number.isInteger(action.count) &&
          Number(action.count) >= 1 && Number(action.count) <= codenamesTeamWords - completed) {
        const word = action.word.trim()
        if (cards.some(card => card.words[players.host.learningLanguage].toLocaleLowerCase() === word.toLocaleLowerCase())) return false
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
        if (kinds[index] === 'assassin') finish('defeat', time)
        else if (kinds[index] === 'team') {
          completed++
          if (!suddenDeath) remaining--
          if (completed === codenamesTeamWords) finish('victory', time)
        } else if (suddenDeath) finish('defeat', time)
        else remaining = 0
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
