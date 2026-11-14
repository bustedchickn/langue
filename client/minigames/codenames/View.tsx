import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { GameProgress, GameResults } from '../../../shared/minigames/contracts'
import { codenamesTeamWords, wordCards, type CodenamesResults, type CodenamesView } from '../../../shared/minigames/codenames'
import { languageTags } from '../../../shared/types'
import { codenamesCopy } from './copy'
import { playEffect } from '../../sounds'
import './codenames.css'

export function CodenamesView({ data, disabled, send }: {
  progress: GameProgress; data: unknown; disabled: boolean; send: (action: unknown) => void
}) {
  const view = data as CodenamesView
  const text = codenamesCopy[view.fluentLanguage]
  const [word, setWord] = useState('')
  const [count, setCount] = useState(1)
  const [showDefinition, setShowDefinition] = useState<string>()
  const revealed = useRef(new Set(view.cards.filter(card => card.revealed).map(card => card.id)))
  useEffect(() => {
    for (const card of view.cards) {
      if (card.revealed && !revealed.current.has(card.id)) {
        revealed.current.add(card.id)
        playEffect(card.revealed === 'team' ? 'pop' : 'hit')
      }
    }
  }, [view.cards])
  const cards = new Map(wordCards.map(card => [card.id, card]))
  const invalid = !/^[\p{L}\p{M}]+$/u.test(word.trim()) ||
    view.cards.some(card => cards.get(card.id)?.words[view.language].toLocaleLowerCase() === word.trim().toLocaleLowerCase())
  function giveClue(event: FormEvent) {
    event.preventDefault()
    if (disabled || invalid || view.remaining) return
    send({ type: 'clue', word: word.trim(), count, revision: view.revision })
    setWord('')
  }

  return <section className="codenames stack" lang={languageTags[view.fluentLanguage]}>
    <p><strong>{view.role === 'clue-giver' ? text.clueGiver : text.guesser}</strong> · {text.practice} {text.languages[view.language]}</p>
    <p>{view.role === 'clue-giver' ? text.giverHelp : text.guesserHelp}</p>
    <p role="status">{view.suddenDeath ? text.sudden : text.turns(view.turnsLeft)}</p>
    {view.role === 'clue-giver' && <p className="codenames-legend">{text.legend}</p>}
    {view.suddenDeath ? null : view.clue ? <p className="codenames-clue" role="status">{text.clue} <strong>{view.clue}</strong> · {text.guesses(view.remaining)}</p>
      : <p role="status">{text.waiting}</p>}
    {view.role === 'clue-giver' && !view.remaining && !view.suddenDeath && <form className="clue-form" onSubmit={giveClue}>
      <label>{text.clueLabel}<input value={word} maxLength={30} onChange={event => setWord(event.target.value)} /></label>
      <label>{text.number}<input type="number" min={1} max={codenamesTeamWords - view.cards.filter(card => card.revealed === 'team').length}
        value={count} onChange={event => setCount(Number(event.target.value))} /></label>
      <button disabled={disabled || invalid || count < 1 || count > codenamesTeamWords - view.cards.filter(card => card.revealed === 'team').length}>{text.give}</button>
      {word && invalid && <p className="error">{text.invalid}</p>}
    </form>}
    <div className="codenames-grid">
      {view.cards.map(card => {
        const item = cards.get(card.id)!
        const word = item.words[view.language]
        const kind = card.revealed ?? card.kind
        return <div className="word-card-wrap" key={card.id}>
          <button className="word-card" data-id={card.id} data-kind={kind} data-revealed={!!card.revealed}
            disabled={disabled || view.role !== 'guesser' || (!view.remaining && !view.suddenDeath) || !!card.revealed}
            aria-label={card.revealed ? word + ' — ' + text[card.revealed] : word}
            lang={languageTags[view.language]} onClick={() => send({ type: 'guess', id: card.id, revision: view.revision })}>
            <span>{word}</span>{card.revealed && <span className="word-revealed-mark" aria-hidden="true">
              {card.revealed === 'team' ? '✓' : card.revealed === 'assassin' ? '✕' : '–'}
            </span>}
          </button>
          <button type="button" className="word-info" aria-label={text.definition(word)}
            aria-expanded={showDefinition === card.id}
            onClick={() => setShowDefinition(showDefinition === card.id ? undefined : card.id)}>i</button>
          <span className={'word-definition' + (showDefinition === card.id ? ' is-open' : '')}
            lang={languageTags[view.fluentLanguage]} role="tooltip">{item.definitions[view.fluentLanguage]}</span>
        </div>
      })}
    </div>
    {view.role === 'guesser' && view.remaining > 0 && <button className="secondary" disabled={disabled}
      onClick={() => send({ type: 'pass', revision: view.revision })}>{text.pass}</button>}
  </section>
}

export function CodenamesResultsView({ result }: { result: GameResults }) {
  const data = result as CodenamesResults
  const message = data.lossReason === 'assassin'
    ? 'You lost by guessing the black square.'
    : data.lossReason === 'neutral'
      ? 'You lost by guessing a neutral square in sudden death.'
      : result.outcome === 'victory'
        ? 'You found all the purple squares!'
        : 'The round is over.'
  return <section className="stack">
    <h3 className="game-outcome">{result.outcome === 'victory' ? 'You won!' : 'You lost'}</h3>
    <p role="status">{message}</p>
    <p>{result.players.join(' & ')}</p>
    <dl className="game-results">
      <div><dt>Words found</dt><dd>{result.completed} / {codenamesTeamWords}</dd></div>
      <div><dt>Final score</dt><dd>{result.score}</dd></div>
    </dl>
  </section>
}
