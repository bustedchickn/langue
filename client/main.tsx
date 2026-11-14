import { useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { onAuthStateChanged, signInAnonymously, signOut, type User } from 'firebase/auth'
import type { Room } from 'colyseus.js'
import type { UserProfile } from '../shared/types'
import { api, auth, devGuest, errorText, multiplayer } from './backend'
import { Account, Profile } from './Account'
import { Friends, PlayerName, useInvitations } from './Friends'
import { RoomScreen } from './RoomScreen'
import { useSession } from './session'
import { QuickPlay } from './QuickPlay'
import './style.css'

type Page = 'welcome' | 'play' | 'friends' | 'profile' | 'settings'
const pages = ['welcome', 'play', 'friends', 'profile', 'settings'] as const

function App() {
  const [user, setUser] = useState<User | null>()
  const [anonymous, setAnonymous] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>()
  const [profileError, setProfileError] = useState('')
  const [profileAttempt, setProfileAttempt] = useState(0)
  const [page, setPage] = useState<Page>('welcome')
  const [searching, setSearching] = useState(false)
  const [notice, setNotice] = useState('')
  const [joining, setJoining] = useState(false)
  const [invitePicker, setInvitePicker] = useState(false)
  const session = useSession(setNotice)
  const invitations = useInvitations(profile?.uid, setNotice)
  const inRoom = !!session.room || session.reconnecting

  useEffect(() => onAuthStateChanged(auth, value => {
    setUser(value)
    setAnonymous(!!value?.isAnonymous)
  }), [])

  const uid = user?.uid
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
    attach(room)
  }, [attach])
  const doneSearching = useCallback((message?: string) => {
    setSearching(false)
    if (message) setNotice(message)
  }, [])
  async function enter(action: () => Promise<Room>) {
    if (joining || inRoom || searching) return
    setNotice('')
    setJoining(true)
    try {
      multiplayer.auth.token = await auth.currentUser?.getIdToken() ?? ''
      session.attach(await action())
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
      if (created) session.attach(target)
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

  const currentProfile = profile?.uid === uid ? profile : undefined
  return <>
    <header className="masthead">
      <div className="bar">
        <button className="brand" disabled={inRoom || joining || searching} onClick={() => navigate('welcome')}>Lost in Translation<span>.</span></button>
        <span className="tagline">Language co-op</span>
        {currentProfile && <span className="identity">@{currentProfile.username}</span>}
      </div>
    </header>
    <main className="stack">
      {currentProfile && !inRoom && <nav aria-label="Main navigation">
        {pages.map(item => <button key={item} className="secondary" aria-current={page === item ? 'page' : undefined}
          disabled={joining || searching} onClick={() => navigate(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}
      </nav>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {user === undefined && <p>Loading…</p>}
      {user === null && <>
        <section className="intro"><h1>Find your words together.</h1><p>A two-player language practice game.</p></section>
        {devGuest && <button disabled={joining} onClick={() => {
          setJoining(true)
          void signInAnonymously(auth).then(() => navigate('play'))
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
        {invitations.length > 0 && <section className="panel stack">
          <h2>Game invitations</h2>
          {invitations.map(invitation => <div className="card" key={invitation.id}>
            <PlayerName uid={invitation.from} />
            <div className="actions">
              <button disabled={inRoom || joining || searching} onClick={() => void enter(async () =>
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
          navigate('play')
        }} invite={() => setInvitePicker(value => !value)} />}
        {invitePicker && <Friends uid={user.uid} invite={invite} inviteOnly inLobby={inRoom} />}
        {searching && <QuickPlay profile={currentProfile} joined={joinedMatch} done={doneSearching} />}
        {!inRoom && !invitePicker && !searching && <>
          {page === 'welcome' && <section className="intro stack">
            <h1>Find your words together.</h1>
            <p>Practice English, French, or Spanish with a partner.</p>
            <button disabled={joining} onClick={() => navigate('play')}>Play</button>
          </section>}
          {page === 'play' && <section className="panel stack play-menu">
            <h2>Play</h2>
            <div className="play-options">
              <button aria-label="Quick Play" disabled={joining} onClick={() => { setNotice(''); setSearching(true) }}>
                <strong>Quick Play</strong><span>Find a language partner</span>
              </button>
              <button aria-label="Play With Friends" className="secondary" disabled={joining} onClick={() => setInvitePicker(true)}>
                <strong>Play With Friends</strong><span>Pick a game and send an invite</span>
              </button>
            </div>
          </section>}
          {page === 'friends' && <Friends key={uid} uid={user.uid} invite={invite} />}
          {page === 'profile' && <Profile key={uid} profile={currentProfile} user={user} onSave={setProfile} />}
          {page === 'settings' && <div className="stack">
            {anonymous && <Account guest={user} onLinked={() => {
              setAnonymous(false)
              setNotice('Your account is linked.')
            }} />}
            <section className="panel stack"><h2>Settings</h2><button className="secondary" onClick={() => {
              void signOut(auth).then(() => navigate('welcome')).catch(error => setNotice(errorText(error)))
            }}>Sign out</button></section>
          </div>}
        </>}
        {invitePicker && <button className="secondary" disabled={joining} onClick={() => setInvitePicker(false)}>Back</button>}
      </>}
    </main>
  </>
}

createRoot(document.getElementById('root')!).render(<App />)
