import type { GameProgress, GameResults, Seat } from '../../../shared/minigames/contracts'
import { useEffect, useId, useRef, useState } from 'react'
import { languageTags } from '../../../shared/types'
import { sceneObjectWord, type SpotDifferenceView, type SpotDifferenceResults, type SpotDifferenceAction } from '../../../shared/minigames/spot-difference'
import './spot.css'
import { useInterface } from '../../locales/interface'
import { sessionText } from '../../locales/session'
import { playEffect } from '../../sounds'

function Scene({ view, disabled, send }: { view: SpotDifferenceView; disabled: boolean; send: (action: SpotDifferenceAction) => void }) {
  const [word, setWord] = useState<string>()
  const tooltipId = useId()
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => { if (event.key === 'Escape') setWord(undefined) }
    document.addEventListener('keydown', dismiss)
    return () => document.removeEventListener('keydown', dismiss)
  }, [])
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
        return <div className="scene-object-wrap" key={object.id} data-index={index} data-open={word === object.id}
          style={{ left: position.left, top: position.top, width: position.size, height: position.size }}>
          <button type="button" className={'scene-object ' + (found ? 'found' : '')} style={{ backgroundColor: object.color }} disabled={disabled || found}
            onClick={() => send({ type: 'select', objectId: object.id })} aria-label={`${object.name}: ${object.detail}`}>
            <span aria-hidden="true">{object.emoji}</span>
          </button>
          <button type="button" className="scene-word-info" aria-label={'Show ' + view.language + ' word for ' + object.name}
            aria-expanded={word === object.id} aria-controls={tooltipId + '-' + object.id}
            onClick={event => { event.stopPropagation(); setWord(word === object.id ? undefined : object.id) }}>i</button>
          <span id={tooltipId + '-' + object.id} className="scene-learning-word" role="tooltip" hidden={word !== object.id}
            lang={languageTags[view.language]}>{sceneObjectWord(object.name, view.language)}</span>
        </div>
      })}
    </div>
  </div>
}


export function SpotDifferenceView({ progress, data, disabled, send }: { progress: GameProgress; data: unknown; disabled: boolean; send: (action: SpotDifferenceAction) => void }) {
  const view = data as SpotDifferenceView
  const found = useRef({ matchId: progress.matchId, count: view.found.length })
  useEffect(() => {
    if (found.current.matchId !== progress.matchId) found.current = { matchId: progress.matchId, count: view.found.length }
    else if (view.found.length > found.current.count && view.found.length < view.totalDifferences) playEffect('correct')
    found.current.count = view.found.length
  }, [progress.matchId, view.found.length, view.totalDifferences])
  const seconds = Math.max(0, Math.ceil((progress.endsAt - progress.serverNow) / 1000))
  const feedback = view.feedback === 'correct' ? '✅ Nice find! Keep comparing.' : view.feedback === 'incorrect' ? 'That object matches in both scenes. Compare another object with your partner.' : view.feedback === 'complete' ? '🎉 All ' + view.totalDifferences + ' differences found!' : view.feedback === 'incomplete' ? 'Round finished before all differences were found.' : 'Describe an object and its position to your partner. Select it only when you agree it is different.'
  return <section className="spot-game"><header className="spot-header"><div><p className="eyebrow">2-Player Language Challenge</p><h2>Spot the Difference</h2><p className="muted">Your partner sees a different scene. Compare object types, colors, and details using voice or chat. Find all {view.totalDifferences} differences together. Use an object’s i icon to see its word in {view.language} without making a guess.</p></div><div className="spot-badges"><span>🔎 {view.found.length} / {view.totalDifferences} found</span><span>⏱ {Math.floor(seconds / 60).toString().padStart(2, '0')}:{(seconds % 60).toString().padStart(2, '0')}</span></div></header><div className="spot-feedback" role="status"><strong>GUIDE</strong> {feedback}</div><div className="spot-scenes"><Scene view={view} disabled={disabled} send={send} /></div><div className="map-actions"><button disabled={disabled} onClick={() => send({ type: 'reset' })}>Reset finds</button></div></section>
}

export function SpotDifferenceResults({ result, seat }: { result: GameResults; seat: Seat }) {
  const data = result as SpotDifferenceResults
  const { language } = useInterface()
  return <>
    <h3 className="game-outcome">{sessionText(language, result.endedEarly ? 'Game ended early' : result.outcome === 'victory' ? '🎉 Differences found!' : '⏱ Round finished')}</h3>
    <p>{result.players.join(' & ')}</p>
    <dl className="game-results">
      <div><dt>{sessionText(language, 'Differences found')}</dt><dd>{data.found}</dd></div>
      <div><dt>{sessionText(language, 'Incorrect guesses')}</dt><dd>{data.incorrectGuesses}</dd></div>
      <div><dt>{sessionText(language, 'Time played')}</dt><dd>{Math.ceil(result.elapsedMs / 1000)}s</dd></div>
      <div><dt>{sessionText(language, 'Final score')}</dt><dd>{result.score}</dd></div>
    </dl>
    <p className="muted">{sessionText(language, seat === 'host' ? 'Compare positions, colors, and shapes together.'
      : 'Keep practicing by describing what you see in the target language.')}</p>
  </>
}
