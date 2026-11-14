import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Room } from 'colyseus.js'
import type { Player, Session } from '../shared/types'
import { errorText } from './backend'
import { Voice } from './Voice'
import type { PrivateGameView } from '../shared/minigames/contracts'
import { ActiveGame, Results } from './minigames/GameScreen'
import { minigames } from './minigames/registry'

function Slot({ player, label }: { player: Player | null; label: string }) {
  return <div className="card slot">
    <span className="muted">{label}</span>
    <strong>{player?.name ?? 'Waiting for a player'}</strong>
    {player && <p className="muted">Speaks {player.fluentLanguage} · Learning {player.learningLanguage}</p>}
    {player && !player.connected && <p>Reconnecting…</p>}
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
  const [copyStatus, setCopyStatus] = useState('')
  const ready = !!room && !!session?.host?.connected && !!session.guest?.connected
  const phase = session?.phase ?? 'lobby'
  const game = session && minigames.get(session.gameId)?.config
  const url = new URL(location.pathname, location.origin)
  if (room) url.searchParams.set('room', room.roomId)
  const phaseAction = (action: string) => room?.send('phase', action)

  return <div className="room-grid">
    <div className="stack">
      <section className="panel stack">
        <div className="heading-row">
          <h2>{phase === 'game' ? game?.name ?? 'Game' : phase === 'results' ? 'Results' : 'Lobby'}</h2>
          <button className="secondary" onClick={leave}>Leave room</button>
        </div>
        {reconnecting && <p role="status">Reconnecting to the room…</p>}
        {phase === 'lobby' && <>
          {room && <div className="room-code">
            <span>Room code</span>
            <code>{room.roomId}</code>
            <button className="secondary" onClick={() => {
              void (navigator.clipboard?.writeText(url.href) ?? Promise.reject(new Error('Copy the link from the field below.')))
                .then(() => setCopyStatus('Link copied.'))
                .catch(error => setCopyStatus(errorText(error)))
            }}>Copy invitation link</button>
            {copyStatus && <span role="status">{copyStatus}</span>}
            <input aria-label="Invitation link" readOnly value={url.href} onFocus={event => event.target.select()} />
          </div>}
          <Slot label="Host" player={session?.host ?? null} />
          <Slot label="Partner" player={session?.guest ?? null} />
          {game && <div><h3>{game.name}</h3><p className="muted">{game.description}</p></div>}
          {host && <div className="actions">
            <button disabled={!ready} onClick={() => phaseAction('game')}>Start Game</button>
            {!session?.guest && <button className="secondary" disabled={!room} onClick={invite}>Invite Friend</button>}
          </div>}
        </>}
        {session?.progress && <ActiveGame progress={session.progress} view={view} ready={ready}
          send={payload => room?.send('game-action', payload)} />}
        {phase === 'results' && <>
          {session?.results && <Results result={session.results} />}
          <div className="actions">
            {host && <button disabled={!ready} onClick={() => phaseAction('game')}>Play Again</button>}
            <button className="secondary" disabled={!room} onClick={() => phaseAction('lobby')}>Return to Lobby</button>
          </div>
        </>}
      </section>
    </div>
    <div className="stack">
      <Voice room={room} host={host} />
      <Chat room={room} messages={session?.chat ?? []} />
    </div>
  </div>
}
