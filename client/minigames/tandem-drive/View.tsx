import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import type { GameProgress, GameResults } from '../../../shared/minigames/contracts'
import { beatMs, gateDistance, gateWordsFor, releaseRange, stages, type DriveView } from '../../../shared/minigames/tandem-drive'
import { driveStep } from '../../../shared/minigames/drive-physics'
import { drawCourse } from './art'
import { useInterface } from '../../locales/interface'
import { driveText } from '../../locales/tandem-drive'
import { playEffect } from '../../sounds'
import './drive.css'

function useDriveText() {
  const { language } = useInterface()
  return useCallback((label: string, fallback = label) => driveText(language, label, fallback), [language])
}

export function TandemDriveView({ data, progress, disabled, send }: {
  data: unknown; progress: GameProgress; disabled: boolean; send: (action: unknown) => void
}) {
  const view = data as DriveView
  const t = useDriveText()
  const canvas = useRef<HTMLCanvasElement>(null)
  const frame = useRef({ view, received: performance.now() })
  const latestSend = useRef(send)
  const pressed = useRef(false)
  const sources = useRef(new Set<string>())
  const controls = useRef({ disabled, swapped: view.swapped })
  const clearedGates = useRef({ matchId: progress.matchId, stage: view.stage })
  controls.current = { disabled, swapped: view.swapped }
  const [holding, setHolding] = useState(false)

  useEffect(() => { latestSend.current = send }, [send])
  useEffect(() => { frame.current = { view, received: performance.now() } }, [view])
  useEffect(() => {
    if (clearedGates.current.matchId !== progress.matchId) clearedGates.current = { matchId: progress.matchId, stage: view.stage }
    else if (view.stage > clearedGates.current.stage && view.stage < stages) playEffect('correct')
    clearedGates.current.stage = view.stage
  }, [progress.matchId, view.stage])
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    let id: number
    function render(now: number) {
      const { view: current, received } = frame.current
      const seconds = Math.max(0, Math.min(45, now - received)) / 1000
      const pose = driveStep({ x: current.x, y: -current.distance, angle: current.angle }, current.left, current.right,
        current.blocked ? 0 : seconds)
      drawCourse(ctx!, { ...current, x: Math.max(-202, Math.min(202, pose.x)), distance: -pose.y,
        angle: pose.angle, serverNow: current.serverNow + seconds * 1000 }, t)
      id = requestAnimationFrame(render)
    }
    id = requestAnimationFrame(render)
    return () => cancelAnimationFrame(id)
  }, [t])

  function pedal(down: boolean) {
    if (pressed.current === down || (controls.current.disabled && down)) return
    pressed.current = down
    setHolding(down)
    latestSend.current({ type: 'pedal', down, swapped: controls.current.swapped })
  }

  function hold(source: string, down: boolean) {
    if (down && controls.current.disabled) return
    if (down) sources.current.add(source)
    else sources.current.delete(source)
    pedal(sources.current.size > 0)
  }

  function pointerDown(event: PointerEvent<HTMLElement>) {
    if (controls.current.disabled || !event.isPrimary || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    hold('pointer:' + event.pointerId, true)
  }
  function pointerRelease(event: PointerEvent<HTMLElement>) { hold('pointer:' + event.pointerId, false) }

  useEffect(() => {
    const swapped = view.swapped
    setHolding(false)
    const release = () => {
      sources.current.clear()
      if (!pressed.current) return
      pressed.current = false
      setHolding(false)
      latestSend.current({ type: 'pedal', down: false, swapped })
    }
    const typing = (target: EventTarget | null) => target instanceof HTMLElement &&
      !!target.closest('input, textarea, select, [contenteditable]:not([contenteditable=false])')
    const keyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const space = event.code === 'Space' || event.key === ' '
      const enter = event.key === 'Enter' && !!target?.closest('.drive-pedal, .drive-viewport')
      if ((!space && !enter) || event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented || typing(target) ||
          target?.closest('summary, a, dialog[open]') ||
          (target?.closest('button') && !target.closest('.drive-pedal'))) return
      if (controls.current.disabled) return
      event.preventDefault()
      hold(space ? 'space' : 'enter', true)
    }
    const keyUp = (event: KeyboardEvent) => {
      const source = event.code === 'Space' || event.key === ' ' ? 'space' : event.key === 'Enter' ? 'enter' : undefined
      if (source && sources.current.has(source)) {
        event.preventDefault()
        hold(source, false)
      }
    }
    const focus = (event: FocusEvent) => { if (typing(event.target)) release() }
    const timer = setInterval(() => {
      if (pressed.current && !disabled) latestSend.current({ type: 'pedal', down: true, swapped })
    }, 150)
    window.addEventListener('blur', release)
    document.addEventListener('visibilitychange', release)
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    document.addEventListener('focusin', focus)
    return () => {
      release()
      clearInterval(timer)
      window.removeEventListener('blur', release)
      document.removeEventListener('visibilitychange', release)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      document.removeEventListener('focusin', focus)
    }
  }, [view.swapped, disabled, progress.matchId])

  const remaining = Math.max(0, Math.round((view.stage + 1) * gateDistance - view.distance - 36))
  const released = view.unlockedUntil > progress.serverNow
  return <div className="drive">
    <div className="drive-telemetry">
      <strong>{t(view.role === 'navigation' ? 'Optic · Navigation' : 'Radar · Cadence')}</strong>
      <span className="drive-hull" data-low={view.hull < 35}>{t('Hull')} {view.hull}% <meter min={0} max={100} value={view.hull} aria-label={t('Hull integrity')} /></span>
    </div>
    <p className="drive-map-brief"><strong>{t(view.map.name)}</strong> · {t(view.map.subtitle)} · {t('Communication is required at every gate.')}</p>
    <div className="drive-gate-status" data-ready={released}>
      <strong>{view.gateKind === 'cycle' ? t('CYCLING SHUTTER') : released ? t('GATE RELEASED') + ' · ' + ((view.unlockedUntil - progress.serverNow) / 1000).toFixed(1) + 's'
        : t('GATE LOCKED')}</strong> <span>{remaining}{t('px to gate')}</span>
    </div>
    <p className="drive-control-hint">{t(view.side === 'left' ? 'Left control' : 'Right control',
      `Hold Space or press and hold the driving area to use your ${view.side} thruster. Release to stop your side. You can type normally in chat.`)}</p>
    <div className="drive-viewport" data-side={view.side} role="button" tabIndex={disabled ? -1 : 0} aria-pressed={holding} aria-disabled={disabled}
      aria-label={t(view.side === 'left' ? 'Hold driving area for your left thruster' : 'Hold driving area for your right thruster')}
      onPointerDown={pointerDown} onPointerUp={pointerRelease} onPointerCancel={pointerRelease} onLostPointerCapture={pointerRelease}>
      <canvas ref={canvas} width={500} height={378} aria-label={t('Pink car, gates and visible barriers')} />
    </div>
    {view.impact > 0 && <div key={view.impact} className="drive-impact" aria-hidden="true" />}
    {view.role === 'navigation' ? <p>{view.gate !== undefined ? <>{t('Safe gate')} <strong>{gateWordsFor(view.stage, view.language)[view.gate]}</strong> · {t('Tell your partner.')}</>
      : t('Any lane works here. Listen for your partner’s timing.')}</p>
      : <Cadence startsAt={view.beatStartsAt} openBeat={view.openBeat} serverNow={progress.serverNow}
          cycle={view.gateKind === 'cycle'}
          disabled={disabled || released || remaining > releaseRange - 36}
          release={() => send({ type: 'release-gate', swapped: view.swapped })} />}
    <p role="status">{t(view.message || 'Hold both pedals to drive straight. Hold one to pivot. Release to stop.')}</p>
    <button className="secondary drive-pedal" data-side={view.side} disabled={disabled} aria-pressed={holding}
      onPointerDown={pointerDown} onPointerUp={pointerRelease} onPointerCancel={pointerRelease} onLostPointerCapture={pointerRelease}
      >{t(view.side === 'left' ? 'Left thruster' : 'Right thruster')}</button>
  </div>
}

function Cadence({ startsAt, openBeat, serverNow, disabled, release, cycle }: {
  startsAt: number; openBeat: number; serverNow: number; disabled: boolean; release: () => void; cycle: boolean
}) {
  const t = useDriveText()
  const [beat, setBeat] = useState(0)
  useEffect(() => {
    const received = performance.now()
    function update() { setBeat(Math.floor((serverNow - startsAt + performance.now() - received) / beatMs) % 4) }
    update()
    const timer = setInterval(update, 40)
    return () => clearInterval(timer)
  }, [startsAt, serverNow])
  const open = beat === openBeat || beat === (openBeat + 1) % 4
  return <div>
    <p>{t(cycle ? 'The shutter opens automatically on green beats. Call “go.”' : 'Near the gate, release the latch on a green beat and call “go.”')}</p>
    <div className="drive-beats" aria-label={t('Current beat') + ' ' + (beat + 1)}>
      {[0, 1, 2, 3].map(i => <span key={i} data-current={i === beat} data-open={i === openBeat || i === (openBeat + 1) % 4}>{i + 1}</span>)}
      <strong>{t(open ? 'GO' : 'WAIT')}</strong>
    </div>
    {!cycle && <button className="secondary drive-release" data-open={open} disabled={disabled} onClick={release}>{t('Release gate')}</button>}
  </div>
}

export function TandemDriveResults({ result }: { result: GameResults }) {
  const t = useDriveText()
  return <>
    <h3 className="game-outcome">{t(result.endedEarly ? 'Game ended early' : result.outcome === 'victory' ? 'Extraction complete' : 'Run ended')}</h3>
    <p>{result.players.join(' & ')}</p>
    <p>{t('Gates cleared')} · {result.completed}</p>
    <p>{t('Elapsed')} · {Math.ceil(result.elapsedMs / 1000)}s</p>
  </>
}
