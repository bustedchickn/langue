import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startSpotDifference } from '../server/minigames/spot-difference/game'
import { sceneObjects, sceneObjectWord, type SpotDifferenceView } from '../shared/minigames/spot-difference'

test('each player receives their own learning language and the vocabulary matches changed objects', () => {
  const seen = new Set<string>()
  let seed = 42
  const pick = (max: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max }
  for (let i = 0; i < 30; i++) {
    const game = startSpotDifference('words-' + i, {
      host: { name: 'A', learningLanguage: 'French' }, guest: { name: 'B', learningLanguage: 'Spanish' },
    }, 0, undefined, pick)
    for (const seat of ['host', 'guest'] as const) {
      const view = game.view(seat, 3000) as SpotDifferenceView
      assert.equal(view.language, seat === 'host' ? 'French' : 'Spanish')
      for (const object of view.objects) {
        seen.add(object.name)
        assert.ok(sceneObjectWord(object.name, view.language).length > 0)
        if (object.emoji === '🐕') assert.equal(sceneObjectWord(object.name, 'Spanish'), 'Perro')
        if (object.emoji === '🕯️') assert.equal(sceneObjectWord(object.name, 'French'), 'Bougie')
        if (object.emoji === '🌵') assert.equal(object.name, 'Cactus')
      }
    }
  }
  for (const name of ['Dog', 'Candle', 'Cactus']) assert.ok(seen.has(name))
  for (const object of sceneObjects) {
    for (const language of ['English', 'French', 'Spanish'] as const) assert.ok(sceneObjectWord(object.name, language))
  }
  assert.equal(sceneObjectWord('Chair', 'French'), 'Chaise')
  assert.equal(sceneObjectWord('Globe', 'Spanish'), 'Globo terráqueo')
})

test('all ten additional object pairs appear as genuine differences with translated names', () => {
  const pairs = new Set(['fruit', 'drink', 'music', 'ball', 'vehicle', 'flower', 'bird', 'snack', 'clothing', 'weather'])
  const seen = new Set<string>()
  let seed = 123
  const pick = (max: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max }
  for (let index = 0; index < 200; index++) {
    const game = startSpotDifference('pairs-' + index, {
      host: { name: 'A', learningLanguage: 'French' }, guest: { name: 'B', learningLanguage: 'Spanish' },
    }, 0, undefined, pick)
    const host = game.view('host', 3000) as SpotDifferenceView
    const guest = game.view('guest', 3000) as SpotDifferenceView
    const changed = host.objects.filter(object => object.emoji !== guest.objects.find(other => other.id === object.id)?.emoji)
    assert.equal(changed.length, 3)
    assert.equal(host.objects.length, 5)
    for (const object of changed) {
      if (!pairs.has(object.id)) continue
      seen.add(object.id)
      const other = guest.objects.find(item => item.id === object.id)!
      assert.ok(sceneObjectWord(object.name, 'French'))
      assert.ok(sceneObjectWord(other.name, 'Spanish'))
    }
    const deadline = game.progress(3000).endsAt
    game.tick(deadline)
    assert.equal(game.results()?.outcome, 'defeat')
    assert.equal(game.act('host', { type: 'select', objectId: changed[0].id }, deadline + 1), false)
  }
  assert.deepEqual(seen, pairs)
})
