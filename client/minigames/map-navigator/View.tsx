import { useEffect } from 'react'
import type { GameProgress } from '../../../shared/minigames/contracts'
import { languageTags } from '../../../shared/types'
import { PronunciationButton } from '../../pronunciation/PronunciationButton'
import { mapNavigatorGrid, type MapNavigatorView, type NavigatorAction } from '../../../shared/minigames/map-navigator'
import './map.css'

export function MapNavigatorView({ progress, data, disabled, send }: { progress: GameProgress; data: unknown; disabled: boolean; send: (action: NavigatorAction) => void }) {
  const view = data as MapNavigatorView
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const direction = ({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' } as const)[event.key as 'ArrowUp']
      if (direction && view.role === 'traveler' && !disabled) { event.preventDefault(); send({ type: 'move', direction }) }
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [disabled, send, view.role])
  const feedback = view.feedback === 'success' ? '🎉 You found the destination!' : view.feedback === 'wrong' ? 'Gentle detour—ask for clarification before guessing.' : view.feedback === 'blocked' ? 'That way is blocked. Try another direction.' : view.feedback === 'moved' ? 'Moved one step.' : ''
  return <section className="map-game" lang={languageTags[view.language]}>
    <header className="map-header"><div><p className="eyebrow">Sunnyville City Map</p><h2>Map Navigator</h2><p className="muted">{view.role === 'navigator' ? 'You see the secret destination. Guide your Traveler!' : 'Follow your partner’s directions to find the secret destination.'}</p></div><div className="map-badges"><span>⏱ {Math.floor(Math.max(0, Math.ceil((progress.endsAt - progress.serverNow) / 1000)) / 60).toString().padStart(2, '0')}:{(Math.max(0, Math.ceil((progress.endsAt - progress.serverNow) / 1000)) % 60).toString().padStart(2, '0')}</span><span>📍 {view.distanceRemaining} steps</span></div></header>
    <div className="map-stats"><span>Moves <strong>{view.moves}</strong></span><span>Wrong turns <strong>{view.wrongTurns}</strong></span><span>Target language <strong>{view.language}</strong></span></div>
    <div className="map-layout"><div><div className="city-map" role="grid" aria-label="Sunnyville city map" style={{ gridTemplateColumns: `repeat(${mapNavigatorGrid.columns}, minmax(0, 1fr))` }}>{Array.from({ length: mapNavigatorGrid.rows * mapNavigatorGrid.columns }, (_, index) => { const row = Math.floor(index / mapNavigatorGrid.columns); const column = index % mapNavigatorGrid.columns; const landmark = view.landmarks.find(item => item.row === row && item.column === column); const here = view.position.row === row && view.position.column === column; const goal = view.goal?.row === row && view.goal.column === column; const route = view.route?.some(point => point.row === row && point.column === column); return <div className={'map-cell ' + (landmark ? 'landmark' : '') + (here ? 'here' : '') + (goal ? 'goal' : '') + (route ? 'route' : '')} role="gridcell" key={index} aria-label={`${landmark?.name ?? 'Street'}, row ${row + 1}, column ${column + 1}`}>{here ? '🧭' : goal ? '⭐' : landmark?.emoji ?? '·'}{landmark && <small>{landmark.name}</small>}</div> })}</div><p className="map-feedback" role="status">{feedback || (view.role === 'navigator' ? 'Give a direction in the target language, then watch the route.' : 'Your partner is ready with a route clue.')}</p></div>
      <aside className="map-side"><div className="tip"><strong>💬 Communication tip</strong><p>Don’t guess. Ask “Where are you now?” or “Can you repeat that?”</p></div><h3>Conversation prompts</h3>{view.prompts.map(prompt => <div className="prompt" key={prompt.english}><span>{prompt.translated}</span><PronunciationButton text={prompt.translated} language={view.language} label={'Pronounce ' + prompt.translated} /></div>)}<h3>Vocabulary</h3><div className="vocab">{view.vocabulary.map(word => <div key={word.english}><span>{word.translated}</span><PronunciationButton text={word.translated} language={view.language} label={'Pronounce ' + word.translated} /></div>)}</div></aside></div>
    {view.role === 'traveler' && <div className="direction-controls"><button disabled={disabled} onClick={() => send({ type: 'move', direction: 'up' })}>↑<span>North</span></button><button disabled={disabled} onClick={() => send({ type: 'move', direction: 'left' })}>←<span>West</span></button><button disabled={disabled} onClick={() => send({ type: 'move', direction: 'down' })}>↓<span>South</span></button><button disabled={disabled} onClick={() => send({ type: 'move', direction: 'right' })}>→<span>East</span></button></div>}
    <div className="map-actions"><button disabled={disabled || !view.canReset} onClick={() => send({ type: 'reset' })}>New Route</button>{view.role === 'traveler' && <button className="secondary" disabled={disabled} onClick={() => send({ type: 'finish' })}>Finish Route</button>}</div>
  </section>
}
