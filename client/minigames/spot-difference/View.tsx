import type { GameProgress, GameResults, Seat } from '../../../shared/minigames/contracts'
import { PronunciationButton } from '../../pronunciation/PronunciationButton'
import { languageTags } from '../../../shared/types'
import type { SceneKind, SpotDifferenceView, SpotDifferenceResults, SpotDifferenceAction } from '../../../shared/minigames/spot-difference'
import './spot.css'

function Scene({ view, disabled, send }: { view: SpotDifferenceView; disabled: boolean; send: (action: SpotDifferenceAction) => void }) {
  const positions: Record<string, { left: string; top: string; size: string }> = {
    desk: { left: '11%', top: '67%', size: '16%' }, plant: { left: '82%', top: '47%', size: '15%' }, clock: { left: '81%', top: '15%', size: '14%' },
    lamp: { left: '14%', top: '14%', size: '15%' }, cat: { left: '48%', top: '57%', size: '13%' }, book: { left: '30%', top: '55%', size: '13%' },
    window: { left: '57%', top: '14%', size: '15%' }, mug: { left: '61%', top: '57%', size: '11%' }, globe: { left: '39%', top: '57%', size: '12%' }, star: { left: '73%', top: '68%', size: '12%' },
  }
  const fallbackPosition = { left: '50%', top: '45%', size: '12%' }
  const sceneLabel = view.scene === 'player-one' ? 'Player 1 scene' : 'Player 2 scene'

  return <div className="spot-scene" aria-label={sceneLabel}>
    <h3>{sceneLabel.replace(' scene', ' Scene')}</h3>
    <p className="muted">Round 1: {view.roundName}</p>
    <div className="scene-stage">
      <SceneBackdrop kind={view.sceneKind} />
      <div className="scene-wall-art" aria-hidden="true">▰</div>
      <div className="scene-clock" aria-hidden="true">◷</div>
      <div className="scene-table" aria-hidden="true"><div className="scene-tabletop" /><div className="scene-table-leg" /><div className="scene-table-base" /></div>
      <div className="scene-chair" aria-hidden="true">▮</div>
      {view.objects.map(object => {
        const position = positions[object.id] ?? fallbackPosition
        const found = view.found.includes(object.id)
        return <button key={object.id} type="button" className={'scene-object ' + (found ? 'found' : '')} style={{ left: position.left, top: position.top, width: position.size, height: position.size, backgroundColor: object.color }} disabled={disabled || found} onClick={() => send({ type: 'select', objectId: object.id })} aria-label={`${object.name}: ${object.detail}`}>
          <span aria-hidden="true">{object.emoji}</span>
        </button>
      })}
    </div>
  </div>
}

function SceneBackdrop({ kind }: { kind: SceneKind }) {
  return <div className="scene-line-art" data-scene={kind} aria-hidden="true">
    <span className="line-art-window" /><span className="line-art-counter" /><span className="line-art-table" />
    <span className="line-art-bed" /><span className="line-art-desk" /><span className="line-art-board" />
    <span className="line-art-tree" /><span className="line-art-bench" /><span className="line-art-rug" />
  </div>
}

export function SpotDifferenceView({ progress, data, disabled, send }: { progress: GameProgress; data: unknown; disabled: boolean; send: (action: SpotDifferenceAction) => void }) {
  const view = data as SpotDifferenceView
  const seconds = Math.max(0, Math.ceil((progress.endsAt - progress.serverNow) / 1000))
  const feedback = view.feedback === 'correct' ? '✅ Nice find! Keep comparing.' : view.feedback === 'incorrect' ? 'Try describing the object with your partner.' : view.feedback === 'complete' ? '🎉 All five differences found!' : view.feedback === 'incomplete' ? 'Round finished before all differences were found.' : 'Compare both scenes, talk through the prompts, then select a dotted object.'
  return <section className="spot-game" lang={languageTags[view.language]}><header className="spot-header"><div><p className="eyebrow">2-Player Language Challenge</p><h2>Spot the Difference</h2><p className="muted">Compare both scenes using the prompts below.</p></div><div className="spot-badges"><span>🔎 {view.found.length} / {view.totalDifferences} found</span><span>⏱ {Math.floor(seconds / 60).toString().padStart(2, '0')}:{(seconds % 60).toString().padStart(2, '0')}</span></div></header><div className="spot-feedback" role="status"><strong>GUIDE</strong> {feedback}</div><div className="spot-scenes"><Scene view={view} disabled={disabled} send={send} /></div><div className="spot-columns"><section className="spot-panel"><h3>💬 Conversation Prompts</h3>{view.prompts.map(prompt => <div className="spot-prompt" key={prompt.english}><div><strong>{prompt.translated}</strong><small>{prompt.hint}</small></div><PronunciationButton text={prompt.translated} language={view.language} label={'Listen: ' + prompt.translated} /></div>)}</section><section className="spot-panel"><h3>📚 Scene Vocabulary</h3>{view.vocabulary.map(word => <div className="spot-word" key={word.english}><span><strong>{word.translated}</strong><small>{word.hint}</small></span><PronunciationButton text={word.translated} language={view.language} label={'Listen: ' + word.translated} /></div>)}</section></div><div className="map-actions"><button disabled={disabled} onClick={() => send({ type: 'reset' })}>New Round</button><button className="secondary" disabled={disabled} onClick={() => send({ type: 'finish' })}>Finish Round</button></div></section>
}

export function SpotDifferenceResults({ result, seat }: { result: GameResults; seat: Seat }) { const data = result as SpotDifferenceResults; return <><h3 className="game-outcome">{result.outcome === 'victory' ? '🎉 Differences found!' : '⏱ Round finished'}</h3><p>{result.players.join(' & ')}</p><dl className="game-results"><div><dt>Differences found</dt><dd>{data.found} / 5</dd></div><div><dt>Incorrect guesses</dt><dd>{data.incorrectGuesses}</dd></div><div><dt>Time played</dt><dd>{Math.ceil(result.elapsedMs / 1000)}s</dd></div><div><dt>Final score</dt><dd>{result.score}</dd></div></dl><p className="muted">{seat === 'host' ? 'Use the prompts to compare positions, colors, and shapes.' : 'Keep practicing by describing what you see in the target language.'}</p></> }
