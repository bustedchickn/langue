import { useEffect, useRef, useState, type FormEvent, type TouchEvent } from 'react'
import { acceptsAnswer, type VocabularySet, type VocabularyWord } from '../../shared/vocabulary'
import { PronunciationButton } from '../pronunciation/PronunciationButton'

type UpdateWord = (setId: string, wordId: string, change: Partial<VocabularyWord>) => Promise<void>
type StudyProps = { set: VocabularySet; update: UpdateWord }

export function Flashcards({ set, update }: StudyProps) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const touchX = useRef<number | null>(null)
  const word = set.words[index]
  const move = (step: number) => {
    setIndex(current => Math.max(0, Math.min(set.words.length - 1, current + step)))
    setFlipped(false)
  }
  useEffect(() => { setAnnouncement(`Card ${index + 1} of ${set.words.length}: ${word.term}.`) }, [index, set.words.length, word.term])
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey ||
          (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable=true]'))) return
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1) }
      if (event.key === 'ArrowRight') { event.preventDefault(); move(1) }
      if (event.code === 'Space' && !(event.target instanceof HTMLElement && event.target.closest('button'))) {
        event.preventDefault(); setFlipped(current => !current)
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [set.words.length])
  function onTouchEnd(event: TouchEvent) {
    if (touchX.current === null) return
    const delta = event.changedTouches[0].clientX - touchX.current
    if (Math.abs(delta) > 45) move(delta < 0 ? 1 : -1)
    touchX.current = null
  }
  function mark(mastery: VocabularyWord['mastery']) {
    void update(set.id, word.id, { mastery })
    if (index < set.words.length - 1) move(1)
    setAnnouncement(`${word.term} marked ${mastery}.`)
  }
  return <section className="panel vocab-study stack" aria-labelledby="flashcards-title">
    <div className="heading-row"><h2 id="flashcards-title">Flashcards</h2><span>{index + 1} of {set.words.length}</span></div>
    <p>Flip to reveal the translation. Swipe or use ← and → to move between cards.</p>
    <button className="vocab-flashcard" onClick={() => setFlipped(value => !value)}
      onTouchStart={event => { touchX.current = event.touches[0].clientX }} onTouchEnd={onTouchEnd}
      aria-label={`Flashcard ${index + 1}: ${flipped ? word.translation : word.term}. Flip card`}>
      <span className="vocab-eyebrow">{flipped ? set.targetLanguage : set.sourceLanguage} · Tap to flip</span>
      <strong>{word.emoji && <span aria-hidden="true">{word.emoji} </span>}{flipped ? word.translation : word.term}</strong>
      {word.imageUrl && <img className="vocab-flash-image" src={word.imageUrl} alt="" />}
      {flipped && <span className="vocab-card-extra">{word.partOfSpeech}{word.example && <em>{word.example}</em>}{word.notes && <small>{word.notes}</small>}</span>}
    </button>
    <div className="vocab-actions">
      <PronunciationButton text={word.translation} language={set.targetLanguage} label={`Pronounce ${word.translation}`} />
      <button className="secondary" onClick={() => void update(set.id, word.id, { favorite: !word.favorite })}
        aria-pressed={word.favorite}>{word.favorite ? '★ Starred' : '☆ Star'}</button>
      <button className="secondary" onClick={() => mark('learning')}>Still learning</button>
      <button onClick={() => mark('mastered')}>I know this</button>
    </div>
    <div className="vocab-actions"><button className="secondary" disabled={index === 0} onClick={() => move(-1)}>← Previous</button>
      <button className="secondary" disabled={index === set.words.length - 1} onClick={() => move(1)}>Next →</button></div>
    <p className="vocab-screenreader" role="status" aria-live="polite">{announcement || `Card ${index + 1} of ${set.words.length}`}</p>
  </section>
}

type QuestionKind = 'recognition' | 'translation' | 'listening' | 'typing'
type Question = { wordId: string; kind: QuestionKind }
const questionKinds: QuestionKind[] = ['recognition', 'translation', 'listening', 'typing']
const shuffled = <T,>(items: T[]) => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}
function makeQuestions(words: VocabularyWord[], kind: 'learn' | 'test'): Question[] {
  const order = shuffled(words)
  const count = kind === 'learn' ? Math.max(4, order.length) : Math.min(10, Math.max(4, order.length))
  return Array.from({ length: count }, (_, index) => ({ wordId: order[index % order.length].id, kind: questionKinds[index % 4] }))
}

export function LearnOrTest({ set, kind, update }: StudyProps & { kind: 'learn' | 'test' }) {
  const [queue, setQueue] = useState<Question[]>(() => makeQuestions(set.words, kind))
  const [index, setIndex] = useState(0)
  const [introduced, setIntroduced] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [answered, setAnswered] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [missed, setMissed] = useState<string[]>([])
  const [announcement, setAnnouncement] = useState('')
  const [revealedAudio, setRevealedAudio] = useState(false)
  const question = queue[index]
  const word = set.words.find(value => value.id === question?.wordId)
  const effectiveKind = question?.kind === 'typing' || set.words.length < 2 ? 'typing' : question?.kind
  const expected = effectiveKind === 'recognition' || effectiveKind === 'typing' ? word?.translation : word?.term
  const choiceKey = effectiveKind === 'recognition' ? 'translation' : 'term'
  const options = word ? shuffled([word, ...shuffled(set.words.filter(value => value.id !== word.id)).slice(0, 3)])
    .map(value => value[choiceKey]).filter((value, position, list) => list.indexOf(value) === position) : []
  const [choices, setChoices] = useState<string[]>([])
  useEffect(() => { setChoices(options) }, [index, set.id, effectiveKind])

  function answer(value: string) {
    if (!word || answered || !value.trim()) return
    const good = effectiveKind === 'typing' ? acceptsAnswer(value, expected ?? '') : value === expected
    setCorrect(good); setAnswered(true)
    if (good) setCorrectCount(count => count + 1)
    else {
      setMissed(current => current.includes(word.id) ? current : [...current, word.id])
      if (kind === 'learn') setQueue(current => [...current, { wordId: word.id, kind: 'typing' }])
    }
    void update(set.id, word.id, { mastery: good ? 'mastered' : 'learning' })
    setAnnouncement(good ? `Correct: ${expected}.` : `Not quite. The answer is ${expected}.`)
  }
  function next() {
    setIndex(current => current + 1)
    setInput(''); setAnswered(false)
    setRevealedAudio(false)
    setAnnouncement(`Question ${index + 2} of ${queue.length}.`)
  }
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (answered || effectiveKind === 'typing' || event.target instanceof HTMLInputElement) return
      const number = Number(event.key)
      if (number >= 1 && number <= choices.length) answer(choices[number - 1])
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [answered, choices, effectiveKind, word?.id])

  if (!word) {
    const percent = queue.length ? Math.round(correctCount / queue.length * 100) : 0
    return <section className="panel vocab-study stack" aria-labelledby="quiz-finished">
      <h2 id="quiz-finished">{kind === 'learn' ? 'Set learned!' : 'Test complete!'}</h2>
      <p role="status">{correctCount} of {queue.length} correct · {percent}% accuracy</p>
      {missed.length ? <><h3>Words to review</h3><ul>{missed.map(id => {
        const item = set.words.find(value => value.id === id)!
        return <li key={id}>{item.term} — {item.translation}</li>
      })}</ul><p>Review these words with Flashcards or Write Mode, then try again.</p></>
        : <p>Great work. Keep practicing to hold onto these words.</p>}
      <button className="secondary" onClick={() => { setQueue(makeQuestions(set.words, kind))
        setIndex(0); setIntroduced([]); setMissed([]); setCorrectCount(0); setInput(''); setAnswered(false) }}>Study again</button>
    </section>
  }

  if (kind === 'learn' && !introduced.includes(word.id)) return <section className="panel vocab-study stack" aria-labelledby="learn-intro-title">
    <p className="vocab-eyebrow">New word · {introduced.length + 1} of {set.words.length}</p>
    <h2 id="learn-intro-title">Meet “{word.translation}”</h2>
    <p><strong>{word.term}</strong> means <strong>{word.translation}</strong>.</p>
    {word.example && <p>{word.example}</p>}
    <PronunciationButton text={word.translation} language={set.targetLanguage} />
    <button onClick={() => setIntroduced(current => [...current, word.id])}>Try this word</button>
  </section>

  return <section className="panel vocab-study stack" aria-labelledby="quiz-title">
    <div className="heading-row"><h2 id="quiz-title">{kind === 'learn' ? 'Learn Mode' : 'Test Mode'}</h2><span>{index + 1} of {queue.length}</span></div>
    <progress value={index} max={queue.length} aria-label={`${index} of ${queue.length} questions complete`} />
    <p className="vocab-eyebrow">{effectiveKind === 'recognition' ? 'Recognize' : effectiveKind === 'translation' ? 'Translate' : effectiveKind === 'listening' ? 'Listen' : 'Type the answer'}</p>
    {effectiveKind === 'recognition' && <p className="vocab-question">What does <strong>{word.term}</strong> mean in {set.targetLanguage}?</p>}
    {effectiveKind === 'translation' && <p className="vocab-question">Which {set.sourceLanguage} phrase means <strong>{word.translation}</strong>?</p>}
    {effectiveKind === 'listening' && <><p className="vocab-question">Listen, then choose the meaning in {set.sourceLanguage}.</p>
      <PronunciationButton text={word.translation} language={set.targetLanguage} label="Listen to the vocabulary word" />
      <button className="secondary" onClick={() => setRevealedAudio(true)}>Reveal word if audio is unavailable</button>
      {revealedAudio && <p role="status">Heard word: {word.translation}</p>}</>}
    {effectiveKind === 'typing' && <p className="vocab-question">Type the {set.targetLanguage} translation of <strong>{word.term}</strong>.</p>}
    {effectiveKind === 'typing' ? <form onSubmit={(event: FormEvent) => { event.preventDefault(); answer(input) }} className="vocab-answer-form">
      <label>Your answer<input autoComplete="off" value={input} disabled={answered} onChange={event => setInput(event.target.value)} /></label>
      <button disabled={answered || !input.trim()}>Check answer</button>
    </form> : <div className="vocab-choices" role="group" aria-label="Answer choices">{choices.map((choice, choiceIndex) =>
      <button className="secondary" key={choice} disabled={answered} onClick={() => answer(choice)}>{choiceIndex + 1}. {choice}</button>)}</div>}
    {answered && <div className="vocab-feedback" data-correct={correct}>
      <strong>{correct ? 'Correct!' : 'Still learning'}</strong>
      <span>{correct ? 'You got it.' : `Correct answer: ${expected}`}</span>
      <button onClick={next}>{index + 1 === queue.length ? 'See results' : 'Next question'}</button>
    </div>}
    <p className="vocab-screenreader" role="status" aria-live="polite">{announcement}</p>
  </section>
}

export function WriteMode({ set, update }: StudyProps) {
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [result, setResult] = useState<boolean | null>(null)
  const [correct, setCorrect] = useState(0)
  const word = set.words[index]
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!word || result !== null || !input.trim()) return
    const good = acceptsAnswer(input, word.translation)
    setResult(good)
    if (good) setCorrect(current => current + 1)
    void update(set.id, word.id, { mastery: good ? 'mastered' : 'learning' })
  }
  if (!word) return <section className="panel vocab-study stack"><h2>Writing complete!</h2>
    <p role="status">{correct} of {set.words.length} correct.</p>
    <button className="secondary" onClick={() => { setIndex(0); setInput(''); setResult(null); setCorrect(0) }}>Try again</button></section>
  return <section className="panel vocab-study stack" aria-labelledby="write-title">
    <div className="heading-row"><h2 id="write-title">Write Mode</h2><span>{index + 1} of {set.words.length}</span></div>
    <progress value={index} max={set.words.length} aria-label={`${index} of ${set.words.length} words complete`} />
    <p className="vocab-question">Translate <strong>{word.term}</strong> into {set.targetLanguage}.</p>
    <form className="vocab-answer-form" onSubmit={submit}><label>Your translation<input autoComplete="off" value={input}
      disabled={result !== null} onChange={event => setInput(event.target.value)} /></label>
      <button disabled={result !== null || !input.trim()}>Check answer</button></form>
    {result !== null && <div className="vocab-feedback" data-correct={result} role="status" aria-live="polite">
      <strong>{result ? 'Correct!' : 'Still learning'}</strong><span>{result ? word.translation : `Correct answer: ${word.translation}`}</span>
      <button onClick={() => { setIndex(current => current + 1); setInput(''); setResult(null) }}>Next word</button></div>}
  </section>
}

type MatchCard = { key: string; wordId: string; text: string; side: 'term' | 'translation' }
export function MatchMode({ set, update }: StudyProps) {
  const [deck, setDeck] = useState<MatchCard[]>(() => shuffled(set.words.slice(0, 6).flatMap(word => [
    { key: word.id + '-term', wordId: word.id, text: word.term, side: 'term' as const },
    { key: word.id + '-translation', wordId: word.id, text: word.translation, side: 'translation' as const },
  ])))
  const [selected, setSelected] = useState<MatchCard | null>(null)
  const [matched, setMatched] = useState<string[]>([])
  const [attempts, setAttempts] = useState(0)
  const [locked, setLocked] = useState(false)
  const [message, setMessage] = useState('Choose a word and its translation.')
  const [started, setStarted] = useState(Date.now())
  const [elapsed, setElapsed] = useState(0)
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const totalPairs = deck.length / 2
  const finished = matched.length === totalPairs
  useEffect(() => {
    if (finished) return
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 250)
    return () => clearInterval(timer)
  }, [finished, started])
  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current) }, [])
  function choose(card: MatchCard) {
    if (locked || matched.includes(card.wordId) || selected?.key === card.key) return
    if (!selected) { setSelected(card); return }
    setAttempts(current => current + 1)
    if (selected.wordId === card.wordId && selected.side !== card.side) {
      setMatched(current => [...current, card.wordId]); setSelected(null)
      setMessage(`Matched ${card.text}. ${matched.length + 1} of ${totalPairs} pairs.`)
      void update(set.id, card.wordId, { mastery: 'mastered' })
    } else {
      setLocked(true); setMessage('Not a match. Try another pair.')
      timeout.current = setTimeout(() => { setSelected(null); setLocked(false) }, 650)
    }
  }
  return <section className="panel vocab-study stack" aria-labelledby="match-title">
    <div className="heading-row"><h2 id="match-title">Match Mode</h2><span>{elapsed}s · {attempts} attempts</span></div>
    <p role="status" aria-live="polite">{finished ? `All ${totalPairs} pairs matched in ${elapsed} seconds. ${Math.round(totalPairs / Math.max(1, attempts) * 100)}% accuracy.` : message}</p>
    <div className="vocab-match-grid">{deck.map(card => <button key={card.key} className="secondary" disabled={matched.includes(card.wordId)}
      aria-pressed={selected?.key === card.key} onClick={() => choose(card)}>
      <small>{card.side === 'term' ? set.sourceLanguage : set.targetLanguage}</small>
      <strong>{matched.includes(card.wordId) ? '✓ Matched' : card.text}</strong>
    </button>)}</div>
    {finished && <div className="vocab-feedback" data-correct="true"><strong>Nice matching!</strong>
      <span>{totalPairs} pairs · {attempts} attempts · {Math.round(totalPairs / Math.max(1, attempts) * 100)}% accuracy</span>
      <button className="secondary" onClick={() => { setDeck(shuffled(deck)); setMatched([]); setSelected(null); setAttempts(0); setElapsed(0); setStarted(Date.now()); setMessage('Choose a word and its translation.') }}>Play again</button></div>}
  </section>
}
