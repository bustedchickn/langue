import { useState, type FormEvent } from 'react'
import {
  GoogleAuthProvider, EmailAuthProvider, createUserWithEmailAndPassword, linkWithCredential, linkWithPopup,
  signInAnonymously, signInWithEmailAndPassword, signInWithPopup, type User,
} from 'firebase/auth'
import { languageNames, languages, type UserProfile, type Language } from '../shared/types'
import { api, auth, errorText } from './backend'
import { useInterface } from './locales/interface'
import { translateSessionMessage } from './locales/session'

export function Account({ guest, onLinked }: { guest?: User; onLinked?: () => void }) {
  const { language } = useInterface()
  const [creating, setCreating] = useState(!!guest)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await action()
      onLinked?.()
    } catch (failure) {
      setError(errorText(failure))
    } finally {
      setBusy(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))
    void run(() => {
      if (guest) return linkWithCredential(guest, EmailAuthProvider.credential(email, password))
      return creating ? createUserWithEmailAndPassword(auth, email, password) : signInWithEmailAndPassword(auth, email, password)
    })
  }

  return <section className="panel stack">
    <h2>{guest ? 'Keep your guest account' : creating ? 'Create an account' : 'Sign in'}</h2>
    <button className="secondary" disabled={busy} onClick={() => void run(() => {
      const provider = new GoogleAuthProvider()
      return guest ? linkWithPopup(guest, provider) : signInWithPopup(auth, provider)
    })}>Continue with Google</button>
    <form className="stack" onSubmit={submit}>
      <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      <label>Password<input name="password" type="password" minLength={6} required
        autoComplete={creating ? 'new-password' : 'current-password'} /></label>
      <button disabled={busy}>{guest ? 'Link email account' : creating ? 'Create account' : 'Sign in'}</button>
    </form>
    {!guest && <div className="actions">
      <button className="secondary" disabled={busy} onClick={() => setCreating(!creating)}>
        {creating ? 'Back to sign in' : 'Create an account'}
      </button>
      <button className="secondary" disabled={busy} onClick={() => void run(() => signInAnonymously(auth))}>Play as guest</button>
    </div>}
    {error && <p className="error" role="alert">{translateSessionMessage(language, error)}</p>}
  </section>
}

export function Profile({ profile, user, onSave }: {
  profile?: UserProfile; user: User; onSave: (profile: UserProfile) => void
}) {
  const { text, language } = useInterface()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSaved(false)
    setError('')
    setBusy(true)
    try {
      const saved = await api<UserProfile>('/profile', 'PUT', Object.fromEntries(form))
      onSave(saved)
      setSaved(true)
    } catch (failure) { setError(errorText(failure)) }
    finally { setBusy(false) }
  }

  const select = (name: string, label: string, initial: Language) => <label>{label}
    <select name={name} defaultValue={initial}>{languages.map(language =>
      <option key={language} value={language}>{languageNames[language]}</option>)}</select>
  </label>

  return <section className="panel stack">
    <h2>{profile ? text.profile : text.setupProfile}</h2>
    <form className="stack" onSubmit={submit}>
      <label>{text.userName}<input name="username" defaultValue={profile?.username} readOnly={!!profile}
        pattern="[A-Za-z0-9_]{3,24}" title="3–24 letters, numbers, or underscores" autoCapitalize="none" required /></label>
      <label>{text.displayName}<input name="displayName" defaultValue={profile?.displayName ?? user.displayName ?? ''}
        maxLength={40} required /></label>
      {select('fluentLanguage', text.fluentLanguage, profile?.fluentLanguage ?? 'English')}
      {select('learningLanguage', text.learningLanguage, profile?.learningLanguage ?? 'French')}
      {select('interfaceLanguage', text.interfaceLanguage, profile?.interfaceLanguage ?? 'English')}
      <button disabled={busy}>{text.save}</button>
    </form>
    {saved && <p role="status">{text.saved}</p>}
    {error && <p className="error" role="alert">{translateSessionMessage(language, error)}</p>}
  </section>
}
