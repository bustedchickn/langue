import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { onAuthStateChanged, signInAnonymously, signOut, type User } from 'firebase/auth'
import type { Room } from 'colyseus.js'
import { type Language, type UserProfile } from '../shared/types'
import { api, auth, devGuest, errorText, multiplayer } from './backend'
import { Account, Profile } from './Account'
import { Friends, PlayerName, useInvitations } from './Friends'
import { RoomScreen } from './RoomScreen'
import { useSession } from './session'
import { QuickPlay } from './QuickPlay'
import { Avatar } from './PlayerIdentity'
import { LanguageAssessments } from './LanguageAssessments'
import { LanguagePicker } from './LanguagePicker'
import { playEffect, setSoundsEnabled, soundsEnabled, startSearchMusic } from './sounds'
import './style.css'

type Page = 'home' | 'friends' | 'profile'

function Logo() {
  const logos = ['/lostintranslationspanish.png', '/lostintranslationfrench.png']
  const [current, setCurrent] = useState(() => Math.floor(Math.random() * logos.length))
  const [previous, setPrevious] = useState<number | null>(null)

  useEffect(() => {
    if (previous === null) return
    const timeout = window.setTimeout(() => setPrevious(null), 650)
    return () => window.clearTimeout(timeout)
  }, [previous])

  function changeLogo() {
    if (previous !== null) return
    setPrevious(current)
    setCurrent((current + 1) % logos.length)
  }

  return <button type="button" className="game-logo-button" onClick={changeLogo}
    aria-label="Switch logo language" title="Click to switch logo language">
    <span className="game-logo-frame">
      {previous !== null && <img className="game-logo-image game-logo-previous" src={logos[previous]} alt="" aria-hidden="true" />}
      <img key={current} className={'game-logo-image' + (previous !== null ? ' game-logo-next' : '')}
        src={logos[current]} alt="Lost in Translation" />
    </span>
  </button>
}

function App() {
  const [user, setUser] = useState<User | null>()
  const [anonymous, setAnonymous] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>()
  const [profileError, setProfileError] = useState('')
  const [profileAttempt, setProfileAttempt] = useState(0)
  const [page, setPage] = useState<Page>('home')
  const [savingLanguage, setSavingLanguage] = useState(false)
  const [assessing, setAssessing] = useState(false)
  const [searching, setSearching] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (notice !== 'Invitation sent.') return
    const timeout = window.setTimeout(() => setNotice(current => current === notice ? '' : current), 5000)
    return () => window.clearTimeout(timeout)
  }, [notice])
  const [joining, setJoining] = useState(false)
  const [invitePicker, setInvitePicker] = useState(false)
  const [soundOn, setSoundOn] = useState(soundsEnabled)
  const uid = user?.uid
  const session = useSession(uid, setNotice)
  const invitations = useInvitations(profile?.uid, setNotice)
  const inRoom = !!session.room || session.reconnecting

  useEffect(() => onAuthStateChanged(auth, value => {
    setUser(value)
    setAnonymous(!!value?.isAnonymous)
  }), [])

  const profileUid = profile?.uid === uid ? profile?.uid : undefined
  useEffect(() => {
    if (!profileUid) return
    const heartbeat = () => void api('/presence', 'POST').catch(() => {})
    heartbeat()
    const timer = setInterval(heartbeat, 30000)
    return () => clearInterval(timer)
  }, [profileUid])
  useEffect(() => {
    let active = true
    setProfile(undefined)
    setProfileError('')
    if (uid) api<UserProfile | null>('/profile').then(async value => {
      if (active && !value && devGuest && auth.currentUser?.uid === uid && auth.currentUser.isAnonymous) {
        value = await api<UserProfile>('/profile', 'PUT', {
          username: 'guest_' + crypto.randomUUID().replaceAll('-', '').slice(0, 16),
          displayName: 'Guest ' + uid.slice(0, 4), fluentLanguage: 'English', learningLanguage: 'French',
        })
      }
      if (active) setProfile(value)
    }).catch(error => { if (active) setProfileError(errorText(error)) })
    return () => { active = false }
  }, [uid, profileAttempt])

  const { attach } = session
  const joinedMatch = useCallback((room: Room) => {
    setSearching(false)
    setNotice('')
    attach(room)
  }, [attach])
  const doneSearching = useCallback((message?: string) => {
    setSearching(false)
    if (message) setNotice(message)
  }, [])
  async function enter(action: () => Promise<Room>) {
    if (joining || inRoom || searching || savingLanguage) return
    setNotice('')
    setJoining(true)
    try {
      multiplayer.auth.token = await auth.currentUser?.getIdToken() ?? ''
      session.attach(await action())
      setPage('home')
    } catch (failure) {
      setNotice(errorText(failure))
    } finally { setJoining(false) }
  }

  async function invite(to: string, gameId?: string) {
    let target = session.room
    const created = !target
    if (joining || session.reconnecting) throw new Error('Wait for the room connection.')
    setJoining(true)
    try {
      if (!target) {
        multiplayer.auth.token = await auth.currentUser?.getIdToken() ?? ''
        target = await multiplayer.create('duo', { gameId })
      }
      await api('/invites', 'POST', { to, roomId: target.roomId })
      if (created) {
        session.attach(target)
        setPage('home')
      }
      setInvitePicker(false)
      setNotice('Invitation sent.')
    } catch (failure) {
      if (created && target) void target.leave()
      throw failure
    } finally { setJoining(false) }
  }

  function navigate(next: Page) {
    setPage(next)
    setInvitePicker(false)
    setNotice('')
  }

  function playInterfaceSound(event: MouseEvent<HTMLElement>) {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest('button, [role="option"]')
    if (!button || button.matches(':disabled, [aria-disabled="true"], [data-sound="none"]') ||
        button.closest('.room-grid[data-game]') && session.session?.phase === 'game') return
    const label = (button.getAttribute('aria-label') ?? button.textContent ?? '').trim().toLowerCase()
    if (label.includes('cancel')) playEffect('cancel')
    else if (label.includes('close')) playEffect('close')
    else if (label.includes('back') || label.includes('leave')) playEffect('back')
    else if (button.getAttribute('role') === 'combobox' || label.includes('friends') || label.includes('profile')) playEffect('open')
    else playEffect('select')
  }

  async function saveLanguage(learningLanguage: Language) {
    if (!currentProfile || savingLanguage) return
    setSavingLanguage(true)
    setNotice('')
    try {
      const { username, displayName, fluentLanguage } = currentProfile
      const saved = await api<UserProfile>('/profile', 'PUT', { username, displayName, fluentLanguage, learningLanguage })
      setProfile(saved)
      if (!saved.assessments?.[learningLanguage]) setAssessing(true)
    } catch (error) {
      setNotice(errorText(error))
    } finally {
      setSavingLanguage(false)
    }
  }

  const currentProfile = profile?.uid === uid ? profile : undefined
  const screenKey = inRoom
    ? 'room:' + (session.session?.phase ?? 'connecting') + ':' + (session.session?.phase === 'game' ? session.session.progress?.round ?? 1 : '')
    : searching ? 'searching' : assessing ? 'assessment' : page
  return (
    <>
    <div className="screen-background" key={screenKey} aria-hidden="true" />
    <main className={inRoom ? 'app-shell session-shell stack' : 'app-shell stack'} onClickCapture={playInterfaceSound}>
      {notice && <p className="notice" role="status">{notice}</p>}
      {user === undefined && <p>Loading…</p>}
      {user === null && <>
        <section className="sign-in-intro"><Logo /><p>A two-player language practice game.</p></section>
        {devGuest && <button disabled={joining} onClick={() => {
          setJoining(true)
          void signInAnonymously(auth).then(() => navigate('home'))
            .catch(error => setNotice(errorText(error))).finally(() => setJoining(false))
        }}>Quick test guest</button>}
        <Account />
      </>}
      {user && profileError && <section className="panel stack">
        <p className="error" role="alert">{profileError}</p>
        <button onClick={() => setProfileAttempt(value => value + 1)}>Retry profile</button>
        <button className="secondary" onClick={() => void signOut(auth)}>Sign out</button>
      </section>}
      {user && !profileError && profile === undefined && <p>Loading profile…</p>}
      {user && profile === null && <Profile key={uid} user={user} onSave={setProfile} />}
      {user && currentProfile && <>
        {!inRoom && !searching && page !== 'home' && <button className="secondary contextual-back" disabled={joining}
          onClick={() => navigate('home')}>← Back to home</button>}
        {!inRoom && !searching && page === 'friends' && invitations.length > 0 && <section className="panel stack">
          <h2>Game invitations</h2>
          {invitations.map(invitation => <div className="card" key={invitation.id}>
            <PlayerName uid={invitation.from} />
            <div className="actions">
              <button disabled={joining} onClick={() => void enter(async () =>
                multiplayer.consumeSeatReservation(await api('/invites/' + invitation.id + '/join', 'POST'))
              )}>Join game</button>
              <button className="secondary" disabled={joining} onClick={() => {
                void api('/invites/' + invitation.id + '/decline', 'POST').catch(error => setNotice(errorText(error)))
              }}>Decline</button>
            </div>
          </div>)}
        </section>}
        {inRoom && <RoomScreen {...session} leave={() => {
          session.reset()
          navigate('home')
        }} invite={() => setInvitePicker(value => !value)} />}
        {invitePicker && inRoom && <Friends uid={user.uid} invite={invite} inviteOnly inLobby />}
        {searching && <div className="solo-stage"><QuickPlay profile={currentProfile} joined={joinedMatch} done={doneSearching} /></div>}
        {!inRoom && !searching && <>
          {page === 'home' && assessing && <LanguageAssessments profile={currentProfile} onSave={saved => {
            setProfile(saved)
            setAssessing(false)
          }} />}
          {page === 'home' && assessing && <button className="secondary" onClick={() => setAssessing(false)}>Back to home</button>}
          {page === 'home' && !assessing && <section className="home-screen">
            <button className="profile-access" aria-label="Open profile and settings" disabled={savingLanguage || joining}
              onClick={() => navigate('profile')}><Avatar name={currentProfile.displayName} photo={user.photoURL} /></button>
            <div className="home-content">
              <Logo />
              <LanguagePicker value={currentProfile.learningLanguage} disabled={savingLanguage || joining}
                onChange={language => void saveLanguage(language)} />
              <div className="home-actions">
                <button className="image-action image-action-play" aria-label="Play" disabled={joining || savingLanguage} onClick={() => {
                  setNotice('')
                  if (!currentProfile.assessments?.[currentProfile.learningLanguage]) setAssessing(true)
                  else {
                    startSearchMusic()
                    setSearching(true)
                  }
                }}>
                  <img className="image-action-default" src="/play-button-1.png" alt="" />
                  <img className="image-action-hover" src="/play-button-2.png" alt="" />
                  <span aria-hidden="true">▶</span> Play
                </button>
                <button className="image-action image-action-friends" aria-label={invitations.length ? 'Play With Friends, ' + invitations.length + ' pending' : 'Play With Friends'}
                  disabled={joining || savingLanguage} onClick={() => navigate('friends')}>
                  <img className="image-action-default" src="/play-friends-button-1.png" alt="" />
                  <img className="image-action-hover" src="/play-friends-button-2.png" alt="" />
                  {invitations.length > 0 && <span className="invite-count" aria-label={invitations.length + ' invitations'}>{invitations.length}</span>}
                </button>
              </div>
            </div>
          </section>}
          {page === 'friends' && <Friends key={uid} uid={user.uid} invite={invite} />}
          {page === 'profile' && <div className="stack">
            <section className="panel profile-identity">
              <Avatar name={currentProfile.displayName} photo={user.photoURL} />
              <div><h1>{currentProfile.displayName}</h1><p>@{currentProfile.username} · Learning {currentProfile.learningLanguage}</p></div>
            </section>
            <Profile key={uid} profile={currentProfile} user={user} onSave={setProfile} />
            <LanguageAssessments profile={currentProfile} onSave={setProfile} />
            {anonymous && <Account guest={user} onLinked={() => {
              setAnonymous(false)
              setNotice('Your account is linked.')
            }} />}
            <section className="panel stack"><h2>Settings</h2>
              <button className="secondary" data-sound="none" aria-pressed={soundOn} onClick={() => {
                setSoundsEnabled(!soundOn)
                setSoundOn(!soundOn)
              }}>Game sounds {soundOn ? 'on' : 'off'}</button>
              <button className="secondary" onClick={() => {
              void signOut(auth).then(() => navigate('home')).catch(error => setNotice(errorText(error)))
            }}>Sign out</button></section>
          </div>}
        </>}
        {invitePicker && inRoom && <button className="secondary" disabled={joining} onClick={() => setInvitePicker(false)}>Close friends</button>}
      </>}
    </main>
    </>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
