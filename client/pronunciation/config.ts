import type { Language } from '../../shared/types'

export const pronunciationLocales = {
  English: 'en-US',
  French: 'fr-FR',
  Spanish: 'es-ES',
  German: 'de-DE',
  Italian: 'it-IT',
  Portuguese: 'pt-BR',
  Japanese: 'ja-JP',
  Korean: 'ko-KR',
  Chinese: 'zh-CN',
  Russian: 'ru-RU',
} satisfies Record<Language, string>

export const pronunciationRate = 0.85

export function selectVoice(voices: readonly SpeechSynthesisVoice[], locale: string) {
  const tag = locale.toLowerCase()
  const language = tag.split('-')[0]
  const local = voices.filter(voice => voice.localService)
  return local.find(voice => voice.lang.toLowerCase() === tag) ??
    local.find(voice => voice.lang.toLowerCase().split('-')[0] === language)
}
