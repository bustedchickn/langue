import { useState, type FormEvent } from 'react'
import type { GameProgress } from '../../../shared/minigames/contracts'
import { codenamesTeamWords, wordCards, type CodenamesView } from '../../../shared/minigames/codenames'
import { languageTags } from '../../../shared/types'
import './codenames.css'

export function CodenamesView({ data, disabled, send }: {
  progress: GameProgress; data: unknown; disabled: boolean; send: (action: unknown) => void
}) {
  const view = data as CodenamesView
  const [word, setWord] = useState('')
  const [count, setCount] = useState(1)
  const [showDefinition, setShowDefinition] = useState<string>()
  const cards = new Map(wordCards.map(card => [card.id, card]))
  const invalid = !/^[\p{L}\p{M}]+$/u.test(word.trim()) ||
    view.cards.some(card => cards.get(card.id)?.words[view.language].toLocaleLowerCase() === word.trim().toLocaleLowerCase())
  function giveClue(event: FormEvent) {
    event.preventDefault()
    if (disabled || invalid || view.remaining) return
    send({ type: 'clue', word: word.trim(), count, revision: view.revision })
    setWord('')
  }

  return <section className="codenames stack">
    <p><strong>{view.role === 'clue-giver' ? 'Clue giver' : 'Guesser'}</strong> · Practice {view.language}</p>
    <p>{view.role === 'clue-giver'
      ? 'Give a one-word clue for the lavender cards. Avoid saying a word on the board.'
      : 'Listen for a clue, then find the matching words. Avoid the dark card!'}</p>
    <p role="status">{view.suddenDeath ? 'Sudden death — find the remaining words. Any wrong guess ends the game.' : view.turnsLeft + (view.turnsLeft === 1 ? ' turn left' : ' turns left')}</p>
    {view.role === 'clue-giver' && <p className="codenames-legend">🟣 Team &nbsp; ◻️ Neutral &nbsp; ⬛ Assassin</p>}
    {view.suddenDeath ? null : view.clue ? <p className="codenames-clue" role="status">Clue <strong>{view.clue}</strong> · {view.remaining} {view.remaining === 1 ? 'guess' : 'guesses'} left</p>
      : <p role="status">Waiting for a clue…</p>}
    {view.role === 'clue-giver' && !view.remaining && !view.suddenDeath && <form className="clue-form" onSubmit={giveClue}>
      <label>One-word clue<input value={word} maxLength={30} onChange={event => setWord(event.target.value)} /></label>
      <label>Number of words<input type="number" min={1} max={codenamesTeamWords - view.cards.filter(card => card.revealed === 'team').length}
        value={count} onChange={event => setCount(Number(event.target.value))} /></label>
      <button disabled={disabled || invalid || count < 1 || count > codenamesTeamWords - view.cards.filter(card => card.revealed === 'team').length}>Give clue</button>
      {word && invalid && <p className="error">Use one word that is not on the board.</p>}
    </form>}
    <div className="codenames-grid">
      {view.cards.map(card => {
        const item = cards.get(card.id)!
        const word = item.words[view.language]
        const kind = card.revealed ?? card.kind
        return <div className="word-card-wrap" key={card.id}>
          <button className="word-card" data-id={card.id} data-kind={kind} data-revealed={!!card.revealed}
            disabled={disabled || view.role !== 'guesser' || (!view.remaining && !view.suddenDeath) || !!card.revealed}
            lang={languageTags[view.language]} onClick={() => send({ type: 'guess', id: card.id, revision: view.revision })}>
            {word}
          </button>
          <button type="button" className="word-info" aria-label={'Definition of ' + word}
            aria-expanded={showDefinition === card.id}
            onClick={() => setShowDefinition(showDefinition === card.id ? undefined : card.id)}>i</button>
          <span className={'word-definition' + (showDefinition === card.id ? ' is-open' : '')} role="tooltip">{item.definition}</span>
        </div>
      })}
    </div>
    {view.role === 'guesser' && view.remaining > 0 && <button className="secondary" disabled={disabled}
      onClick={() => send({ type: 'pass', revision: view.revision })}>Pass remaining guesses</button>}
  </section>
}
