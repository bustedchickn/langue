import { useEffect, useState, type FormEvent } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import type { Friendship, Invitation, ProfileFields } from '../shared/types'
import { api, db, errorText } from './backend'
import { minigames } from './minigames/registry'

type RecordWithId<T> = T & { id: string }
export type Person = ProfileFields & { uid: string }
export type GameInvite = RecordWithId<Invitation>

export function useInvitations(uid: string | undefined, report: (message: string) => void) {
  const [records, setRecords] = useState<GameInvite[]>([])
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!uid) return
    const stop = onSnapshot(query(collection(db, 'invitations'), where('to', '==', uid)), snapshot => {
      setNow(Date.now())
      setRecords(snapshot.docs.map(doc => ({ ...doc.data() as Invitation, id: doc.id })))
    }, error => report(errorText(error)))
    return () => {
      stop()
      setRecords([])
    }
  }, [uid, report])
  useEffect(() => {
    const next = records.filter(record => record.status === 'pending' && record.expiresAt > now)
      .reduce((time, invite) => Math.min(time, invite.expiresAt), Infinity)
    if (next === Infinity) return
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, next - Date.now()))
    return () => clearTimeout(timer)
  }, [records, now])
  return records.filter(record => record.to === uid && record.status === 'pending' && record.expiresAt > now)
}

export function PlayerName({ uid }: { uid: string }) {
  const [person, setPerson] = useState<Person>()
  useEffect(() => {
    let active = true
    api<Person>('/people/' + encodeURIComponent(uid)).then(value => {
      if (active) setPerson(value)
    }).catch(() => {})
    return () => { active = false }
  }, [uid])
  return <div>
    <strong>{person?.displayName ?? 'Player'}</strong>
    {person && <>
      <p className="muted">@{person.username}</p>
      <p className="muted">Speaks {person.fluentLanguage} · Learning {person.learningLanguage}</p>
    </>}
  </div>
}

export function Friends({ uid, invite, inviteOnly, inLobby }: {
  uid: string; invite: (uid: string, gameId?: string) => Promise<void>; inviteOnly?: boolean; inLobby?: boolean
}) {
  const [records, setRecords] = useState<RecordWithId<Friendship>[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [result, setResult] = useState<Person | null>()
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [working, setWorking] = useState(false)
  const [gameId, setGameId] = useState(() => minigames.keys().next().value)

  useEffect(() => onSnapshot(query(collection(db, 'friendships'), where('members', 'array-contains', uid)), snapshot => {
    setRecords(snapshot.docs.map(doc => ({ ...doc.data() as Friendship, id: doc.id })))
  }, failure => setError(errorText(failure))), [uid])

  async function run(action: () => Promise<unknown>, success = '') {
    setWorking(true)
    setError('')
    setStatus('')
    try {
      await action()
      setStatus(success)
    } catch (failure) { setError(errorText(failure)) }
    finally { setWorking(false) }
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = String(new FormData(event.currentTarget).get('username'))
    setResult(undefined)
    void run(async () => setResult(await api<Person | null>('/search?username=' + encodeURIComponent(name))))
  }

  function change(id: string, action: string) {
    void run(() => api('/friends/' + id, 'PATCH', { action }))
  }

  const accepted = records.filter(record => record.status === 'accepted')
  const incoming = records.filter(record => record.status === 'pending' && record.to === uid)
  const outgoing = records.filter(record => record.status === 'pending' && record.from === uid)

  return <div className="stack">
    <section className="panel stack">
      <div className="heading-row"><h2>{inviteOnly ? 'Invite a friend' : 'Friends'}</h2>
        {!inviteOnly && <button className="secondary" onClick={() => setShowSearch(!showSearch)}>Add Friend</button>}
      </div>
      {showSearch && <form className="stack" onSubmit={search}>
        <label>Search by username<input name="username" autoCapitalize="none" required /></label>
        <button disabled={working}>Search</button>
      </form>}
      {result === null && <p>No player found with that username.</p>}
      {result && <div className="card">
        <div><strong>{result.displayName}</strong><p className="muted">@{result.username}</p></div>
        <button disabled={working || result.uid === uid || records.some(record => record.members.includes(result.uid))}
          onClick={() => void run(() => api('/friends', 'POST', { uid: result.uid }), 'Friend request sent.')}>Send request</button>
      </div>}
      {accepted.length === 0 && <p className="muted">No friends yet.</p>}
      {accepted.length > 0 && !inLobby && <label>Minigame
        <select value={gameId} disabled={working} onChange={event => setGameId(event.target.value)}>
          {[...minigames.values()].map(({ config }) => <option key={config.id} value={config.id}>{config.name}</option>)}
        </select>
      </label>}
      {accepted.map(record => {
        const other = record.from === uid ? record.to : record.from
        return <div className="card" key={record.id}>
          <PlayerName uid={other} />
          <div className="actions">
            <button disabled={working} onClick={() => void run(() => invite(other, gameId), 'Invitation sent.')}>Invite to Play</button>
            {!inviteOnly && <button className="secondary" disabled={working} onClick={() => change(record.id, 'remove')}>Remove</button>}
          </div>
        </div>
      })}
    </section>
    {!inviteOnly && <section className="panel stack">
      <h2>Incoming requests</h2>
      {incoming.length === 0 && <p className="muted">No incoming requests.</p>}
      {incoming.map(record => <div className="card" key={record.id}>
        <PlayerName uid={record.from} />
        <div className="actions">
          <button disabled={working} onClick={() => change(record.id, 'accept')}>Accept</button>
          <button className="secondary" disabled={working} onClick={() => change(record.id, 'decline')}>Decline</button>
        </div>
      </div>)}
      <h2>Outgoing requests</h2>
      {outgoing.length === 0 && <p className="muted">No outgoing requests.</p>}
      {outgoing.map(record => <div className="card" key={record.id}><PlayerName uid={record.to} /><span>Pending</span></div>)}
    </section>}
    {status && <p role="status">{status}</p>}
    {error && <p className="error" role="alert">{error}</p>}
  </div>
}
