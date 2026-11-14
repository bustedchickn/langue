import { useEffect, useState } from 'react'
import type { GameProgress, GameResults, PrivateGameView, Seat } from '../../shared/minigames/contracts'
import { minigames } from './registry'

export function ActiveGame({ progress, view, ready, send }: {
  progress: GameProgress; view?: PrivateGameView; ready: boolean; send: (action: unknown) => void
}) {
  // Anchor each server timestamp to the local monotonic clock so wall-clock skew cannot shift the countdown.
  const [anchor, setAnchor] = useState(() => ({ timestamp: progress.serverNow, local: performance.now() }))
  const [now, setNow] = useState(anchor.local)
  if (anchor.timestamp !== progress.serverNow) setAnchor({ timestamp: progress.serverNow, local: performance.now() })
  useEffect(() => {
    const interval = setInterval(() => setNow(performance.now()), 150)
    return () => clearInterval(interval)
  }, [])
  const serverNow = anchor.timestamp + Math.max(0, now - anchor.local)
  const counting = serverNow < progress.startsAt
  const seconds = Math.max(0, Math.ceil(((counting ? progress.startsAt : progress.endsAt) - serverNow) / 1000))
  const game = minigames.get(progress.gameId)
  const current = view?.gameId === progress.gameId && view.matchId === progress.matchId && view.round === progress.round
  if (!game) return <p>Game unavailable.</p>
  return <>
    <div className="game-progress">
      <strong>Round {progress.round}{progress.rounds !== undefined && ' of ' + progress.rounds}</strong>
      {(!counting || !progress.hidePreparationTimer) && <span>{counting ? 'Starts in ' : 'Time left '}<time>{seconds}s</time></span>}
    </div>
    <p role="status">{progress.completed} solved · {progress.score} points</p>
    {!ready && <p role="status">Waiting for both players. The timer is still running.</p>}
    {current ? <game.View data={view.data} progress={progress} disabled={!ready || counting || seconds === 0}
      send={action => send({ matchId: progress.matchId, action })} /> : <p>Loading your role…</p>}
  </>
}

export function Results({ result, seat }: { result: GameResults; seat: Seat }) {
  const CustomResults = minigames.get(result.gameId)?.Results
  if (CustomResults) return <CustomResults result={result} seat={seat} />
  return <>
    <h3 className="game-outcome">{result.outcome === 'victory' ? 'Victory' : 'Defeat'}</h3>
    <p>{result.players.join(' & ')}</p>
    <dl className="game-results">
      <div><dt>Puzzles completed</dt><dd>{result.completed}</dd></div>
      <div><dt>Puzzles attempted</dt><dd>{result.attempted}</dd></div>
      <div><dt>Time elapsed</dt><dd>{Math.ceil(result.elapsedMs / 1000)}s</dd></div>
      <div><dt>Final score</dt><dd>{result.score}</dd></div>
    </dl>
  </>
}
