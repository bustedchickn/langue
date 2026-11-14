import { useEffect } from 'react'
import type { GameProgress, GameResults } from '../../../shared/minigames/contracts'
import { languageTags } from '../../../shared/types'
import { PronunciationButton } from '../../pronunciation/PronunciationButton'
import { mapNavigatorGrid, type MapNavigatorResults, type MapNavigatorView, type NavigatorAction } from '../../../shared/minigames/map-navigator'
import './map.css'

const directions = [
  ['up', '↑', 'North'], ['left', '←', 'West'], ['down', '↓', 'South'], ['right', '→', 'East'],
] as const
const keyDirections = { ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right' } as const

export function MapNavigatorView({ data, disabled, send }: {
  progress: GameProgress; data: unknown; disabled: boolean; send: (action: NavigatorAction) => void
}) {
  const view = data as MapNavigatorView
  const navigator = view.role === 'navigator'

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
        <h3>{navigator ? 'Navigator' : 'Traveler'}</h3>
        <p>{navigator ? 'Guide your partner along the marked route in ' + view.language + '.'
          : 'Follow your navigator’s directions. Ask what you should look for next.'}</p>
      </div>
      <b>{view.checkpoints}/2 checkpoints</b>
    </header>
    <div className="city-map" role="grid" aria-label="Sunnyville city map">
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
            {landmark && <><span className="map-landmark-icon" aria-hidden="true">{landmark.emoji}</span><small>{landmark.name}</small></>}
            {checkpoint >= 0 && <b className="map-marker">{checkpoint + 1}</b>}
            {goal && <b className="map-marker map-destination" aria-hidden="true">★</b>}
            {here && <b className="map-traveler" aria-hidden="true">●</b>}
          </div>
        })}
      </div>)}
    </div>
    {!navigator && <div className="direction-controls" aria-label="Move traveler">
      {directions.map(([direction, arrow, label]) => <button key={direction} disabled={disabled}
        onClick={() => send({ type: 'move', direction })}><strong aria-hidden="true">{arrow}</strong><span>{label}</span></button>)}
    </div>}
    <p className="map-feedback" role="status">{feedback || view.moves + (view.moves === 1 ? ' move' : ' moves')}</p>
    <details className="map-phrasebook">
      <summary>{view.language} phrasebook</summary>
      <div className="map-phrases" lang={languageTags[view.language]}>
        {view.prompts.map(prompt => <div key={prompt.english}>
          <span>{prompt.translated}</span>
          <PronunciationButton text={prompt.translated} language={view.language} label={'Pronounce ' + prompt.translated} />
        </div>)}
      </div>
    </details>
  </section>
}

export function MapNavigatorResultsView({ result }: { result: GameResults }) {
  const map = result as MapNavigatorResults
  return <>
    <h3 className="game-outcome">{result.outcome === 'victory' ? 'Destination reached' : 'Time’s up'}</h3>
    <p>{result.players.join(' & ')}</p>
    <dl className="game-results">
      <div><dt>Moves</dt><dd>{map.moves}</dd></div>
      <div><dt>Wrong turns</dt><dd>{map.wrongTurns}</dd></div>
      <div><dt>Final score</dt><dd>{map.score}</dd></div>
    </dl>
  </>
}
