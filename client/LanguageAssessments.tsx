import { useState, type FormEvent } from 'react'
import { communicationLevels, languageNames, languages, type Language, type UserProfile } from '../shared/types'
import { api, errorText } from './backend'
import { useInterface } from './locales/interface'
import { sessionText, translateSessionMessage } from './locales/session'

const descriptions = [
  'I am learning my first words.',
  'I can use a few simple phrases.',
  'I can manage familiar conversations.',
  'I can communicate in most situations.',
  'I speak comfortably in a wide range of situations.',
] as const

export function LanguageAssessments({ profile, onSave, initial }: {
  profile: UserProfile; onSave: (profile: UserProfile) => void; initial?: Language
}) {
  const { language: interfaceLanguage } = useInterface()
  const [language, setLanguage] = useState<Language>(initial ?? profile.learningLanguage)
  const assessment = profile.assessments?.[language]
  const [level, setLevel] = useState(assessment?.level ?? 'Just Starting')
  const [fluent, setFluent] = useState(assessment?.fluent ?? (language === profile.fluentLanguage))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      onSave(await api<UserProfile>('/profile/languages/' + language, 'PUT', { level, fluent }))
    } catch (failure) {
      setError(errorText(failure))
    } finally { setBusy(false) }
  }

  return <section className="panel stack">
    <h2>{sessionText(interfaceLanguage, 'How comfortable are you speaking this language?')}</h2>
    <form className="stack" onSubmit={submit}>
      <label>{sessionText(interfaceLanguage, 'Language')}<select value={language} onChange={event => {
        const next = event.target.value as Language
        setLanguage(next)
        setLevel(profile.assessments?.[next]?.level ?? 'Just Starting')
        setFluent(profile.assessments?.[next]?.fluent ?? (next === profile.fluentLanguage))
      }}>{languages.map(value => <option key={value} value={value}>{languageNames[value]}</option>)}</select></label>
      <label>{sessionText(interfaceLanguage, 'Communication level')}<select value={level} onChange={event => setLevel(event.target.value as typeof level)}>
        {communicationLevels.map(value => <option key={value} value={value}>{sessionText(interfaceLanguage, value)}</option>)}
      </select></label>
      <p className="muted">{sessionText(interfaceLanguage, descriptions[communicationLevels.indexOf(level)])}</p>
      <label className="actions"><input type="checkbox" style={{ width: 'auto' }} checked={fluent}
        onChange={event => setFluent(event.target.checked)} /> {sessionText(interfaceLanguage, 'I consider myself fluent in {language}').replace('{language}', languageNames[language])}</label>
      <button disabled={busy}>{sessionText(interfaceLanguage, 'Save language assessment')}</button>
    </form>
    {error && <p className="error" role="alert">{translateSessionMessage(interfaceLanguage, error)}</p>}
  </section>
}
