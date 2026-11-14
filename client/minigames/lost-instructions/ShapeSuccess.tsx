import { useEffect, useRef, useState } from 'react'
import type { GameProgress, GameResults } from '../../../shared/minigames/contracts'
import './board.css'

/** Lives outside the phase panel so the final correct answer can celebrate too. */
export function ShapeSuccess({ progress, result }: { progress?: GameProgress; result?: GameResults }) {
  const previous = useRef<{ matchId?: string; completed: number } | undefined>(undefined)
  const [celebration, setCelebration] = useState<{ key: string; round: number }>()
  useEffect(() => {
    const completed = progress?.completed ?? result?.completed ?? 0
    const matchId = progress?.matchId ?? previous.current?.matchId
    const newMatch = !!progress && progress.matchId !== previous.current?.matchId
    if (newMatch) setCelebration(undefined)
    else if (previous.current && completed > previous.current.completed) {
      setCelebration({ key: matchId + ':' + completed, round: completed })
    }
    previous.current = { matchId, completed }
  }, [progress?.matchId, progress?.completed, result?.completed])
  useEffect(() => {
    if (!celebration) return
    const timer = setTimeout(() => setCelebration(undefined), 1400)
    return () => clearTimeout(timer)
  }, [celebration])
  if (!celebration) return null
  return <div className="shape-success" key={celebration.key} role="status" aria-live="polite">
    <svg className="shape-success-check" viewBox="0 0 88 88" aria-hidden="true">
      <circle cx="44" cy="44" r="35" fill="#d8f5e3" stroke="#42986b" strokeWidth="3" />
      <path d="M26 44l12 13 25-28" fill="none" stroke="#286b4a" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <g className="shape-success-sparks" fill="#af83d6"><circle cx="8" cy="17" r="4" /><circle cx="78" cy="12" r="4" /><circle cx="79" cy="72" r="4" /><circle cx="9" cy="72" r="4" /></g>
    </svg>
    <div><strong>Correct!</strong><span>Puzzle {celebration.round} complete</span></div>
  </div>
}
