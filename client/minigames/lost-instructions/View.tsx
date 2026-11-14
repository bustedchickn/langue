import { useRef, useState, type PointerEvent } from 'react'
import type { GameProgress } from '../../../shared/minigames/contracts'
import { lostInstructions, shapeColors, type LostAction, type LostView, type Piece } from '../../../shared/minigames/lost-instructions'
import { languageTags } from '../../../shared/types'
import { PronunciationButton } from '../../pronunciation/PronunciationButton'
import './board.css'

const assets: Record<string, { className?: string; src?: string }> = {
  'shape-circle': { className: 'lost-circle' },
  'shape-square': { className: 'lost-square' },
  'shape-triangle': { className: 'lost-triangle' },
  'shape-rectangle': { className: 'lost-rectangle' },
  'shape-star': { className: 'lost-star' },
  'shape-diamond': { className: 'lost-diamond' },
  'shape-hexagon': { className: 'lost-hexagon' },
  'shape-oval': { className: 'lost-oval' },
}

function Shape({ piece }: { piece: Piece }) {
  const asset = assets[lostInstructions.assets[piece.shape]]
  return asset.src
    ? <img className="lost-shape" src={asset.src} alt="" draggable={false} />
    : <span aria-hidden="true" className={'lost-shape ' + asset.className} data-color={piece.color} style={{ backgroundColor: shapeColors[piece.color] }} />
}

function Operator({ view, send, disabled }: {
  view: Extract<LostView, { role: 'operator' }>; send: (action: LostAction) => void; disabled: boolean
}) {
  const [selected, setSelected] = useState<string>()
  const [dragging, setDragging] = useState<string>()
  const drag = useRef<{ pointer: number; piece: string; x: number; y: number; revision: number; moved: boolean }>(undefined)
  const suppressClick = useRef(false)
  const board = useRef<HTMLDivElement>(null)
  const pieces = view.slots
  if (!pieces) return <p>Get ready to arrange the shapes.</p>

  function move(piece: string, slot: number) {
    setSelected(undefined)
    send({ type: 'move', piece, slot })
  }

  function select(piece: string, slot: number) {
    if (selected && selected !== piece) move(selected, slot)
    else setSelected(selected ? undefined : piece)
  }

  function pointerDown(event: PointerEvent<HTMLButtonElement>, piece: string) {
    if (disabled || !event.isPrimary || event.button !== 0) return
    suppressClick.current = false
    drag.current = { pointer: event.pointerId, piece, x: event.clientX, y: event.clientY, revision: view.revision, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current
    if (!active || active.pointer !== event.pointerId || active.moved) return
    if (Math.hypot(event.clientX - active.x, event.clientY - active.y) < 8) return
    active.moved = true
    setDragging(active.piece)
  }

  function pointerUp(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current
    if (!active || active.pointer !== event.pointerId) return
    drag.current = undefined
    setDragging(undefined)
    // A touch release can follow a scroll without generating a click.
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-lost-slot]')
    if (active.moved || event.pointerType === 'touch') suppressClick.current = true
    if (!target || !board.current?.contains(target) || active.revision !== view.revision || disabled) return
    const slot = Number(target.dataset.lostSlot)
    if (active.moved) move(active.piece, slot)
    else if (event.pointerType === 'touch' && target === event.currentTarget) select(active.piece, slot)
  }

  return <>
    <p>Match both the color and shape your partner names. Drag a piece onto another to swap them, or tap one piece and then the piece to swap with it. Select Check arrangement when all three positions match the clue.</p>
    <div className="lost-board" aria-label="Puzzle board" ref={board} style={{ gridTemplateColumns: 'repeat(' + pieces.length + ', minmax(0, 1fr))' }}>
      {pieces.map((piece, slot) => {
        const position = pieces.length === 3 ? ['Left', 'Middle', 'Right'][slot] : 'Slot ' + (slot + 1)
        return <button key={slot} type="button" className="lost-slot secondary" data-lost-slot={slot}
          data-piece={piece.id} data-shape={piece.shape} data-color={piece.color}
          data-dragging={dragging === piece.id || undefined}
          aria-label={position + ': ' + piece.color + ' ' + piece.shape} aria-pressed={selected === piece.id}
          disabled={disabled} onPointerDown={event => pointerDown(event, piece.id)} onPointerMove={pointerMove}
          onPointerUp={pointerUp} onPointerCancel={() => { drag.current = undefined; setDragging(undefined) }}
          onLostPointerCapture={() => { drag.current = undefined; setDragging(undefined) }}
          onClick={event => {
            if (event.detail && suppressClick.current) { suppressClick.current = false; return }
            select(piece.id, slot)
          }}>
          <span key={piece.id + ':' + view.revision} className="lost-piece"><Shape piece={piece} /></span>
          <span>{position}</span>
          <small className="lost-piece-label">{piece.color} {piece.shape}</small>
        </button>
      })}
    </div>
    <button disabled={disabled} onClick={() => { setSelected(undefined); send({ type: 'submit' }) }}>Check arrangement</button>
    {view.feedback === 'incorrect' && <p className="error" role="status">That arrangement is incorrect. Try again.</p>}
  </>
}

export function LostInstructionsView({ progress, data, disabled, send }: {
  progress: GameProgress; data: unknown; disabled: boolean; send: (action: unknown) => void
}) {
  const view = data as LostView
  if (view.role === 'instructor') return <>
    <p>Instructor · Only you can see the solution. Tell your partner the color, shape, and position of each piece, from left to right. Read the clue aloud or send it in chat.</p>
    {view.instruction ? <div className="card slot">
      <strong>Your private instruction</strong>
      <div className="lost-spoken-text">
        <p className="lost-instruction" lang={view.language && languageTags[view.language]}>{view.instruction}</p>
        {view.language && <PronunciationButton text={view.instruction} language={view.language} />}
      </div>
      {(view.targetArrangement || view.hint) && <details key={progress.matchId + ':' + progress.round}>
        <summary>Hint: show the goal arrangement</summary>
        {view.targetArrangement && <figure className="shape-target" aria-label="Your private target arrangement">
          <figcaption>Your target arrangement <small>Describe this picture to your partner.</small></figcaption>
          <div className="shape-target-pieces">{view.targetArrangement.map((piece, index) => <div className="shape-target-piece" key={piece.id}
            aria-label={['Left', 'Middle', 'Right'][index] + ': ' + piece.color + ' ' + piece.shape}>
            <span className="lost-piece"><Shape piece={piece} /></span>
            <strong>{['Left', 'Middle', 'Right'][index]}</strong>
            <small>{piece.color} {piece.shape}</small>
          </div>)}</div>
        </figure>}
        {view.hint && <div className="lost-spoken-text">
          <p lang={view.hintLanguage && languageTags[view.hintLanguage]}>{view.hint}</p>
          {view.hintLanguage && <PronunciationButton text={view.hint} language={view.hintLanguage}
            label={'Pronounce hint in ' + view.hintLanguage} />}
        </div>}
      </details>}
    </div> : <p>Get ready to give instructions.</p>}
  </>
  return <>
    <p>Operator · Only you can move the pieces. Ask your partner where each one belongs. Shapes and colors may repeat, so identify each piece by both its shape and color.</p>
    <Operator key={progress.matchId + ':' + progress.round} view={view} disabled={disabled}
      send={action => send({ ...action, round: progress.round, revision: view.revision })} />
  </>
}
