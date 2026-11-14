import { useEffect, useRef, useState } from 'react'
import type { Room } from 'colyseus.js'
import './game-exit.css'

export function GameExitControls({ room, matchId }: { room?: Room; matchId?: string }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const available = !!room?.connection.isOpen && !!matchId

  useEffect(() => {
    setConfirming(false)
    setPending(false)
    setError('')
  }, [room, matchId])
  useEffect(() => {
    if (confirming && !dialog.current?.open) dialog.current?.showModal()
    else if (!confirming && dialog.current?.open) dialog.current.close()
  }, [confirming])
  useEffect(() => {
    if (!pending) return
    const timeout = setTimeout(() => {
      setPending(false)
      setError('The game has not ended yet. Check your connection and try again.')
    }, 7000)
    return () => clearTimeout(timeout)
  }, [pending])

  function endEarly() {
    if (!available || !room) return
    setError('')
    setConfirming(false)
    setPending(true)
    try { room.send('end-game', { matchId }) }
    catch { setPending(false); setError('Could not end the game. Please try again.') }
  }

  return <footer className="game-exit-controls" aria-label="Game options">
    <p>End early to see your current results.</p>
    <div className="actions">
      <button className="secondary" disabled={!available || pending} onClick={() => setConfirming(true)}>{pending ? 'Ending game…' : 'End early'}</button>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    <dialog ref={dialog} className="panel game-end-dialog" aria-labelledby="end-game-title" onClose={() => setConfirming(false)}>
      <div className="stack">
        <h2 id="end-game-title">End this game early?</h2>
        <p>This ends the current game for both players. You will see your current results and can play again together. Voice and text chat stay open.</p>
        <div className="actions">
          <button autoFocus onClick={() => setConfirming(false)}>Keep playing</button>
          <button className="secondary" disabled={!available || pending} onClick={endEarly}>End game</button>
        </div>
      </div>
    </dialog>
  </footer>
}
