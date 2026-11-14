import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startMapNavigator } from '../server/minigames/map-navigator/game'
import type { GamePlayers } from '../shared/minigames/contracts'
import type { MapDirection, MapNavigatorView, Point } from '../shared/minigames/map-navigator'

const players: GamePlayers = {
  host: { name: 'Navigator', learningLanguage: 'French' },
  guest: { name: 'Traveler', learningLanguage: 'English' },
}
const same = (a: Point, b: Point) => a.row === b.row && a.column === b.column
const direction = (a: Point, b: Point): MapDirection =>
  b.row < a.row ? 'up' : b.row > a.row ? 'down' : b.column < a.column ? 'left' : 'right'

test('new maps change both endpoints and keep two reachable checkpoints', () => {
  let previous: MapNavigatorView | undefined
  let interiorDestinations = 0
  for (let i = 0; i < 40; i++) {
    const game = startMapNavigator('map-' + i, players, 0)
    const view = game.view('host', 0) as MapNavigatorView
    assert.ok(view.goal && view.route && view.waypoints)
    if (previous) {
      assert.ok(!same(view.position, previous.position))
      assert.ok(!same(view.goal, previous.goal!))
    }
    const shortestSteps = Math.abs(view.position.row - view.goal.row) + Math.abs(view.position.column - view.goal.column)
    assert.equal(view.route.length, shortestSteps + 1)
    assert.equal(new Set(view.route.map(point => point.row + ',' + point.column)).size, view.route.length)
    if (view.goal.row > 0 && view.goal.row < 6 && view.goal.column > 0 && view.goal.column < 6) interiorDestinations++
    assert.deepEqual(view.route[0], view.position)
    assert.deepEqual(view.route.at(-1), view.goal)
    assert.deepEqual(view.waypoints, [view.route[Math.floor(shortestSteps / 3)], view.route[Math.floor(shortestSteps * 2 / 3)]])
    for (let step = 1; step < view.route.length; step++) {
      assert.equal(game.act('guest', { type: 'move', direction: direction(view.route[step - 1], view.route[step]) }, 3000 + step), true)
    }
    assert.equal((game.view('host', 3000 + view.route.length) as MapNavigatorView).checkpoints, 2)
    assert.equal(game.results()?.outcome, 'victory')
    previous = view
  }
  assert.ok(interiorDestinations > 0)
})
