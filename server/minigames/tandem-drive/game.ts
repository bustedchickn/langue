import { randomInt } from 'node:crypto'
import { gameTimeMultiplier, practiceDuration } from '../../../shared/minigames/timing'
import type { GamePlayers, GameResults, Seat } from '../../../shared/minigames/contracts'
import { driveStep } from '../../../shared/minigames/drive-physics'
import { beatMs, driveMaps, gateDistance, laneX, releaseDuration, releaseRange, stages, switchChancePercent, switchDistance, tandemDrive, type DriveView, type Hazard, type DriveMap } from '../../../shared/minigames/tandem-drive'
import type { ActiveMinigame, ServerMinigame } from '../contracts'

type Position = { x: number; y: number }

// A 38px circle encloses the crawler. Each row has a single obstacle and
// enough longitudinal clearance for a two-pivot lane change between rows.
export function hitsHazard(pose: Position, hazard: Hazard) {
  const x = Math.abs(pose.x - hazard.x)
  const y = Math.abs(pose.y - hazard.y)
  if (hazard.shape === 'drum') return Math.hypot(x, y) < hazard.w / 2 + 38
  return Math.hypot(Math.max(0, x - hazard.w / 2), Math.max(0, y - hazard.h / 2)) < 38
}

const barrierShapes = [
  { shape: 'crate', w: 68, h: 43, label: 'CRATE' },
  { shape: 'drum', w: 56, h: 56, label: 'DRUM' },
  { shape: 'rail', w: 116, h: 22, label: 'RAIL' },
] as const

export function generateCourse(pick = randomInt, map: DriveMap = driveMaps[0]) {
  return Array.from({ length: stages }, (_, index) => {
    const hazard = (offset: number, vis: Hazard['vis']): Hazard => {
      const shape = barrierShapes[pick(barrierShapes.length)]
      const size = (85 + pick(31)) / 100
      const side = (index + pick(2)) % 2
      const lane = vis === 'BOTH' ? [0, 3][side] : [1, 2][side]
      return { ...shape, w: shape.w * size, h: shape.h * size,
        x: laneX[lane], y: -(index * gateDistance + offset + pick(13)), vis }
    }
    const hazardCount = 2 + Math.floor(index / 2)
    const hazards = [hazard(190, 'BOTH'), hazard(425, index % 2 === 0 ? 'P1_ONLY' : 'P2_ONLY')]
    if (hazardCount > 2) {
      const extra = barrierShapes[index % barrierShapes.length]
      const extraLane = map.id === 'ember-canyon' ? 3 : index % 2 ? 3 : 0
      hazards.push({ ...extra, w: extra.w * .9, h: extra.h * .9, x: laneX[extraLane], y: -(index * gateDistance + 545), vis: 'BOTH' })
    }
    return { gate: pick(4), openBeat: pick(4), kind: index % 2 === 0 ? 'lane' as const : 'cycle' as const, hazards }
  })
}

export function startTandemDrive(matchId: string, players: GamePlayers, started: number, pick = randomInt): ActiveMinigame {
  const timeMultiplier = gameTimeMultiplier(players)
  const endsAt = started + practiceDuration(tandemDrive.durationMs, timeMultiplier)
  const map = driveMaps[[...matchId].reduce((sum, character) => sum + character.charCodeAt(0), 0) % driveMaps.length]
  const hasSwitch = pick(100) < switchChancePercent
  const course = generateCourse(pick, map)
  let stage = 0
  let pose = { x: -60, y: 0, angle: -Math.PI / 2 }
  let hull = 100
  let swapped = false
  let message = ''
  let result: GameResults | undefined
  let simulatedAt = started
  let damageUntil = started
  const pedals: Record<Seat, number> = { host: started, guest: started }
  let unlockedUntil = 0
  let impact = 0
  let blocked = false
  let lastRelease = started - 500
  const navigation = (seat: Seat) => (seat === 'host') !== swapped
  const engaged = (seat: Seat, now: number) => pedals[seat] > now

  function finish(outcome: GameResults['outcome'], now: number, endedEarly = false) {
    result = { gameId: tandemDrive.id, outcome, completed: stage, attempted: Math.min(stage + 1, stages),
      elapsedMs: Math.max(0, now - started), score: stage * tandemDrive.scoring.gate, players: [players.host.name, players.guest.name],
      ...(endedEarly ? { endedEarly: true } : {}) }
  }

  function advance(now: number, seconds: number) {
    const before = pose
    const next = driveStep(before, engaged(swapped ? 'guest' : 'host', now), engaged(swapped ? 'host' : 'guest', now), seconds)
    if (before === next) return
    const current = course[stage]
    const candidate = { ...next, x: Math.max(-202, Math.min(202, next.x)), y: Math.min(85, next.y) }
    const barrier = current.hazards.some(hazard => hitsHazard(candidate, hazard))
    const gateY = -(stage + 1) * gateDistance
    const crossing = before.y > gateY + 36 && candidate.y <= gateY + 36
    const wrongLane = current.kind === 'lane' && Math.abs(candidate.x - laneX[current.gate]) > 48
    const beat = Math.floor((now - started) / beatMs) % 4
    const cycleOpen = beat === current.openBeat || beat === (current.openBeat + 1) % 4
    const shutter = crossing && (wrongLane || (current.kind === 'cycle' ? !cycleOpen : now >= unlockedUntil))
    blocked = barrier || shutter || candidate.x !== next.x
    if (barrier || shutter) {
      // Preserve steering at a stop so players can turn away from a barrier.
      pose = { ...before, angle: next.angle }
      if (now >= damageUntil) {
        impact++
        damageUntil = now + 1400
        if (barrier) hull = Math.max(0, hull - 5)
        message = barrier ? 'Solid barrier · pivot around it'
          : wrongLane ? 'Wrong lane · ask your navigator' : current.kind === 'cycle'
            ? 'Shutter closed · wait for your partner’s call' : 'Gate locked · cadence player, release the latch!'
      }
    } else {
      pose = candidate
      if (crossing) {
        stage++
        unlockedUntil = 0
        hull = Math.min(100, hull + 8)
        message = 'Gate cleared · hull +8'
      }
    }
    if (hasSwitch && !swapped && pose.y <= -switchDistance) {
      swapped = true
      pedals.host = pedals.guest = now
      message = 'Side switch · pedals and views swapped!'
    }
    if (!hull) finish('defeat', now)
    else if (stage === stages) finish('victory', now)
  }

  function tick(now: number) {
    const target = Math.min(now, endsAt)
    // Cap catch-up after a stalled event loop so stale controls cannot jump the car.
    simulatedAt = Math.max(simulatedAt, target - 100)
    while (!result && simulatedAt < target) {
      const step = Math.min(1000 / 60, target - simulatedAt)
      advance(simulatedAt, step / 1000)
      simulatedAt += step
    }
    if (!result && now >= endsAt) finish('defeat', endsAt)
  }

  return {
    updateIntervalMs: 1000 / 30,
    tick, results: () => result,
    finishEarly(now) {
      tick(now)
      if (result) return
      pedals.host = pedals.guest = now
      finish('defeat', now, true)
    },
    suspend(now) { pedals.host = pedals.guest = now },
    progress: now => ({ gameId: tandemDrive.id, matchId, round: Math.min(stage + 1, stages), rounds: stages, timeMultiplier,
      completed: stage, score: stage, startsAt: started, endsAt, serverNow: now }),
    view(seat, now): DriveView {
      const navigator = navigation(seat)
      const side = navigator ? 'left' : 'right'
      const current = course[Math.min(stage, stages - 1)]
      const common = { x: pose.x, angle: pose.angle, distance: -pose.y, stage, hull, map,
        hazards: current.hazards.filter(hazard => hazard.vis === 'BOTH' || hazard.vis === (navigator ? 'P1_ONLY' : 'P2_ONLY')),
        side, left: engaged(swapped ? 'guest' : 'host', now), right: engaged(swapped ? 'host' : 'guest', now),
        swapped, switchAhead: hasSwitch && !swapped && stage === 2, message, gateKind: current.kind, unlockedUntil, serverNow: now, impact, blocked } as const
      return navigator ? { ...common, role: 'navigation', ...(current.kind === 'lane' ? { gate: current.gate } : {}) }
        : { ...common, role: 'cadence', beatStartsAt: started, openBeat: current.openBeat }
    },
    act(seat, value, now) {
      if (result || !value || typeof value !== 'object') return false
      const action = value as Record<string, unknown>
      if (action.swapped !== swapped) return false
      if (action.type === 'release-gate') {
        if (navigation(seat) || course[stage].kind !== 'lane' || now - lastRelease < 500 ||
            now < unlockedUntil || (stage + 1) * gateDistance + pose.y > releaseRange) return false
        lastRelease = now
        const beat = Math.floor((now - started) / beatMs) % 4
        const openBeat = course[stage].openBeat
        if (beat === openBeat || beat === (openBeat + 1) % 4) {
          unlockedUntil = now + releaseDuration
          message = 'Gate released · go!'
        } else {
          message = 'Off beat · try the next green beat'
        }
        return true
      }
      if (action.type !== 'pedal' || typeof action.down !== 'boolean') return false
      pedals[seat] = now + (action.down ? 450 : 0)
      return true
    },
  }
}

export const tandemDriveServer: ServerMinigame = {
  config: tandemDrive,
  start: (id, players, now) => startTandemDrive(id, players, now),
}

