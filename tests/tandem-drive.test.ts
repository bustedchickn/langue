import assert from 'node:assert/strict'
import { test } from 'node:test'
import { generateCourse, hitsHazard, startTandemDrive } from '../server/minigames/tandem-drive/game'
import { driveStep } from '../shared/minigames/drive-physics'
import type { GamePlayers } from '../shared/minigames/contracts'
import { gateDistance, laneX, switchDistance, type DriveView } from '../shared/minigames/tandem-drive'

const players: GamePlayers = {
  host: { name: 'Navigator', learningLanguage: 'French' },
  guest: { name: 'Cadence', learningLanguage: 'English' },
}
const pedal = (down: boolean, swapped = false) => ({ type: 'pedal', down, swapped })

test('prototype steering pivots around the idle wheel and brakes without drift', () => {
  const start = { x: 0, y: 0, angle: -Math.PI / 2 }
  assert.equal(driveStep(start, false, false, 1), start)
  assert.equal(driveStep(start, true, true, 1).y, -118)
  const left = driveStep(start, true, false, .25)
  const right = driveStep(start, false, true, .25)
  assert.ok(left.y < 0 && left.x > 0 && left.angle > start.angle)
  assert.equal(left.y.toFixed(8), right.y.toFixed(8))
  assert.equal(left.x.toFixed(8), (-right.x).toFixed(8))
})

test('held controls advance on server ticks, expire, and stop on disconnect', () => {
  const game = startTandemDrive('a', players, 0, () => 0)
  const host = () => game.view('host', 0) as DriveView
  const guest = game.view('guest', 0) as DriveView
  assert.equal('openBeat' in host(), false)
  assert.equal('gate' in guest, false)
  assert.deepEqual(host().hazards[0], guest.hazards[0])
  assert.equal(host().hazards[0].vis, 'BOTH')
  assert.equal(host().hazards.length, 2)
  assert.equal(guest.hazards.length, 1)
  assert.ok(game.act('host', pedal(true), 0))
  assert.ok(game.act('guest', pedal(true), 0))
  for (let now = 20; now <= 500; now += 20) game.tick(now)
  assert.ok(Math.abs(host().distance - 53.1) < 2)
  const stopped = host().distance
  game.tick(600)
  assert.equal(host().distance, stopped)
  game.act('host', pedal(true), 600)
  game.tick(650)
  game.suspend?.(650)
  const paused = host().distance
  game.tick(700)
  assert.equal(host().distance, paused)
})

test('gate blocks the vehicle until cadence releases it, and the switch is rolled once per run', () => {
  for (const roll of [0, 29, 30, 99]) {
    let draw = 0
    const game = startTandemDrive('a', players, 0, () => {
      const index = draw++
      // Keep the scripted route clear while placing the first gate in lane 1.
      const innerHazardSide = index >= 7 && (index - 7) % 10 === 0
      return index === 0 ? roll : index === 9 || (innerHazardSide && Math.floor((index - 7) / 10) % 2 === 0) ? 1 : 0
    })
    const view = (now: number) => game.view('host', now) as DriveView
    let sawLocked = false
    let sawRelease = false
    for (let now = 0; now <= 17000; now += 20) {
      game.tick(now)
      const before = view(now)
      if (before.stage === 0 && before.blocked && before.distance > 630 && !sawRelease) {
        sawLocked = true
        assert.equal(game.act('host', { type: 'release-gate', swapped: false }, now), false)
      }
      if (sawLocked && before.distance > (before.stage + 1) * gateDistance - 170 &&
          game.act('guest', { type: 'release-gate', swapped: false }, now) && view(now).unlockedUntil > now) {
        sawRelease = true
      }
      if (before.distance >= switchDistance) {
        assert.equal(sawLocked, true)
        assert.equal(sawRelease, true)
        assert.equal(before.swapped, roll < 30)
        assert.equal(before.role, roll < 30 ? 'cadence' : 'navigation')
        assert.equal('gate' in before, roll >= 30)
        break
      }
      if (now === 17000) assert.fail(`Did not reach the switch position for roll ${roll}: ${JSON.stringify(before)}`)
      if (now % 100 === 0) {
        game.act('host', pedal(true), now)
        game.act('guest', pedal(true), now)
      }
    }
  }
})

test('a solid obstacle prevents crossing and generated courses leave a route in every sector', () => {
  const game = startTandemDrive('a', players, 0, () => 0)
  for (let now = 0; now <= 3800; now += 20) {
    game.tick(now)
    if (now % 100 === 0) {
      game.act('host', pedal(true), now)
      game.act('guest', pedal(true), now)
    }
  }
  const view = game.view('host', 3800) as DriveView
  assert.ok(view.blocked)
  assert.ok(view.distance < 425)
  assert.ok(view.hull < 100)

  let seed = 15
  const pick = (max: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed % max
  }
  const shapes = new Set<string>()
  const sizes = new Set<number>()
  for (let run = 0; run < 200; run++) {
    for (const [stage, sector] of generateCourse(pick).entries()) {
      const [first, second] = sector.hazards
      for (const hazard of sector.hazards) {
        shapes.add(hazard.shape)
        sizes.add(hazard.w)
      }
      assert.ok(laneX.some(x => sector.hazards.every(hazard => !hitsHazard({ x, y: hazard.y }, hazard))))
      // The clear stretches before the first barrier and after the second
      // accommodate the 68px north displacement of a 180px lateral maneuver.
      assert.ok(-first.y - stage * gateDistance - first.h / 2 - 38 >= 68)
      assert.ok((stage + 1) * gateDistance + second.y - second.h / 2 - 38 - 36 >= 68)
    }
  }
  assert.equal(shapes.size, 3)
  assert.ok(sizes.size > 3)
})
test('hazards are randomized and the timer ends an unfinished run', () => {
  const first = startTandemDrive('a', players, 0, () => 0)
  const second = startTandemDrive('b', players, 0, max => max - 1)
  assert.notDeepEqual((first.view('host', 0) as DriveView).hazards, (second.view('host', 0) as DriveView).hazards)
  first.tick(150000)
  assert.equal(first.results()?.outcome, 'defeat')
  assert.equal(first.act('host', pedal(true), 150001), false)
})
