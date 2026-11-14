import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { GameProgress, GameResults } from '../../../shared/minigames/contracts'
import { codenamesTeamWords, isBoardWord, normalizeClue, wordCards, type CodenamesResults, type CodenamesView } from '../../../shared/minigames/codenames'
import { languageNames, languageTags } from '../../../shared/types'
import { useInterface } from '../../locales/interface'
import { codenamesCopy } from './copy'
import { playEffect } from '../../sounds'
import './codenames.css'
import { FittedWord } from './FittedWord'

export function CodenamesView({ data, disabled, send }: {
  progress: GameProgress; data: unknown; disabled: boolean; send: (action: unknown) => void
}) {
  const view = data as CodenamesView
  const { language } = useInterface()
  const text = codenamesCopy(language)
  const cardLocale = view.language
  const definitionLocale = view.fluentLanguage
  const [word, setWord] = useState('')
  const [count, setCount] = useState(1)
  const [selectedCard, setSelectedCard] = useState<string>()
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
  const selected = view.cards.find(card => card.id === selectedCard)
  const selectedWord = selected && cards.get(selected.id)
  const canConfirm = view.role === 'guesser' && (view.remaining > 0 || view.suddenDeath) && !selected?.revealed
  const clue = normalizeClue(word)
  const invalid = !clue || isBoardWord(clue, view.cards.map(card => cards.get(card.id)!.words[cardLocale]), cardLocale)
  function giveClue(event: FormEvent) {
    event.preventDefault()
    if (disabled || !clue || invalid || view.remaining) return
    send({ type: 'clue', word: clue, count, revision: view.revision })
    setWord('')
  }

  return <section className="codenames stack" lang={languageTags[language]}>
    <p><strong>{view.role === 'clue-giver' ? text.clueGiver : text.guesser}</strong> · {text.practice} <span lang={languageTags[view.language]}>{languageNames[view.language]}</span></p>
    <p>{view.role === 'clue-giver' ? text.giverHelp : text.guesserHelp}</p>
    <p role="status">{view.suddenDeath ? text.sudden : text.turns(view.turnsLeft)}</p>
    {view.role === 'clue-giver' && <p className="codenames-legend">{text.legend}</p>}
    {view.suddenDeath ? null : view.clue ? <p className="codenames-clue" role="status">{text.clue} <strong>{view.clue}</strong> · {text.guesses(view.remaining)}</p>
      : <p role="status">{text.waiting}</p>}
    {view.role === 'clue-giver' && !view.remaining && !view.suddenDeath && <form className="clue-form" onSubmit={giveClue}>
      <label>{text.clueLabel}<input value={word} lang={languageTags[cardLocale]} onChange={event => setWord(event.target.value)} /></label>
      <label>{text.number}<input type="number" min={1} max={codenamesTeamWords - view.cards.filter(card => card.revealed === 'team').length}
        value={count} onChange={event => setCount(Number(event.target.value))} /></label>
      <button disabled={disabled || invalid || count < 1 || count > codenamesTeamWords - view.cards.filter(card => card.revealed === 'team').length}>{text.give}</button>
      {word && invalid && <p className="error">{text.invalid}</p>}
    </form>}
    <div className="codenames-grid">
      {view.cards.map(card => {
        const item = cards.get(card.id)!
        const word = item.words[cardLocale]
        const kind = card.revealed ?? card.kind
        const hintOpen = showDefinition === card.id
        return <div className="word-card-wrap" key={card.id}>
          <button className="word-card" data-id={card.id} data-kind={kind} data-revealed={!!card.revealed}
            disabled={disabled} aria-pressed={selectedCard === card.id}
            aria-label={card.revealed ? word + ' — ' + text[card.revealed] : word}
            lang={languageTags[view.language]} onClick={() => setSelectedCard(selectedCard === card.id ? undefined : card.id)}>
            <FittedWord word={word} revealed={!!card.revealed} />{card.revealed && <span className="word-revealed-mark" aria-hidden="true">
              {card.revealed === 'team' ? '✓' : card.revealed === 'assassin' ? '✕' : '–'}
            </span>}
          </button>
          <button type="button" className="word-info" disabled={disabled}
            aria-label={view.hintsUnlocked.includes(card.id) ? text.definition(word) : text.definition(word) + ', ' + text.hintCost}
            aria-expanded={hintOpen}
            onClick={() => {
              setShowDefinition(hintOpen ? undefined : card.id)
              if (!view.hintsUnlocked.includes(card.id)) send({ type: 'hint', id: card.id, revision: view.revision })
            }}>{text.hint}</button>
          {hintOpen && <span className="word-definition is-open"
            lang={languageTags[definitionLocale]} role="tooltip">{item.definitions[definitionLocale]}</span>}
        </div>
      })}
    </div>
    {selected && selectedWord && <section className="word-preview" aria-live="polite">
      <h3 lang={languageTags[view.language]}>{selectedWord.words[view.language]}</h3>
      <p lang={languageTags[view.fluentLanguage]}>{selectedWord.definitions[view.fluentLanguage]}</p>
      <div className="actions">
        <button type="button" className="secondary" onClick={() => setSelectedCard(undefined)}>{text.close}</button>
        {canConfirm && <button type="button" disabled={disabled} onClick={() => {
          send({ type: 'guess', id: selected.id, revision: view.revision })
          setSelectedCard(undefined)
        }}>{text.confirm}</button>}
      </div>
    </section>}
    {view.role === 'guesser' && view.remaining > 0 && <button className="secondary" disabled={disabled}
      onClick={() => send({ type: 'pass', revision: view.revision })}>{text.pass}</button>}
  </section>
}

export function CodenamesResultsView({ result }: { result: GameResults }) {
  const data = result as CodenamesResults
  const message = result.endedEarly ? 'The game ended before all team words were found. Your current progress is shown below.' : data.lossReason === 'assassin'
    ? 'You lost by guessing the black square.'
    : data.lossReason === 'neutral'
      ? 'You lost by guessing a neutral square in sudden death.'
      : result.outcome === 'victory'
        ? 'You found all the purple squares!'
        : 'The round is over.'
  return <section className="stack">
    <h3 className="game-outcome">{result.endedEarly ? 'Game ended early' : result.outcome === 'victory' ? 'You won!' : 'You lost'}</h3>
    <p role="status">{message}</p>
    <p>{result.players.join(' & ')}</p>
    <dl className="game-results">
      <div><dt>Words found</dt><dd>{result.completed} / {codenamesTeamWords}</dd></div>
      <div><dt>Incorrect guesses</dt><dd>{data.wrongGuesses}</dd></div>
      <div><dt>Final score</dt><dd>{result.score}</dd></div>
    </dl>
  </section>
}
