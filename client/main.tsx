import { sessionText, translateSessionMessage, type SessionText } from './locales/session'
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { onAuthStateChanged, signInAnonymously, signOut, type User } from 'firebase/auth'
import type { Room } from 'colyseus.js'
import { languageNames, languageTags, type Language, type UserProfile } from '../shared/types'
import { api, auth, devGuest, errorText, multiplayer } from './backend'
import { Account, Profile } from './Account'
import { Friends, PlayerName, useInvitations } from './Friends'
import { RoomScreen } from './RoomScreen'
import { useSession } from './session'
import { QuickPlay } from './QuickPlay'
import { Avatar } from './PlayerIdentity'
import { LanguageAssessments } from './LanguageAssessments'
import { LanguagePicker } from './LanguagePicker'
import { Leaderboard } from './Leaderboard'
import { LeaderboardIcon } from './LeaderboardIcon'
import { VocabularyHub } from './vocabulary/Vocabulary'
import { playEffect, setSoundsEnabled, soundsEnabled, startSearchMusic } from './sounds'
import { InterfaceLanguage, interfaceCopy } from './locales/interface'
import './style.css'

type Page = 'home' | 'friends' | 'profile' | 'leaderboard' | 'vocabulary'

const logos = [
  '/lostintranslation.png',
  '/lostintranslationspanish.png',
  '/lostintranslationfrench.png',
  '/lostintranslationportuguese.png',
  '/lostintranslationkorean.png',
  '/lostintranslationjapanese.png',
  '/lostintranslationitalian.png',
  '/lostintranslationgerman.png',
  '/lostintranslationchinese.png',
  '/lostintranslationrussian.png',
]

function Logo() {
  const [current, setCurrent] = useState(() => Math.floor(Math.random() * logos.length))
  const [previous, setPrevious] = useState<number | null>(null)

  useEffect(() => {
    const next = new Image()
    next.src = logos[(current + 1) % logos.length]
  }, [current])

  useEffect(() => {
    if (previous === null) return
    const timeout = window.setTimeout(() => setPrevious(null), 650)
    return () => window.clearTimeout(timeout)
  }, [previous])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPrevious(current)
      setCurrent((current + 1) % logos.length)
    }, 2000)
    return () => window.clearTimeout(timeout)
  }, [current])

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
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const deleteDialog = useRef<HTMLDialogElement>(null)
  const uid = user?.uid
  const session = useSession(uid, setNotice)
  const invitations = useInvitations(profile?.uid, setNotice)
  const inRoom = !!session.room || session.reconnecting

  useEffect(() => {
    if (confirmingDelete) deleteDialog.current?.showModal()
    else deleteDialog.current?.close()
  }, [confirmingDelete])

  async function deleteAccount() {
    if (deletingAccount) return
    setDeletingAccount(true)
    setDeleteError('')
    try {
      await api('/profile', 'DELETE', { confirm: true })
      await signOut(auth)
      setConfirmingDelete(false)
      navigate('home')
    } catch (error) {
      setDeleteError(errorText(error))
    } finally {
      setDeletingAccount(false)
    }
  }

  useEffect(() => {
    if (session.session?.phase !== 'results' || !uid) return
    void api<UserProfile | null>('/profile').then(value => {
      if (value?.uid === uid) setProfile(value)
    }).catch(() => {})
  }, [session.session?.phase, uid])

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
    if (button.getAttribute('data-navigation') === 'back') playEffect('back')
    else if (button.getAttribute('data-effect') === 'select') playEffect('select')
    else if (button.getAttribute('data-effect') === 'open') playEffect('open')
    else if (button.getAttribute('data-effect') === 'message') playEffect('message')
    else playEffect('back')
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
  const interfaceLanguage = currentProfile?.interfaceLanguage ?? 'English'
  const t = (label: SessionText) => sessionText(interfaceLanguage, label)
  const text = interfaceCopy[interfaceLanguage]
  const screenKey = inRoom
    ? 'room:' + (session.session?.phase ?? 'connecting') + ':' + (session.session?.phase === 'game' ? session.session.progress?.round ?? 1 : '')
    : searching ? 'searching' : assessing ? 'assessment' : page
  return (
    <InterfaceLanguage.Provider value={interfaceLanguage}>
    <div className="screen-background" key={screenKey} aria-hidden="true" />
    <main lang={languageTags[interfaceLanguage]} className={inRoom ? 'app-shell session-shell stack' : 'app-shell stack'} onClickCapture={playInterfaceSound}>
      {notice && <p className="notice" role="status">{translateSessionMessage(interfaceLanguage, notice)}</p>}
      {user === undefined && <p>Loading…</p>}
      {user === null && <>
        <section className="sign-in-intro"><Logo /></section>
        <Account />
        {devGuest && <button disabled={joining} onClick={() => {
          setJoining(true)
          void signInAnonymously(auth).then(() => navigate('home'))
            .catch(error => setNotice(errorText(error))).finally(() => setJoining(false))
        }}>Quick test guest</button>}
      </>}
      {user && profileError && <section className="panel stack">
        <p className="error" role="alert">{translateSessionMessage(interfaceLanguage, profileError)}</p>
        <button onClick={() => setProfileAttempt(value => value + 1)}>Retry profile</button>
        <button className="secondary" onClick={() => void signOut(auth)}>{text.signOut}</button>
      </section>}
      {user && !profileError && profile === undefined && <p>Loading profile…</p>}
      {user && profile === null && <Profile key={uid} user={user} onSave={setProfile} />}
      {user && currentProfile && <>
        {!inRoom && !searching && page !== 'home' && <button className="secondary contextual-back" data-navigation="back" disabled={joining}
          onClick={() => navigate('home')}>← {text.back}</button>}
        {!inRoom && !searching && page === 'friends' && invitations.length > 0 && <section className="panel stack">
          <h2>{t('Game invitations')}</h2>
          {invitations.map(invitation => <div className="card" key={invitation.id}>
            <PlayerName uid={invitation.from} />
            <div className="actions">
              <button data-effect="open" disabled={joining} onClick={() => void enter(async () =>
                multiplayer.consumeSeatReservation(await api('/invites/' + invitation.id + '/join', 'POST'))
              )}>{t('Join game')}</button>
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
          {page === 'home' && assessing && <button className="secondary" data-navigation="back" onClick={() => setAssessing(false)}>{text.back}</button>}
          {page === 'home' && !assessing && <section className="home-screen">
            <div className="home-top-actions">
              <button className="vocabulary-access" aria-label="Open Vocabulary" title="Vocabulary" onClick={() => navigate('vocabulary')}>
                <svg width="27" height="27" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 6c4-2 8-2 12 1 4-3 8-3 12-1v20c-4-2-8-2-12 1-4-3-8-3-12-1V6Z" />
                  <path d="M16 7v20M8 11h4m-4 4h4m8-4h4m-4 4h4" />
                </svg>
              </button>
              <div className="home-top-menu">
              <button className="leaderboard-access" aria-label="Open leaderboard" title="Leaderboard" onClick={() => navigate('leaderboard')}><LeaderboardIcon /></button>
              <button className="profile-access" data-effect="select" aria-label={text.openProfile} disabled={savingLanguage || joining}
                onClick={() => navigate('profile')}><Avatar name={currentProfile.displayName} photo={user.photoURL} /></button>
              </div>
            </div>
            <div className="home-content">
              <Logo />
              <LanguagePicker value={currentProfile.learningLanguage} disabled={savingLanguage || joining}
                onChange={language => void saveLanguage(language)} />
              <div className="home-actions">
                <button data-effect="open" className={interfaceLanguage === 'English' ? 'image-action image-action-play' : 'localized-action'}
                  aria-label={text.play} disabled={joining || savingLanguage} onClick={() => {
                  setNotice('')
                  if (!currentProfile.assessments?.[currentProfile.learningLanguage]) setAssessing(true)
                  else {
                    startSearchMusic()
                    setSearching(true)
                  }
                }}>
                  {interfaceLanguage === 'English' ? <>
                    <img className="image-action-default" src="/play-button-1.png" alt="" />
                    <img className="image-action-hover" src="/play-button-2.png" alt="" />
                  </> : text.play}
                </button>
                <button data-effect="open" className={interfaceLanguage === 'English' ? 'image-action image-action-friends' : 'localized-action'}
                  aria-label={invitations.length ? text.friends + ' (' + invitations.length + ')' : text.friends}
                  disabled={joining || savingLanguage} onClick={() => navigate('friends')}>
                  {interfaceLanguage === 'English' ? <>
                    <img className="image-action-default" src="/play-friends-button-1.png" alt="" />
                    <img className="image-action-hover" src="/play-friends-button-2.png" alt="" />
                  </> : text.friends}
                  {invitations.length > 0 && <span className="invite-count" aria-hidden="true">{invitations.length}</span>}
                </button>
              </div>
            </div>
          </section>}
          {page === 'friends' && <Friends key={uid} uid={user.uid} invite={invite} />}
          {page === 'leaderboard' && <Leaderboard uid={user.uid} />}
          {page === 'vocabulary' && <VocabularyHub uid={user.uid} defaultLanguage={currentProfile.learningLanguage} />}
          {page === 'profile' && <div className="stack">
            <section className="panel profile-identity">
              <Avatar name={currentProfile.displayName} photo={user.photoURL} />
              <div><h1>{currentProfile.displayName}</h1><p>@{currentProfile.username} · {text.learning} {languageNames[currentProfile.learningLanguage]}</p></div>
            </section>
            <section className="panel stack"><h2>Your scores</h2>
              <p>{currentProfile.scores?.total ?? 0} points across {currentProfile.scores?.gamesPlayed ?? 0} games</p>
              <button onClick={() => navigate('leaderboard')}>View leaderboard</button>
            </section>
            <Profile key={uid} profile={currentProfile} user={user} onSave={setProfile} />
            <LanguageAssessments profile={currentProfile} onSave={setProfile} />
            {anonymous && <Account guest={user} onLinked={() => {
              setAnonymous(false)
              setNotice('Your account is linked.')
            }} />}
            <section className="panel stack"><h2>{text.settings}</h2>
              <button className="secondary" data-sound="none" aria-pressed={soundOn} onClick={() => {
                setSoundsEnabled(!soundOn)
                setSoundOn(!soundOn)
              }}>{text.sound} {soundOn ? text.on : text.off}</button>
              <button className="secondary" onClick={() => {
              void signOut(auth).then(() => navigate('home')).catch(error => setNotice(errorText(error)))
            }}>{text.signOut}</button>
              <button className="secondary delete-account-button" onClick={() => {
                setDeleteError('')
                setConfirmingDelete(true)
              }}>Delete account</button>
            </section>
            <dialog ref={deleteDialog} className="panel delete-account-dialog" aria-labelledby="delete-account-title"
              onCancel={event => { if (deletingAccount) event.preventDefault() }}
              onClose={() => setConfirmingDelete(false)}>
              <div className="stack">
                <h2 id="delete-account-title">Delete your account?</h2>
                <p>Your profile, scores, friends, and invitations will be permanently deleted. This cannot be undone.</p>
                {deleteError && <p className="error" role="alert">{deleteError}</p>}
                <div className="actions">
                  <button className="secondary" disabled={deletingAccount} onClick={() => setConfirmingDelete(false)}>Cancel</button>
                  <button className="delete-account-confirm" disabled={deletingAccount} onClick={() => void deleteAccount()}>
                    {deletingAccount ? 'Deleting…' : 'Yes, delete my account'}
                  </button>
                </div>
              </div>
            </dialog>
          </div>}
        </>}
        {invitePicker && inRoom && <button className="secondary" data-navigation="back" disabled={joining} onClick={() => setInvitePicker(false)}>Close friends</button>}
      </>}
    </main>
    </InterfaceLanguage.Provider>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
