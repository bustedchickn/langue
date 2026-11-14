import type { GameProgress, GameResults, Seat } from '../../../shared/minigames/contracts'
import { languageTags } from '../../../shared/types'
import type { SpotDifferenceView, SpotDifferenceResults, SpotDifferenceAction } from '../../../shared/minigames/spot-difference'
import './spot.css'

function Scene({ view, disabled, send }: { view: SpotDifferenceView; disabled: boolean; send: (action: SpotDifferenceAction) => void }) {
  const positions = [
    { left: '24%', top: '30%', size: '21%' }, { left: '70%', top: '28%', size: '20%' },
    { left: '34%', top: '70%', size: '22%' }, { left: '68%', top: '68%', size: '21%' }, { left: '50%', top: '48%', size: '20%' },
  ]
  const sceneLabel = view.scene === 'player-one' ? 'Player 1 scene' : 'Player 2 scene'

  return <div className="spot-scene" aria-label={sceneLabel}>
    <h3>{sceneLabel.replace(' scene', ' Scene')}</h3>
    <p className="muted">Round 1: {view.roundName}</p>
    <div className="scene-stage" data-theme={view.sceneKind}>
      <div className="scene-wall-art" aria-hidden="true">▰</div>
      <div className="scene-clock" aria-hidden="true">◷</div>
      <div className="scene-table" aria-hidden="true"><div className="scene-tabletop" /><div className="scene-table-leg" /><div className="scene-table-base" /></div>
      <div className="scene-chair" aria-hidden="true">▮</div>
      {view.objects.map((object, index) => {
        const position = positions[index] ?? positions[positions.length - 1]
        const found = view.found.includes(object.id)
        return <button key={object.id} type="button" className={'scene-object ' + (found ? 'found' : '')} style={{ left: position.left, top: position.top, width: position.size, height: position.size, backgroundColor: object.color }} disabled={disabled || found} onClick={() => send({ type: 'select', objectId: object.id })} aria-label={`${object.name}: ${object.detail}`}>
          <span aria-hidden="true">{object.emoji}</span>
        </button>
      })}
    </div>
  </div>
}


export function SpotDifferenceView({ progress, data, disabled, send }: { progress: GameProgress; data: unknown; disabled: boolean; send: (action: SpotDifferenceAction) => void }) {
  const view = data as SpotDifferenceView
  const seconds = Math.max(0, Math.ceil((progress.endsAt - progress.serverNow) / 1000))
  const feedback = view.feedback === 'correct' ? '✅ Nice find! Keep comparing.' : view.feedback === 'incorrect' ? 'Try describing the object with your partner.' : view.feedback === 'complete' ? '🎉 All five differences found!' : view.feedback === 'incomplete' ? 'Round finished before all differences were found.' : 'Compare both scenes, describe what you see, then select an object.'
  return <section className="spot-game" lang={languageTags[view.language]}><header className="spot-header"><div><p className="eyebrow">2-Player Language Challenge</p><h2>Spot the Difference</h2><p className="muted">Compare both scenes and describe what you see.</p></div><div className="spot-badges"><span>🔎 {view.found.length} / {view.totalDifferences} found</span><span>⏱ {Math.floor(seconds / 60).toString().padStart(2, '0')}:{(seconds % 60).toString().padStart(2, '0')}</span></div></header><div className="spot-feedback" role="status"><strong>GUIDE</strong> {feedback}</div><div className="spot-scenes"><Scene view={view} disabled={disabled} send={send} /></div><div className="map-actions"><button disabled={disabled} onClick={() => send({ type: 'reset' })}>New Round</button><button className="secondary" disabled={disabled} onClick={() => send({ type: 'finish' })}>Finish Round</button></div></section>
}

export function SpotDifferenceResults({ result, seat }: { result: GameResults; seat: Seat }) { const data = result as SpotDifferenceResults; return <><h3 className="game-outcome">{result.outcome === 'victory' ? '🎉 Differences found!' : '⏱ Round finished'}</h3><p>{result.players.join(' & ')}</p><dl className="game-results"><div><dt>Differences found</dt><dd>{data.found} / 5</dd></div><div><dt>Incorrect guesses</dt><dd>{data.incorrectGuesses}</dd></div><div><dt>Time played</dt><dd>{Math.ceil(result.elapsedMs / 1000)}s</dd></div><div><dt>Final score</dt><dd>{result.score}</dd></div></dl><p className="muted">{seat === 'host' ? 'Compare positions, colors, and shapes together.' : 'Keep practicing by describing what you see in the target language.'}</p></> }
