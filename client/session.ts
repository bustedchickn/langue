import { useEffect, useRef, useState } from 'react'
import type { Room } from 'colyseus.js'
import type { Session } from '../shared/types'
import type { PrivateGameView } from '../shared/minigames/contracts'
import { auth, errorText, multiplayer } from './backend'

export function useSession(report: (message: string) => void) {
  const [room, setRoom] = useState<Room>()
  const [session, setSession] = useState<Session>()
  const [host, setHost] = useState(false)
  const [view, setView] = useState<PrivateGameView>()
  const [reconnecting, setReconnecting] = useState(false)
  const current = useRef<Room | undefined>(undefined)
  const generation = useRef(0)

  function attach(connection: Room) {
    current.current = connection
    connection.onMessage('session', (snapshot: Session) => {
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

  async function reconnect(token: string) {
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

  return { room, session, host, view, reconnecting, attach, reset }
}
