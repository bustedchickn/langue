import assert from 'node:assert/strict'
import { test } from 'node:test'
import { interfaceCopy } from '../client/locales/interface'
import { germanGuides } from '../client/locales/game-guides-de'
import { localizedGuides } from '../client/locales/game-guides'
import { codenamesCopy } from '../client/minigames/codenames/copy'
import { germanDriveText } from '../client/locales/tandem-drive-de'
import { driveTranslation } from '../client/locales/tandem-drive'
import { sessionStrings } from '../client/locales/session'
import { pronunciationLocales, selectVoice } from '../client/pronunciation/config'
import { startLostInstructions } from '../server/minigames/lost-instructions/game'
import { arrangementInstructions, generatePuzzle, generatePuzzles } from '../server/minigames/lost-instructions/puzzles'
import { gameIcons } from '../shared/minigames/icons'
import type { LostView } from '../shared/minigames/lost-instructions'
import { mapNavigatorLanguage, mapNavigatorLandmarks } from '../shared/minigames/map-navigator'
import { sceneObjects, sceneObjectWord, spotLanguage } from '../shared/minigames/spot-difference'
import { isEnabledLanguage, languageNames, registeredLanguages } from '../shared/types'

test('ten languages have metadata and all keys in the interface catalog', () => {
  assert.equal(registeredLanguages.length, 10)
  for (const language of registeredLanguages) {
    assert.ok(languageNames[language])
    assert.ok(pronunciationLocales[language])
    assert.deepEqual(Object.keys(interfaceCopy[language]).sort(), Object.keys(interfaceCopy.English).sort())
    assert.match(interfaceCopy[language].searchTime(37), /37/)
  }
  assert.deepEqual(registeredLanguages.filter(isEnabledLanguage), registeredLanguages)
  assert.equal(isEnabledLanguage(undefined), false)
})

test('all registered languages have icon, navigation and scene vocabulary', () => {
  assert.equal(gameIcons.size, 20)
  for (const language of registeredLanguages) {
    for (const icon of gameIcons.values()) assert.ok(icon.translations[language].trim())
    const { landmarks, vocabulary } = mapNavigatorLanguage(language)
    assert.equal(vocabulary.length, 8)
    assert.ok(vocabulary.every(entry => entry.translated.trim()))
    assert.deepEqual(landmarks.map(({ name, ...point }) => point), mapNavigatorLandmarks.map(({ name, ...point }) => point))
    assert.ok(landmarks.every(landmark => landmark.name.trim()))
    assert.ok(spotLanguage(language).vocabulary.every(entry => entry.translated.trim()))
    assert.ok(sceneObjects.every(object => sceneObjectWord(object.name, language).trim()))
  }
  assert.equal(mapNavigatorLanguage('Chinese').landmarks[0].name, '公园')
  assert.equal(sceneObjectWord('Chair', 'Korean'), '의자')
})

test('shape prompts use language-specific agreement and placement', () => {
  const prompts = arrangementInstructions([
    { id: 'left', shape: 'circle', color: 'red' },
    { id: 'middle', shape: 'square', color: 'blue' },
    { id: 'right', shape: 'star', color: 'yellow' },
  ])
  assert.equal(prompts.German, 'Lege den roten Kreis nach links, das blaue Quadrat in die Mitte und den gelben Stern nach rechts.')
  assert.equal(prompts.Russian, 'Положи красный круг слева, синий квадрат посередине, а жёлтую звезду справа.')
  assert.equal(prompts.Japanese, '赤の丸は左、青の正方形は真ん中、黄色の星は右に置いてください。')
  assert.equal(prompts.Korean, '빨간색 원 조각은 왼쪽에, 파란색 정사각형 조각은 가운데에, 노란색 별 조각은 오른쪽에 놓으세요.')
  assert.equal(prompts.Chinese, '把红色的圆形放在左边，蓝色的正方形放在中间，黄色的星形放在右边。')
  assert.equal(prompts.Italian, 'Metti il cerchio rosso a sinistra, il quadrato blu al centro e la stella gialla a destra.')
  assert.equal(prompts.Portuguese, 'Coloque o círculo vermelho à esquerda, o quadrado azul no meio e a estrela amarela à direita.')
  const puzzle = generatePuzzle('localized', () => 0)
  for (const language of registeredLanguages) assert.ok(puzzle.hints?.[language])
})

test('private shape clues use the instructor’s learning language in a mixed-language game', () => {
  const selected = generatePuzzles(1, () => 0)
  const game = startLostInstructions('multilingual', {
    host: { name: 'A', learningLanguage: 'Japanese' },
    guest: { name: 'B', learningLanguage: 'Portuguese' },
  }, 0, selected)
  const host = game.view('host', 3000) as Extract<LostView, { role: 'instructor' }>
  const guest = game.view('guest', 3000) as LostView
  assert.equal(host.language, 'Japanese')
  assert.equal(host.instruction, selected[0].instructions.Japanese)
  assert.equal(host.hint, selected[0].hints?.Japanese)
  assert.ok(!('instruction' in guest))
})

test('new pronunciation locales never use an English voice as fallback', () => {
  const voice = (lang: string) => ({ lang, localService: true }) as SpeechSynthesisVoice
  for (const language of registeredLanguages.filter(language => !isEnabledLanguage(language))) {
    const locale = pronunciationLocales[language]
    assert.equal(selectVoice([voice('en-US')], locale), undefined)
    const exact = voice(locale)
    assert.equal(selectVoice([voice('en-US'), exact], locale), exact)
  }
})

test('German guides cover the six games, both roles and configurable rules', () => {
  assert.equal(Object.keys(germanGuides).length, 6)
  for (const guide of Object.values(germanGuides)) {
    assert.ok(guide.goal.trim())
    assert.equal(guide.host.filter(value => value.trim()).length, 4)
    assert.equal(guide.guest.filter(value => value.trim()).length, 4)
    assert.equal(guide.rules({ time: '75 Sek.', later: '9 Sek.', points: 42, penalty: 6, hint: 12 }).length, 2)
  }
  const rules = germanGuides.codenames.rules({ time: '', later: '', points: 42, penalty: 6, hint: 12 })
  assert.match(rules[0], /42.*6.*12/)
})

test('Codenames controls and session catalog cover every registered language', () => {
  for (const language of registeredLanguages) {
    const copy = codenamesCopy(language)
    assert.deepEqual(Object.keys(copy).sort(), Object.keys(codenamesCopy('English')).sort(), language)
    assert.ok(Object.values(copy).every(value => typeof value === 'function' || value.trim()), language)
    assert.match(copy.turns(37), /37/)
    assert.match(copy.guesses(37), /37/)
    assert.match(copy.definition('語彙'), /語彙/)
  }
  for (const [key, values] of Object.entries(sessionStrings)) {
    assert.equal(values[0], key)
    assert.equal(values.length, registeredLanguages.length, key)
    assert.ok(values.every(value => value.trim()), key)
    const placeholders = (value: string) => [...value.matchAll(/\{\w+\}/g)].map(match => match[0]).sort()
    for (const value of values) assert.deepEqual(placeholders(value), placeholders(key), key)
  }
  for (const key of ['Voice could not connect', 'Your sign-in expired. Sign in again.', 'Save language assessment',
    'End this game early?', 'Game unavailable.', 'Waiting for both players. The timer is still running.',
    'Check in with your navigator.', 'Wrong turns', '🎉 Differences found!', 'That username is already taken.'] as const) {
    for (const value of sessionStrings[key].slice(1)) assert.notEqual(value, key)
  }
})

test('all nine translated languages have complete drive and guide catalogs', () => {
  assert.deepEqual(Object.keys(localizedGuides).sort(), registeredLanguages.filter(language => language !== 'English').sort())
  const driveKeys = Object.keys(germanDriveText) as (keyof typeof germanDriveText)[]
  for (const language of Object.keys(localizedGuides) as (keyof typeof localizedGuides)[]) {
    const guides = localizedGuides[language]
    assert.deepEqual(Object.keys(guides).sort(), Object.keys(germanGuides).sort(), language)
    for (const guide of Object.values(guides)) {
      assert.ok(guide.goal.trim(), language)
      assert.equal(guide.host.filter(text => text.trim()).length, 4, language)
      const values = { time: '53s', later: '13s', points: 67, penalty: 29, hint: 19 }
      const guest = typeof guide.guest === 'function' ? guide.guest(values) : guide.guest
      assert.equal(guest.filter(text => text.trim()).length, 4, language)
      assert.ok(guest.every(step => !/\{\w+\}/.test(step)), language)
      const rules = guide.rules(values)
      assert.equal(rules.filter(rule => rule.trim()).length, 2, language)
      assert.ok(rules.every(rule => !/\{\w+\}/.test(rule)), language)
    }
    for (const key of driveKeys) {
      const value = driveTranslation(language, key)
      assert.ok(value.trim(), language + ': ' + key)
      assert.notEqual(value, key, language + ': ' + key)
    }
  }
})
