import { useId } from 'react'
import type { Language } from '../../shared/types'
import { usePronunciation } from './usePronunciation'
import './pronunciation.css'

export function PronunciationButton({ text, language, label }: { text: string; language: Language; label?: string }) {
  const { pronounce, isSpeaking, isSupported, hasVoice, error } = usePronunciation(language, text)
  const statusId = useId()
  const message = !isSupported ? 'This browser does not support pronunciation.'
    : !hasVoice ? 'Pronunciation is unavailable for ' + language + ' on this device.'
    : error || (isSpeaking ? 'Playing…' : '')

  return <span className="pronunciation">
    <button type="button" className="secondary pronunciation-button" aria-label={label ?? 'Pronounce in ' + language}
      aria-describedby={message ? statusId : undefined} data-playing={isSpeaking || undefined}
      disabled={!isSupported || !text.trim()} onClick={pronounce}>
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9h4l5-4v14l-5-4H3zM16 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12" />
      </svg>
    </button>
    <span id={statusId} role="status" className="pronunciation-status">{message}</span>
  </span>
}
