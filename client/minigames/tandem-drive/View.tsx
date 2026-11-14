import { useEffect, useRef, useState } from 'react'
import type { GameProgress, GameResults } from '../../../shared/minigames/contracts'
import { beatMs, gateDistance, lanes, releaseRange, type DriveView } from '../../../shared/minigames/tandem-drive'
import { driveStep } from '../../../shared/minigames/drive-physics'
import { drawCourse } from './art'
import './drive.css'

export function TandemDriveView({ data, progress, disabled, send }: {
  data: unknown; progress: GameProgress; disabled: boolean; send: (action: unknown) => void
}) {
  const view = data as DriveView
  const canvas = useRef<HTMLCanvasElement>(null)
  const frame = useRef({ view, received: performance.now() })
  const latestSend = useRef(send)
  const pressed = useRef(false)
  const [holding, setHolding] = useState(false)

  useEffect(() => { latestSend.current = send }, [send])
  useEffect(() => { frame.current = { view, received: performance.now() } }, [view])
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
        angle: pose.angle, serverNow: current.serverNow + seconds * 1000 })
      id = requestAnimationFrame(render)
    }
    id = requestAnimationFrame(render)
    return () => cancelAnimationFrame(id)
  }, [])

  function pedal(down: boolean) {
    if (pressed.current === down || (disabled && down)) return
    pressed.current = down
    setHolding(down)
    latestSend.current({ type: 'pedal', down, swapped: view.swapped })
  }

  useEffect(() => {
    const swapped = view.swapped
    setHolding(false)
    const release = () => {
      if (!pressed.current) return
      pressed.current = false
      setHolding(false)
      latestSend.current({ type: 'pedal', down: false, swapped })
    }
    const timer = setInterval(() => {
      if (pressed.current && !disabled) latestSend.current({ type: 'pedal', down: true, swapped })
    }, 150)
    window.addEventListener('blur', release)
    document.addEventListener('visibilitychange', release)
    return () => {
      release()
      clearInterval(timer)
      window.removeEventListener('blur', release)
      document.removeEventListener('visibilitychange', release)
    }
  }, [view.swapped, disabled, progress.matchId])

  const remaining = Math.max(0, Math.round((view.stage + 1) * gateDistance - view.distance - 36))
  const released = view.unlockedUntil > progress.serverNow
  return <div className="drive">
    <div className="drive-telemetry">
      <strong>{view.role === 'navigation' ? 'Optic · Navigation' : 'Radar · Cadence'}</strong>
      <span className="drive-hull" data-low={view.hull < 35}>Hull {view.hull}% <meter min={0} max={100} value={view.hull} aria-label="Hull integrity" /></span>
    </div>
    <p className="drive-map-brief"><strong>{view.map.name}</strong> · {view.map.subtitle} · Communication is required at every gate.</p>
    <div className="drive-gate-status" data-ready={released}>
      <strong>{view.gateKind === 'cycle' ? 'CYCLING SHUTTER' : released ? 'GATE RELEASED · ' + ((view.unlockedUntil - progress.serverNow) / 1000).toFixed(1) + 's'
        : 'GATE LOCKED'}</strong> <span>{remaining}px to gate</span>
    </div>
    <div className="drive-viewport" aria-label={`Current heading ${Math.round(((view.angle + Math.PI / 2) * 180 / Math.PI + 360) % 360)} degrees`}>
      <div className="drive-heading" aria-hidden="true" style={{ transform: `rotate(${view.angle + Math.PI / 2}rad)` }}>↑</div>
      <canvas ref={canvas} width={500} height={378} aria-label="Northbound crawler, gates and visible barriers" />
    </div>
    {view.impact > 0 && <div key={view.impact} className="drive-impact" aria-hidden="true" />}
    {view.role === 'navigation' ? <p>{view.gate !== undefined ? <>Safe gate <strong>{lanes[view.gate]}</strong> · Tell your partner.</>
      : 'Any lane works here. Listen for your partner’s timing.'}</p>
      : <Cadence startsAt={view.beatStartsAt} openBeat={view.openBeat} serverNow={progress.serverNow}
          cycle={view.gateKind === 'cycle'}
          disabled={disabled || released || remaining > releaseRange - 36}
          release={() => send({ type: 'release-gate', swapped: view.swapped })} />}
    <p role="status">{view.message || 'Hold both pedals to drive straight. Hold one to pivot. Release to stop.'}</p>
    <button className="secondary drive-pedal" data-side={view.side} disabled={disabled} aria-pressed={holding}
      onPointerDown={event => {
        if (!event.isPrimary || event.button !== 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
        pedal(true)
      }}
      onPointerUp={() => pedal(false)} onPointerCancel={() => pedal(false)} onLostPointerCapture={() => pedal(false)}
      onKeyDown={event => {
        if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); pedal(true) }
      }}
      onKeyUp={event => {
        if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); pedal(false) }
      }}
      onBlur={() => pedal(false)}>{view.side === 'left' ? 'Left' : 'Right'} thruster</button>
  </div>
}

function Cadence({ startsAt, openBeat, serverNow, disabled, release, cycle }: {
  startsAt: number; openBeat: number; serverNow: number; disabled: boolean; release: () => void; cycle: boolean
}) {
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
    <p>{cycle ? 'The shutter opens automatically on green beats. Call “go.”' : 'Near the gate, release the latch on a green beat and call “go.”'}</p>
    <div className="drive-beats" aria-label={'Current beat ' + (beat + 1)}>
      {[0, 1, 2, 3].map(i => <span key={i} data-current={i === beat} data-open={i === openBeat || i === (openBeat + 1) % 4}>{i + 1}</span>)}
      <strong>{open ? 'GO' : 'WAIT'}</strong>
    </div>
    {!cycle && <button className="secondary drive-release" data-open={open} disabled={disabled} onClick={release}>Release gate</button>}
  </div>
}

export function TandemDriveResults({ result }: { result: GameResults }) {
  return <>
    <h3 className="game-outcome">{result.outcome === 'victory' ? 'Extraction complete' : 'Run ended'}</h3>
    <p>{result.players.join(' & ')}</p>
    <p>Gates cleared · {result.completed}</p>
    <p>Elapsed · {Math.ceil(result.elapsedMs / 1000)}s</p>
  </>
}
