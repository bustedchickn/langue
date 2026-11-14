import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pronunciationLocales, pronunciationRate, selectVoice } from '../client/pronunciation/config'

const voice = (lang: string, localService = true) =>
  ({ lang, localService }) as SpeechSynthesisVoice

test('selects the requested English, French and Spanish voices when switching languages', () => {
  const voices = [voice('en-GB'), voice('fr-CA'), voice('es-MX'), voice('en-US'), voice('fr-FR'), voice('es-ES')]
  assert.deepEqual(pronunciationLocales, {
    English: 'en-US', French: 'fr-FR', Spanish: 'es-ES', German: 'de-DE', Italian: 'it-IT',
    Portuguese: 'pt-BR', Japanese: 'ja-JP', Korean: 'ko-KR', Chinese: 'zh-CN', Russian: 'ru-RU',
  })
  assert.equal(pronunciationRate, 0.85)
  assert.deepEqual((['English', 'French', 'Spanish'] as const).map(language => selectVoice(voices, pronunciationLocales[language])?.lang),
    ['en-US', 'fr-FR', 'es-ES'])
})

test('uses an installed same-language voice if necessary and rejects remote or wrong-language voices', () => {
  assert.equal(selectVoice([voice('fr-FR', false), voice('fr-CA')], 'fr-FR')?.lang, 'fr-CA')
  assert.equal(selectVoice([voice('en-US'), voice('es-ES', false)], 'es-ES'), undefined)
  assert.equal(selectVoice([], 'fr-FR'), undefined)
})
