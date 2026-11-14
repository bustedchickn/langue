import { useEffect, useRef, useState } from 'react'
import type { Room } from 'colyseus.js'
import type { Session } from '../shared/types'
import type { PrivateGameView } from '../shared/minigames/contracts'
import { auth, errorText, multiplayer } from './backend'

const recoveryKey = (uid: string) => 'langue:room:' + uid

export function useSession(uid: string | undefined, report: (message: string) => void) {
  const [room, setRoom] = useState<Room>()
  const [session, setSession] = useState<Session>()
  const [host, setHost] = useState(false)
  const [view, setView] = useState<PrivateGameView>()
  const [reconnecting, setReconnecting] = useState(false)
  const current = useRef<Room | undefined>(undefined)
  const generation = useRef(0)
  const owner = useRef<string | undefined>(undefined)

  function attach(connection: Room) {
    owner.current = uid
    if (uid) sessionStorage.setItem(recoveryKey(uid), connection.reconnectionToken)
    current.current = connection
    connection.onMessage('session', (snapshot: Session) => {
      if (current.current !== connection) return
      if (snapshot.phase !== 'game') setView(undefined)
      setSession(snapshot)
    })
    connection.onMessage('role', role => setHost(role === 'host'))
    connection.onMessage('game-view', setView)
    connection.onMessage('ended', reason => {
      if (current.current === connection) {
        reset()
        report(reason)
      }
    })
    connection.onError((_, message) => report(message ?? 'Room connection error.'))
    connection.onLeave(code => {
      if (current.current !== connection) return
      if (code === 1000 || code === 4000 || code === 4002) {
        reset()
        report('The session ended.')
      } else {
        void reconnect(connection.reconnectionToken)
      }
    })
    setRoom(connection)
    setReconnecting(false)
  }

  async function reconnect(token: string, restoring = false) {
    const attempt = generation.current
    setReconnecting(true)
    setRoom(undefined)
    const deadline = Date.now() + 30000
    while (attempt === generation.current && Date.now() < deadline) {
      try {
        multiplayer.auth.token = await auth.currentUser?.getIdToken() ?? ''
        const next = await multiplayer.reconnect(token)
        if (attempt === generation.current) attach(next)
        else void next.leave()
        return
      } catch {
        if (restoring && Date.now() >= deadline - 25000) break
        await new Promise(resolve => setTimeout(resolve, 1200))
      }
    }
    if (attempt === generation.current) {
      reset()
      report('Could not reconnect. The session ended.')
    }
  }

  function reset() {
    generation.current += 1
    const active = current.current
    if (owner.current) sessionStorage.removeItem(recoveryKey(owner.current))
    owner.current = undefined
    current.current = undefined
    setRoom(undefined)
    setSession(undefined)
    setHost(false)
    setView(undefined)
    setReconnecting(false)
    if (active?.connection.isOpen) void active.leave().catch(error => report(errorText(error)))
  }

  useEffect(() => {
    if (room) room.send('sync')
  }, [room])

  useEffect(() => {
    if (owner.current && owner.current !== uid) reset()
    if (!uid || current.current) return
    const token = sessionStorage.getItem(recoveryKey(uid))
    if (token) {
      owner.current = uid
      void reconnect(token, true)
    }
  }, [uid])

  return { room, session, host, view, reconnecting, attach, reset }
}
