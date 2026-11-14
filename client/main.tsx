import { useEffect, useState, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { onAuthStateChanged, signInAnonymously, signOut, type User } from 'firebase/auth'
import type { Room } from 'colyseus.js'
import type { UserProfile } from '../shared/types'
import { api, auth, devGuest, errorText, multiplayer } from './backend'
import { Account, Profile } from './Account'
import { Friends, PlayerName, useInvitations } from './Friends'
import { RoomScreen } from './RoomScreen'
import { useSession } from './session'
import './style.css'

type Page = 'welcome' | 'play' | 'friends' | 'profile' | 'settings'
const pages = ['welcome', 'play', 'friends', 'profile', 'settings'] as const

function App() {
  const [user, setUser] = useState<User | null>()
  const [anonymous, setAnonymous] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>()
  const [profileError, setProfileError] = useState('')
  const [profileAttempt, setProfileAttempt] = useState(0)
  const [linkCode, setLinkCode] = useState(() => new URLSearchParams(location.search).get('room') ?? '')
  const [page, setPage] = useState<Page>(linkCode ? 'play' : 'welcome')
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

  function clearLink() {
    const url = new URL(location.href)
    url.searchParams.delete('room')
    history.replaceState(null, '', url)
    setLinkCode('')
  }

  async function enter(action: () => Promise<Room>) {
    if (joining || inRoom) return
    setNotice('')
    setJoining(true)
    try {
      multiplayer.auth.token = await auth.currentUser?.getIdToken() ?? ''
      session.attach(await action())
      clearLink()
    } catch (failure) {
      setNotice(errorText(failure))
    } finally { setJoining(false) }
  }

  function createRoom() { return multiplayer.create('duo') }

  function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = String(new FormData(event.currentTarget).get('code')).trim()
    if (!/^[a-zA-Z0-9_-]{1,32}$/.test(code)) {
      setNotice('Enter a valid room code.')
      return
    }
    void enter(() => multiplayer.joinById(code))
  }

  async function invite(to: string) {
    let target = session.room
    const created = !target
    if (joining || session.reconnecting) throw new Error('Wait for the room connection.')
    setJoining(true)
    try {
      if (!target) {
        multiplayer.auth.token = await auth.currentUser?.getIdToken() ?? ''
        target = await createRoom()
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
        <button className="brand" disabled={inRoom || joining} onClick={() => navigate('welcome')}>Lost in Translation<span>.</span></button>
        <span className="tagline">Language co-op</span>
        {currentProfile && <span className="identity">@{currentProfile.username}</span>}
      </div>
    </header>
    <main className="stack">
      {currentProfile && !inRoom && <nav aria-label="Main navigation">
        {pages.map(item => <button key={item} className="secondary" aria-current={page === item ? 'page' : undefined}
          disabled={joining} onClick={() => navigate(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}
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
              <button disabled={inRoom || joining} onClick={() => void enter(async () =>
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
        {invitePicker && <Friends uid={user.uid} invite={invite} inviteOnly />}
        {!inRoom && !invitePicker && <>
          {page === 'welcome' && <section className="intro stack">
            <h1>Find your words together.</h1>
            <p>Practice English, French, or Spanish with a partner.</p>
            <button disabled={joining} onClick={() => navigate('play')}>Play</button>
          </section>}
          {page === 'play' && <section className="panel stack">
            <h2>Play</h2>
            <div className="actions">
              <button disabled={joining} onClick={() => void enter(createRoom)}>Quick Create Room</button>
              <button className="secondary" disabled={joining} onClick={() => setInvitePicker(true)}>Invite Friend</button>
            </div>
            <form className="stack" onSubmit={joinRoom}>
              <label>Room code<input name="code" maxLength={32} autoCapitalize="none" defaultValue={linkCode} required /></label>
              <button disabled={joining}>Join Room</button>
            </form>
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
