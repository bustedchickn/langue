import { useEffect, useRef, useState } from 'react'
import type { Language } from '../../shared/types'
import { pronunciationLocales, pronunciationRate, selectVoice } from './config'

type Playback = { owner: symbol; synth: SpeechSynthesis; finish: (message?: string) => void }
let active: Playback | undefined

function stop(playback: Playback) {
  active = undefined
  playback.finish()
  playback.synth.cancel()
}

export function usePronunciation(language: Language, text: string) {
  const synth = typeof window !== 'undefined' && typeof window.SpeechSynthesisUtterance === 'function'
    ? window.speechSynthesis
    : undefined
  const owner = useRef(Symbol()).current
  const locale = pronunciationLocales[language]
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => synth?.getVoices() ?? [])
  const [isSpeaking, setSpeaking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!synth) return
    const update = () => setVoices(synth.getVoices())
    synth.addEventListener('voiceschanged', update)
    update()
    return () => synth.removeEventListener('voiceschanged', update)
  }, [synth])

  useEffect(() => {
    setError('')
    return () => {
      if (active?.owner === owner) stop(active)
    }
  }, [owner, language, text])

  function pronounce() {
    if (!synth) return
    // Read again inside the gesture in case the device loaded voices without an event.
    const current = synth.getVoices()
    setVoices(current)
    const voice = selectVoice(current, locale)
    if (!voice) return
    if (active) stop(active)
    setError('')
    const playback: Playback = {
      owner, synth, finish: message => {
        setSpeaking(false)
        if (message) setError(message)
      },
    }
    const finish = (message?: string) => {
      if (active !== playback) return
      active = undefined
      playback.finish(message)
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = voice
    utterance.lang = voice.lang
    utterance.rate = pronunciationRate
    utterance.onend = () => finish()
    utterance.onerror = () => finish('Could not play pronunciation. Try again.')
    active = playback
    setSpeaking(true)
    try {
      synth.speak(utterance)
    } catch {
      finish('Could not play pronunciation. Try again.')
    }
  }

  return {
    pronounce,
    stopPronunciation: () => { if (active?.owner === owner) stop(active) },
    isSpeaking,
    isSupported: !!synth,
    hasVoice: !!selectVoice(voices, locale),
    error,
  }
}
