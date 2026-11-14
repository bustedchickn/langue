import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Room } from 'colyseus.js'
import type { Player, Session } from '../shared/types'
import { Voice } from './Voice'
import type { PrivateGameView } from '../shared/minigames/contracts'
import { ActiveGame, Results } from './minigames/GameScreen'
import { minigames } from './minigames/registry'

import { languageTags } from '../shared/types'
import { Avatar, flags } from './PlayerIdentity'
import { MicrophoneTest } from './MicrophoneTest'

const prompts = {
  English: ['Hello!', 'My name is…', 'How are you?'],
  French: ['Bonjour !', 'Je m’appelle…', 'Comment ça va ?'],
  Spanish: ['¡Hola!', 'Me llamo…', '¿Cómo estás?'],
}

function Partner({ player }: { player: Player }) {
  return <div className="partner-identity">
    <Avatar name={player.name} photo={player.photoURL} />
    <div><strong>{player.name}</strong><p className="muted">@{player.username}</p>
      {player.communicationLevel && <p>{player.learningLanguage} · {player.communicationLevel}</p>}</div>
  </div>
}

function Chat({ room, messages }: { room?: Room; messages: Session['chat'] }) {
  const [text, setText] = useState('')
  const [cooldown, setCooldown] = useState(false)
  const list = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight
  }, [messages.length, messages.at(-1)?.timestamp])

  useEffect(() => {
    if (cooldown) {
      const timer = setTimeout(() => setCooldown(false), 850)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  function send(event: FormEvent) {
    event.preventDefault()
    if (!room || cooldown || !text.trim()) return
    room.send('chat', text)
    setText('')
    setCooldown(true)
  }

  return <section className="panel stack">
    <h2>Chat</h2>
    <div className="chat-log" ref={list} role="log" aria-label="Room chat">
      {messages.length === 0 && <p className="muted">No messages yet.</p>}
      {messages.map(message => <div className="chat-message" key={message.timestamp + ':' + message.sender + ':' + message.text}>
        <p><strong>{message.sender}</strong> <time dateTime={new Date(message.timestamp).toISOString()}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </time></p>
        <p>{message.text}</p>
      </div>)}
    </div>
    <form className="chat-form" onSubmit={send}>
      <input aria-label="Message" placeholder="Send a message" maxLength={500} value={text} onChange={event => setText(event.target.value)} />
      <button disabled={!room || cooldown || !text.trim()}>Send</button>
    </form>
  </section>
}


export function RoomScreen({ room, session, host, view, reconnecting, leave, invite }: {
  room?: Room; session?: Session; host: boolean; view?: PrivateGameView; reconnecting: boolean;
  leave: () => void; invite: () => void
}) {
  const [leaving, setLeaving] = useState(false)
  const [friendError, setFriendError] = useState('')
  const [friendBusy, setFriendBusy] = useState(false)
  const leaveDialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const phase = session?.phase
  const game = session && minigames.get(session.gameId)?.config
  const seat = host ? 'host' : 'guest'
  const peer = host ? 'guest' : 'host'
  const partner = session?.[peer]
  const language = session?.[seat]?.learningLanguage
  const connected = !!room && !!session?.host?.connected && !!session.guest?.connected
  const voted = session?.ready[seat]
  const partnerVoted = session?.ready[peer]
  const communication = phase === 'introduction' || phase === 'game' || phase === 'results'
  const returningHome = phase === 'results' && !voted
  const title = phase === 'confirmation' ? 'You found a partner!'
    : phase === 'introduction' ? 'Meet your partner!'
    : phase === 'game' ? game?.name ?? 'Game'
    : phase === 'results' ? 'Great teamwork!'
    : phase === 'lobby' && !session?.matchType ? 'Waiting for your friend…' : 'Connecting to your partner…'

  useEffect(() => { heading.current?.focus() }, [phase])
  useEffect(() => {
    if (!room) return
    return room.onMessage('friend-error', (message: string) => {
      setFriendBusy(false)
      setFriendError(message)
    })
  }, [room])
  useEffect(() => { setFriendBusy(false) }, [session?.friendship?.host, session?.friendship?.guest, session?.friendship?.accepted])
  useEffect(() => {
    if (leaving) leaveDialog.current?.showModal()
    else leaveDialog.current?.close()
  }, [leaving])

  const readyButton = (label: string) => <div className="readiness stack">
    <p role="status">{voted ? 'Waiting for your partner…' : partnerVoted ? 'Your partner is ready.' : 'Your partner is getting ready.'}</p>
    <button className="large-action" disabled={!connected || voted} onClick={() => room?.send('ready', phase)}>{label}</button>
  </div>

  return <>
    <div className="game-toolbar">
      <button className="secondary" onClick={() => returningHome ? leave() : setLeaving(true)}>
        {phase === 'results' ? 'Back to home' : 'Leave session'}
      </button>
    </div>
    <dialog ref={leaveDialog} className="panel leave-dialog" onClose={() => setLeaving(false)} aria-labelledby="leave-title">
      <div className="stack">
        <h2 id="leave-title">Leave this session?</h2>
        <p>Your partner will return home too.</p>
        <div className="actions">
          <button autoFocus onClick={() => setLeaving(false)}>Stay</button>
          <button className="secondary" onClick={leave}>Leave session</button>
        </div>
      </div>
    </dialog>
    <div className={communication ? 'room-grid' : 'room-stage'} data-game={session?.gameId}>
      <section className="panel stack stage-card" key={phase}>
        <h1 ref={heading} tabIndex={-1}>{title}</h1>
        {(reconnecting || (partner && !partner.connected)) && <p className="notice" role="status">
          {reconnecting ? 'Reconnecting to the room…' : 'Your partner is reconnecting…'}
        </p>}
        {language && <p className="language-chip"><span aria-hidden="true">{flags[language]}</span> Practicing {language}</p>}
        {phase === 'lobby' && host && !session?.matchType && <button onClick={invite} disabled={!room}>Invite a friend</button>}
        {phase === 'confirmation' && <>
          {partner && language !== partner.learningLanguage && <p>Your partner is practicing {partner.learningLanguage}.</p>}
          {session?.matchType && <p className="muted">{session.matchType === 'reciprocal' ? 'Reciprocal match' : 'Shared learning match'}</p>}
          {host && <label>Minigame
            <select value={session?.gameId} disabled={!connected || voted || partnerVoted}
              onChange={event => room?.send('phase', { gameId: event.target.value })}>
              {[...minigames.values()].map(({ config }) => <option key={config.id} value={config.id}>{config.name}</option>)}
            </select>
          </label>}
          {game && <div><h2>{game.name}</h2><p className="muted">{game.description}</p></div>}
          {readyButton('I’m ready!')}
        </>}
        {phase === 'introduction' && <>
          {partner && <Partner player={partner} />}
          <MicrophoneTest />
          {language && <section className="prompt-card">
            <h2>Say hello!</h2>
            <ul lang={languageTags[language]}>{prompts[language].map(prompt => <li key={prompt}>{prompt}</li>)}</ul>
          </section>}
          {readyButton('I’m ready to play!')}
        </>}
        {phase === 'game' && <>
          {partner && <p className="muted">Playing with @{partner.username}</p>}
          {game && <p>{game.description}</p>}
          {session?.progress && <ActiveGame progress={session.progress} view={view} ready={connected}
            send={payload => room?.send('game-action', payload)} />}
        </>}
        {phase === 'results' && <div className="results-transition stack">
          {session?.results && <Results result={session.results} seat={session.rolesSwapped ? peer : seat} />}
          {session?.matchType && session.friendship && <section className="friend-celebration stack">
            {session.friendship.accepted ? <>
              <div className="friend-animation" role="img" aria-label="High five and hug">
                <span className="high-five">🙌</span><span className="hug">🫂</span>
              </div>
              <p role="status">You’re friends!</p>
            </> : <>
              <h2>Keep the conversation going</h2>
              <p>{session.friendship[seat] ? 'Friend request sent!' : session.friendship[peer] ? 'Your partner would like to be friends!' : 'Send your partner a high five and a friend request.'}</p>
              <button className="secondary" disabled={!room || friendBusy || session.friendship[seat]} onClick={() => {
                setFriendError('')
                setFriendBusy(true)
                room?.send('friend')
              }}>{session.friendship[seat] ? 'Request sent' : session.friendship[peer] ? 'Accept friendship' : 'Add friend 🙌'}</button>
            </>}
            {friendError && <p className="error" role="alert">{friendError}</p>}
          </section>}
          {!session?.matchType && <label>Choose the next game
            <select value={session?.gameId} disabled={!connected || voted || partnerVoted}
              onChange={event => room?.send('phase', { gameId: event.target.value })}>
              {[...minigames.values()].map(({ config }) => <option key={config.id} value={config.id}>{config.name}</option>)}
            </select>
          </label>}
          {readyButton('Play Again')}
        </div>}
      </section>
      {communication && <aside className="stack" aria-label="Communication">
        <Voice room={room} host={host} />
        <Chat room={room} messages={session?.chat ?? []} />
      </aside>}
    </div>
  </>
}
