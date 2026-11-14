import { FieldPath } from 'firebase-admin/firestore'
import type { GameResults } from '../shared/minigames/contracts'
import type { LeaderboardEntry, Leaderboards, ProfileScores, UserProfile } from '../shared/types'
import { minigames } from './minigames/registry'
import { db, getProfile, profileRef } from './store'

const emptyScores = (): ProfileScores => ({ total: 0, gamesPlayed: 0, games: {} })

export function addGameScore(previous: ProfileScores | undefined, gameId: string, score: number): ProfileScores {
  const scores = previous ?? emptyScores()
  const game = scores.games[gameId]
  return {
    total: scores.total + score,
    gamesPlayed: scores.gamesPlayed + 1,
    games: {
      ...scores.games,
      [gameId]: {
        highScore: game ? Math.max(game.highScore, score) : score,
        totalScore: (game?.totalScore ?? 0) + score,
        gamesPlayed: (game?.gamesPlayed ?? 0) + 1,
      },
    },
  }
}

/** Only the game server calls this; matchId makes replayed finish events harmless. */
export async function recordGameScore(matchId: string, result: GameResults, playerUids: [string, string]) {
  if (!minigames.has(result.gameId) || !Number.isSafeInteger(result.score)) throw new Error('Invalid game score.')
  const marker = db.collection('scoredMatches').doc(matchId)
  const refs = playerUids.map(profileRef)
  return db.runTransaction(async tx => {
    const [record, ...profiles] = await tx.getAll(marker, ...refs)
    if (record.exists) return false
    for (let index = 0; index < refs.length; index++) {
      const profile = profiles[index].data() as UserProfile | undefined
      if (profile) tx.update(refs[index], { scores: addGameScore(profile.scores, result.gameId, result.score) })
    }
    tx.create(marker, { gameId: result.gameId, score: result.score, players: playerUids, recordedAt: Date.now() })
    return true
  })
}

function entry(profile: UserProfile, score: number, gamesPlayed: number): LeaderboardEntry {
  return { uid: profile.uid, displayName: profile.displayName, score, gamesPlayed }
}

export async function getLeaderboards(uid: string): Promise<Leaderboards> {
  const gameIds = [...minigames.keys()]
  const [mine, overall, ...perGame] = await Promise.all([
    getProfile(uid),
    db.collection('profiles').orderBy('scores.total', 'desc').limit(20).get(),
    ...gameIds.map(gameId => db.collection('profiles')
      .orderBy(new FieldPath('scores', 'games', gameId, 'highScore'), 'desc').limit(20).get()),
  ])
  return {
    mine: mine?.scores ?? emptyScores(),
    overall: overall.docs.map(doc => {
      const profile = doc.data() as UserProfile
      return entry(profile, profile.scores!.total, profile.scores!.gamesPlayed)
    }),
    games: Object.fromEntries(gameIds.map((gameId, index) => [gameId, perGame[index].docs.map(doc => {
      const profile = doc.data() as UserProfile
      const game = profile.scores!.games[gameId]
      return entry(profile, game.highScore, game.gamesPlayed)
    })])),
  }
}
