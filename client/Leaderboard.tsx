import { useEffect, useState } from 'react'
import type { Leaderboards } from '../shared/types'
import { api, errorText } from './backend'
import { minigames } from './minigames/registry'
import './leaderboard.css'

const games = [...minigames.values()].map(({ config }) => ({ id: config.id, name: config.name }))

export function Leaderboard({ uid }: { uid: string }) {
  const [data, setData] = useState<Leaderboards>()
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [selected, setSelected] = useState('overall')

  useEffect(() => {
    let active = true
    setError('')
    api<Leaderboards>('/leaderboard').then(value => {
      if (active) setData(value)
    }).catch(failure => {
      if (active) setError(errorText(failure))
    })
    return () => { active = false }
  }, [reload])

  const entries = selected === 'overall' ? data?.overall : data?.games[selected]
  const game = games.find(item => item.id === selected)
  const mine = selected === 'overall' ? data?.mine.total : data?.mine.games[selected]?.highScore
  return <section className="leaderboard-page stack">
    <header className="leaderboard-header">
      <span className="leaderboard-emblem" aria-hidden="true">★</span>
      <div><h1>Leaderboard</h1><p>See the best scores across every game.</p></div>
    </header>
    <div className="leaderboard-tabs" role="group" aria-label="Choose leaderboard">
      <button className={selected === 'overall' ? 'selected' : 'secondary'} aria-pressed={selected === 'overall'} onClick={() => setSelected('overall')}>Overall</button>
      {games.map(item => <button key={item.id} className={selected === item.id ? 'selected' : 'secondary'}
        aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>{item.name}</button>)}
    </div>
    {error && <section className="panel stack"><p role="alert" className="error">{error}</p><button onClick={() => setReload(value => value + 1)}>Try again</button></section>}
    {!error && !data && <p role="status">Loading leaderboard…</p>}
    {data && <>
      <section className="leaderboard-my-score" aria-label="Your score">
        <div><span>Your {game ? 'high score' : 'total score'}</span><strong>{mine ?? '—'}</strong></div>
        <div><span>Games played</span><strong>{selected === 'overall' ? data.mine.gamesPlayed : data.mine.games[selected]?.gamesPlayed ?? 0}</strong></div>
      </section>
      <section className="panel leaderboard-ranking">
        <div className="heading-row"><h2>{game ? game.name + ' high scores' : 'Overall scores'}</h2><span>{entries?.length ?? 0} players</span></div>
        {entries?.length ? <ol>{entries.map((entry, index) => <li key={entry.uid} className={entry.uid === uid ? 'is-you' : ''}>
          <span className="leaderboard-rank">{index + 1}</span>
          <span className="leaderboard-name">{entry.displayName}{entry.uid === uid && <small> You</small>}</span>
          <strong>{entry.score}</strong>
        </li>)}</ol> : <p>No scores yet. Finish a game to get on the board.</p>}
      </section>
    </>}
  </section>
}
