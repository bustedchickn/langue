import { useRef, useState } from 'react'
import type { GameProgress, GameResults, Seat } from '../../../shared/minigames/contracts'
import { gameIcons } from '../../../shared/minigames/icons'
import { iconCommunicationConfig as config, type IconResults, type IconView } from '../../../shared/minigames/icon-communication'
import './icons.css'

export function IconCommunicationView({ progress, data, disabled, send }: {
  progress: GameProgress; data: unknown; disabled: boolean; send: (action: unknown) => void
}) {
  const view = data as IconView
  const [selected, setSelected] = useState<{ icon: string; round: number }>()
  const last = useRef({ matchId: '', revision: -1, time: 0 })
  const feedback = view.feedback === 'correct' ? 'Correct! Get ready for the next round.'
    : view.feedback === 'incorrect' ? 'Incorrect. −' + config.incorrectGuessPenaltyMs / 1000 + ' seconds.' : ''
  return <>
    <p><strong>{view.role === 'selector' ? 'Selector' : 'Describer'}</strong> · Practice {view.language}</p>
    <p role="status">{feedback}</p>
    {view.role === 'selector' ? <>
      <p>{view.revealed ? 'Select the icon your partner describes.' : 'Wait for your partner’s icon to appear.'}</p>
      <div className="icon-grid" style={{ gridTemplateColumns: 'repeat(' + config.gridColumns + ', minmax(0, 1fr))' }}>
        {view.grid.map(icon => <button type="button" className="secondary icon-tile" key={icon}
          aria-label={gameIcons.get(icon)?.name} data-icon={icon}
          data-selected={selected?.icon === icon && selected.round === progress.round || undefined}
          disabled={disabled || !view.revealed || (!config.allowRepeatedGuesses && view.guessed.includes(icon))}
          onClick={() => {
            const now = performance.now()
            if (last.current.matchId === progress.matchId &&
                (last.current.revision === view.revision || now - last.current.time < 300)) return
            last.current = { matchId: progress.matchId, revision: view.revision, time: now }
            setSelected({ icon, round: progress.round })
            send({ type: 'guess', icon, round: progress.round, revision: view.revision })
          }}>
          <img src={gameIcons.get(icon)?.assetPath} alt="" draggable={false} />
        </button>)}
      </div>
    </> : view.target ? <>
      <p>Describe this icon in {view.language} using voice or chat.</p>
      <img className="icon-target" src={gameIcons.get(view.target)?.assetPath} alt={gameIcons.get(view.target)?.name} />
    </> : <p className="icon-wait">Get ready! Your next icon is coming…</p>}
  </>
}

export function IconCommunicationResults({ result }: { result: GameResults; seat: Seat }) {
  const icons = result as IconResults
  return <>
    <h3 className="game-outcome">Time’s up</h3>
    <p>{result.players.join(' & ')}</p>
    <dl className="game-results">
      <div><dt>Icons identified</dt><dd>{result.completed}</dd></div>
      <div><dt>Incorrect guesses</dt><dd>{icons.incorrectGuesses}</dd></div>
      <div><dt>Rounds completed</dt><dd>{result.completed}</dd></div>
      <div><dt>Total time played</dt><dd>{Math.ceil(result.elapsedMs / 1000)}s</dd></div>
      <div><dt>Final score</dt><dd>{result.score}</dd></div>
    </dl>
  </>
}
