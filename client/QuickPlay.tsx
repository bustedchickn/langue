import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { Client, Room } from 'colyseus.js'
import type { UserProfile } from '../shared/types'
import { api, errorText, multiplayer } from './backend'

type Seat = Parameters<Client['consumeSeatReservation']>[0]
type SearchStatus = { status: 'searching'; waitedMs?: number } | { status: 'matched'; seat: Seat } | { status: 'idle' }

export function QuickPlay({ profile, joined, done }: {
  profile: UserProfile; joined: (room: Room) => void; done: (message?: string) => void
}) {
  const [seconds, setSeconds] = useState(0)
  const [cancel, setCancel] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const cancelSearch = useRef<() => void>(() => {})
  const onJoined = useEffectEvent(joined)
  const onDone = useEffectEvent(done)

  useEffect(() => {
    let active = true
    let requested = false
    let consuming = false
    let canceled = false
    let timer: ReturnType<typeof setTimeout>
    let resolveDelay: (() => void) | undefined
    const pause = () => new Promise<void>(resolve => {
      resolveDelay = resolve
      timer = setTimeout(resolve, 1000)
    })
    async function search() {
      try {
        const initial = await api<{ waitedMs: number }>('/matchmaking', 'POST')
        requested = true
        if (!active || canceled) {
          await api('/matchmaking', 'DELETE')
          requested = false
          if (active) onDone()
          return
        }
        const started = performance.now() - initial.waitedMs
        let failures = 0
        while (active && !canceled) {
          let result: SearchStatus
          try {
            result = await api<SearchStatus>('/matchmaking')
            failures = 0
          } catch (error) {
            if (!active) return
            if (++failures >= 5) throw error
            await pause()
            continue
          }
          if (!active || canceled) return
          if (result.status === 'matched') {
            consuming = true
            setConnecting(true)
            const room = await multiplayer.consumeSeatReservation(result.seat)
            if (active) onJoined(room)
            else await room.leave()
            return
          }
          if (result.status === 'idle') throw new Error('The search ended. Try Quick Play again.')
          setSeconds(Math.floor((performance.now() - started) / 1000))
          await pause()
        }
      } catch (error) {
        if (active) {
          if (requested) {
            await api('/matchmaking', 'DELETE').catch(() => {})
            requested = false
          }
          onDone(errorText(error))
        }
      }
    }
    cancelSearch.current = () => {
      if (consuming || canceled) return
      canceled = true
      setCancel(true)
      if (requested) {
        void api('/matchmaking', 'DELETE')
          .then(() => { requested = false; if (active) onDone() })
          .catch(error => { if (active) onDone(errorText(error)) })
      }
    }
    void search()
    return () => {
      active = false
      clearTimeout(timer)
      resolveDelay?.()
      if (requested && !consuming) void api('/matchmaking', 'DELETE').catch(() => {})
    }
  }, [])

  return <section className="panel stack">
    <h2>{connecting ? 'Joining your partner…' : 'Finding your language partner…'}</h2>
    <p>Fluent in {profile.fluentLanguage} · Learning {profile.learningLanguage}</p>
    <p>Searching for {seconds}s</p>
    <button className="secondary" disabled={cancel || connecting} onClick={() => cancelSearch.current()}>Cancel</button>
  </section>
}
