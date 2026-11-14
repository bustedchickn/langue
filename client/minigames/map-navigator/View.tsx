import { useEffect, useId, useRef, type PointerEvent } from 'react'
import type { GameProgress, GameResults } from '../../../shared/minigames/contracts'
import { mapNavigatorGrid, type MapNavigatorResults, type MapNavigatorView, type NavigatorAction } from '../../../shared/minigames/map-navigator'
import { languageNames, languageTags } from '../../../shared/types'
import { useInterface } from '../../locales/interface'
import { sessionText } from '../../locales/session'
import './map.css'

const directions = [
  ['up', '↑', 'North'], ['left', '←', 'West'], ['down', '↓', 'South'], ['right', '→', 'East'],
] as const
const keyDirections = { ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right' } as const

export function MapNavigatorView({ data, disabled, send }: {
  progress: GameProgress; data: unknown; disabled: boolean; send: (action: NavigatorAction) => void
}) {
  const view = data as MapNavigatorView
  const { language } = useInterface()
  const navigator = view.role === 'navigator'
  const hintId = useId()
  const swipe = useRef<{ pointer: number; x: number; y: number } | undefined>(undefined)

  useEffect(() => { swipe.current = undefined }, [disabled, navigator])

  function startSwipe(event: PointerEvent<HTMLDivElement>) {
    if (navigator || disabled || !event.isPrimary || event.button !== 0) return
    swipe.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function finishSwipe(event: PointerEvent<HTMLDivElement>) {
    const gesture = swipe.current
    if (!gesture || gesture.pointer !== event.pointerId) return
    swipe.current = undefined
    if (navigator || disabled) return
    const dx = event.clientX - gesture.x
    const dy = event.clientY - gesture.y
    const horizontal = Math.abs(dx)
    const vertical = Math.abs(dy)
    // One deliberate swipe moves one tile. Taps and ambiguous diagonal drags
    // should not send a move or spend a wrong-turn penalty.
    if (Math.max(horizontal, vertical) < 28 || Math.max(horizontal, vertical) < Math.min(horizontal, vertical) * 1.2) return
    send({ type: 'move', direction: horizontal > vertical ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up') })
  }

  useEffect(() => {
    if (navigator || disabled) return
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]'))) return
      const direction = keyDirections[event.key as keyof typeof keyDirections]
      if (direction) {
        event.preventDefault()
        send({ type: 'move', direction })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [disabled, navigator, send])

  const feedback = view.feedback === 'wrong' ? 'Check in with your navigator.' :
    view.feedback === 'blocked' ? 'You’re at the edge of the map.' :
    view.feedback === 'checkpoint' ? 'Checkpoint reached!' : ''

  return <section className="map-game">
    <header className="map-header">
      <div>
        <small>Sunnyville</small>
        <h3>{sessionText(language, navigator ? 'Navigator' : 'Traveler')}</h3>
        <p>{navigator ? sessionText(language, 'You see the outlined route, numbered checkpoints, and destination star. Give one direction at a time in {language}.').replace('{language}', language === 'English' ? view.language : languageNames[view.language])
          : sessionText(language, 'Only your navigator can see the route. Ask for directions and visit both checkpoints in order before the destination.')}</p>
      </div>
      <b>{sessionText(language, '{count}/2 checkpoints').replace('{count}', String(view.checkpoints))}</b>
    </header>
    <div className="city-map" role="grid" aria-label="Sunnyville city map" aria-describedby={hintId} tabIndex={0}
      data-swipe-enabled={!navigator && !disabled} onPointerDown={startSwipe} onPointerUp={finishSwipe}
      onPointerCancel={() => { swipe.current = undefined }} onLostPointerCapture={() => { swipe.current = undefined }}>
      {Array.from({ length: mapNavigatorGrid.rows }, (_, row) => <div className="city-row" key={row} role="row">
        {Array.from({ length: mapNavigatorGrid.columns }, (_, column) => {
          const at = (point?: { row: number; column: number }) => point?.row === row && point.column === column
          const landmark = view.landmarks.find(at)
          const here = at(view.position)
          const goal = at(view.goal)
          const route = view.route?.some(at)
          const checkpoint = view.waypoints?.findIndex(at) ?? -1
          return <div key={column} role="gridcell" className="map-cell" data-route={route} data-here={here} data-landmark={!!landmark}
            aria-label={[here && 'Traveler', goal && 'Destination', checkpoint >= 0 && 'Checkpoint ' + (checkpoint + 1),
              landmark?.name ?? 'Street', 'row ' + (row + 1) + ', column ' + (column + 1)].filter(Boolean).join(', ')}>
            {landmark && <><span className="map-landmark-icon" aria-hidden="true">{landmark.emoji}</span><small lang={languageTags[view.language]}>{landmark.name}</small></>}
            {checkpoint >= 0 && <b className="map-marker">{checkpoint + 1}</b>}
            {goal && <b className="map-marker map-destination" aria-hidden="true">★</b>}
            {here && <b className="map-traveler" aria-hidden="true">●</b>}
          </div>
        })}
      </div>)}
    </div>
    <p id={hintId} className="map-control-hint">{sessionText(language, navigator
      ? 'Follow the outlined tiles through checkpoint 1, then checkpoint 2, and finish at the star. North is up on both maps.'
      : 'Swipe on the map, press an arrow key, or use the direction buttons. Each swipe moves one tile: up is North, down is South, left is West, and right is East.')}</p>
    {!navigator && <div className="direction-controls" aria-label="Move traveler">
      {directions.map(([direction, arrow, label]) => <button key={direction} disabled={disabled}
        onClick={() => send({ type: 'move', direction })}><strong aria-hidden="true">{arrow}</strong><span>{sessionText(language, label)}</span></button>)}
    </div>}
    <p className="map-feedback" role="status">{feedback ? sessionText(language, feedback) : language === 'English' ? view.moves + (view.moves === 1 ? ' move' : ' moves') : sessionText(language, 'Moves') + ' · ' + view.moves}</p>
  </section>
}

export function MapNavigatorResultsView({ result }: { result: GameResults }) {
  const map = result as MapNavigatorResults
  const { language } = useInterface()
  return <>
    <h3 className="game-outcome">{sessionText(language, result.endedEarly ? 'Game ended early' : result.outcome === 'victory' ? 'Destination reached' : 'Time’s up')}</h3>
    <p>{result.players.join(' & ')}</p>
    <dl className="game-results">
      <div><dt>{sessionText(language, 'Moves')}</dt><dd>{map.moves}</dd></div>
      <div><dt>{sessionText(language, 'Wrong turns')}</dt><dd>{map.wrongTurns}</dd></div>
      <div><dt>{sessionText(language, 'Final score')}</dt><dd>{map.score}</dd></div>
    </dl>
  </>
}
