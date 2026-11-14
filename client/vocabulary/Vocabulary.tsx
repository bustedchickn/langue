import { useEffect, useState, type FormEvent } from 'react'
import { languages, type Language } from '../../shared/types'
import { blankWord, parseWordImport, wordProgress, type VocabularySet, type VocabularyWord } from '../../shared/vocabulary'
import { errorText } from '../backend'
import { useInterface } from '../locales/interface'
import { PronunciationButton } from '../pronunciation/PronunciationButton'
import { deleteVocabularySet, editVocabularySet, initializeVocabulary, saveVocabularySet,
  updateVocabularyWord, watchVocabulary } from './store'
import { Flashcards, LearnOrTest, MatchMode, WriteMode } from './study'
import './vocabulary.css'

type Mode = 'flashcards' | 'learn' | 'write' | 'match' | 'test'
const modes: { id: Mode; label: string }[] = [
  { id: 'flashcards', label: 'Flashcards' }, { id: 'learn', label: 'Learn' },
  { id: 'write', label: 'Write' }, { id: 'match', label: 'Match' }, { id: 'test', label: 'Test' },
]
const flashcardsButtonImages: Record<Language, string> = {
  English: '/flashcards-button-en-it.png',
  French: '/flashcards-button-fr.png',
  Spanish: '/flashcards-button-es.png',
  German: '/flashcards-button-de.png',
  Italian: '/flashcards-button-en-it.png',
  Portuguese: '/flashcards-button-pt.png',
  Japanese: '/flashcards-button-ja.png',
  Korean: '/flashcards-button-ko.png',
  Chinese: '/flashcards-button-zh.png',
  Russian: '/flashcards-button-ru.png',
}
const dateLabel = (date: number | null) => date ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date) : 'Not yet practiced'

export function VocabularyHub({ uid, defaultLanguage }: { uid: string; defaultLanguage: Language }) {
  const { language: interfaceLanguage } = useInterface()
  const [sets, setSets] = useState<VocabularySet[] | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [language, setLanguage] = useState<Language>(defaultLanguage)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editorId, setEditorId] = useState<string | 'new' | null>(null)
  const [mode, setMode] = useState<Mode | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const stop = watchVocabulary(uid, value => { if (active) setSets(value) }, failure => {
      if (active) setError(errorText(failure))
    })
    void initializeVocabulary(uid).then(() => { if (active) setReady(true) })
      .catch(failure => { if (active) { setError(errorText(failure)); setReady(true) } })
    return () => { active = false; stop() }
  }, [uid])

  const selected = sets?.find(item => item.id === selectedId)
  const editing = editorId === 'new' ? undefined : sets?.find(item => item.id === editorId)
  const filtered = (sets ?? []).filter(item => item.targetLanguage === language &&
    (!search.trim() || [item.name, item.topic, item.description, ...item.words.flatMap(word => [word.term, word.translation])]
      .some(text => text.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))))
  const practice = (sets ?? []).filter(item => item.targetLanguage === language)
    .flatMap(item => item.words.filter(word => word.favorite || word.mastery === 'learning')
      .map(word => ({ set: item, word }))).slice(0, 8)
  const totals = (sets ?? []).filter(item => item.targetLanguage === language)
    .reduce((result, item) => {
      const count = wordProgress(item.words)
      result.mastered += count.mastered
      result.learning += count.learning
      result.new += count.new
      return result
    }, { mastered: 0, learning: 0, new: 0 })

  async function duplicateSet(value: VocabularySet) {
    setError('')
    try {
      const now = Date.now()
      await saveVocabularySet({ ...value, id: crypto.randomUUID(), name: value.name + ' copy',
        words: value.words.map(word => ({ ...word, id: crypto.randomUUID(), mastery: 'new' as const })),
        createdAt: now, updatedAt: now, lastPracticedAt: null })
      setMessage('Set duplicated.')
    } catch (failure) { setError(errorText(failure)) }
  }

  async function removeSet(id: string) {
    setError('')
    try {
      await deleteVocabularySet(id)
      if (selectedId === id) setSelectedId(null)
      setDeleteId(null)
      setMessage('Set deleted.')
    } catch (failure) { setError(errorText(failure)) }
  }

  async function updateWord(setId: string, wordId: string, change: Partial<VocabularyWord>) {
    try { await updateVocabularyWord(setId, wordId, change) }
    catch (failure) { setError(errorText(failure)) }
  }

  if (editorId) return <VocabularyEditor key={editorId} uid={uid} initial={editing}
    sourceLanguage={language === 'English' ? 'French' : 'English'} targetLanguage={language}
    onCancel={() => setEditorId(null)} onSaved={(id, text) => {
      setEditorId(null); setSelectedId(id); setMessage(text)
    }} />

  if (selected) return <section className="vocab-page stack" aria-label="Vocabulary set">
    <button className="secondary vocab-back" data-navigation="back" onClick={() => { setSelectedId(null); setMode(null) }}>← All vocabulary sets</button>
    <header className="vocab-header">
      <span className="vocab-emblem" aria-hidden="true">✦</span>
      <div><p className="vocab-eyebrow">{selected.topic} · {selected.sourceLanguage} → {selected.targetLanguage}</p>
        <h1>{selected.name}</h1><p>{selected.description}</p></div>
    </header>
    <SetProgress words={selected.words} />
    {message && <p className="notice" role="status">{message}</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="vocab-actions">
      <button className="secondary" onClick={() => { setEditorId(selected.id); setMode(null) }}>Edit set</button>
      <button className="secondary" onClick={() => void duplicateSet(selected)}>Duplicate set</button>
      <button className="secondary" onClick={() => setDeleteId(selected.id)}>Delete set</button>
    </div>
    {deleteId === selected.id && <DeletePrompt name={selected.name} cancel={() => setDeleteId(null)} confirm={() => void removeSet(selected.id)} />}
    <nav className="vocab-modes" aria-label="Study modes">
      {modes.map(item => <button key={item.id} className={item.id === 'flashcards'
        ? 'vocab-mode-image' + (mode === item.id ? ' vocab-mode-active' : '')
        : mode === item.id ? 'vocab-mode-active' : 'secondary'}
      aria-current={mode === item.id ? 'page' : undefined} onClick={() => setMode(item.id)}>
        {item.id === 'flashcards' ? <img src={flashcardsButtonImages[interfaceLanguage]} alt={item.label} /> : item.label}
      </button>)}
    </nav>
    {!mode && <section className="panel stack"><h2>Words in this set</h2><WordList value={selected} update={updateWord} /></section>}
    {mode === 'flashcards' && <Flashcards key={selected.id + mode} set={selected} update={updateWord} />}
    {mode === 'learn' && <LearnOrTest key={selected.id + mode} set={selected} kind="learn" update={updateWord} />}
    {mode === 'write' && <WriteMode key={selected.id + mode} set={selected} update={updateWord} />}
    {mode === 'match' && <MatchMode key={selected.id + mode} set={selected} update={updateWord} />}
    {mode === 'test' && <LearnOrTest key={selected.id + mode} set={selected} kind="test" update={updateWord} />}
  </section>

  return <section className="vocab-page stack" aria-label="Vocabulary hub">
    <header className="vocab-header">
      <span className="vocab-emblem" aria-hidden="true">✦</span>
      <div><h1>Your Vocabulary</h1><p>Build confidence one word and one conversation at a time.</p></div>
    </header>
    <div className="vocab-filters panel">
      <label>Language to practice<select value={language} onChange={event => setLanguage(event.target.value as Language)}>
        {languages.map(value => <option key={value}>{value}</option>)}
      </select></label>
      <label>Search words and sets<input type="search" value={search} onChange={event => setSearch(event.target.value)}
        placeholder="Find a word or topic" /></label>
      <button onClick={() => setEditorId('new')}>+ Create new set</button>
    </div>
    {message && <p className="notice" role="status">{message}</p>}
    {error && <section className="panel stack"><p className="error" role="alert">{error}</p>
      <button className="secondary" onClick={() => { setError(''); void initializeVocabulary(uid).catch(failure => setError(errorText(failure))) }}>Try again</button></section>}
    {(!ready || sets === null) && <p role="status">Loading vocabulary…</p>}
    {ready && sets && <>
      <section className="vocab-summary" aria-label="Your word progress">
        <div><strong>{totals.mastered}</strong><span>Mastered</span></div>
        <div><strong>{totals.learning}</strong><span>Learning</span></div>
        <div><strong>{totals.new}</strong><span>New</span></div>
      </section>
      <section className="stack" aria-labelledby="vocab-sets-heading">
        <div className="heading-row"><h2 id="vocab-sets-heading">Vocabulary sets</h2><span>{filtered.length} sets</span></div>
        {filtered.length ? <div className="vocab-set-grid">{filtered.map(value => {
          const progress = wordProgress(value.words)
          return <article className="vocab-set-card" key={value.id}>
            <p className="vocab-eyebrow">{value.topic}</p>
            <h3><button className="vocab-title-button" onClick={() => { setSelectedId(value.id); setMode(null) }}>{value.name}</button></h3>
            <p>{value.description}</p>
            <p className="vocab-pair">{value.sourceLanguage} → {value.targetLanguage} · {value.words.length} words</p>
            <div className="vocab-progress-line"><span>{progress.percent}% complete</span><span>Last practiced: {dateLabel(value.lastPracticedAt)}</span></div>
            <progress max={100} value={progress.percent} aria-label={`${value.name}: ${progress.percent}% mastered`} />
            <div className="vocab-card-actions">
              <button onClick={() => { setSelectedId(value.id); setMode('flashcards') }}>Study</button>
              <button className="secondary" onClick={() => setEditorId(value.id)}>Edit</button>
              <button className="secondary" onClick={() => void duplicateSet(value)}>Duplicate</button>
              <button className="secondary" onClick={() => setDeleteId(value.id)}>Delete</button>
            </div>
            {deleteId === value.id && <DeletePrompt name={value.name} cancel={() => setDeleteId(null)} confirm={() => void removeSet(value.id)} />}
          </article>
        })}</div> : <div className="panel stack"><p>{search ? 'No sets match your search.' : `No ${language} sets yet. Create one to start practicing.`}</p>
          <button onClick={() => setEditorId('new')}>Create a set</button></div>}
      </section>
      <section className="panel stack" aria-labelledby="vocab-practice-heading">
        <h2 id="vocab-practice-heading">Favorites &amp; needs practice</h2>
        {practice.length ? <div className="vocab-practice-list">{practice.map(({ set, word }) =>
          <button className="secondary" key={set.id + word.id} onClick={() => { setSelectedId(set.id); setMode('flashcards') }}>
            <span aria-hidden="true">{word.favorite ? '★' : '↺'}</span> {word.term} → {word.translation}
            <small>{set.name} · {word.favorite ? 'Favorite' : 'Learning'}</small>
          </button>)}</div> : <p>Star a word or mark it “Still learning” to keep it here for review.</p>}
      </section>
    </>}
  </section>
}

function SetProgress({ words }: { words: VocabularyWord[] }) {
  const count = wordProgress(words)
  return <div className="vocab-summary" aria-label="Set progress">
    <div><strong>{count.mastered}</strong><span>Mastered</span></div>
    <div><strong>{count.learning}</strong><span>Learning</span></div>
    <div><strong>{count.new}</strong><span>New</span></div>
  </div>
}

function DeletePrompt({ name, cancel, confirm }: { name: string; cancel: () => void; confirm: () => void }) {
  return <div className="vocab-delete-prompt" role="group" aria-label={`Delete ${name}?`}>
    <p>Delete “{name}” and its study progress?</p>
    <button className="secondary" onClick={cancel}>Cancel</button>
    <button className="vocab-danger" onClick={confirm}>Confirm delete</button>
  </div>
}

function WordList({ value, update }: { value: VocabularySet; update: (setId: string, wordId: string, change: Partial<VocabularyWord>) => Promise<void> }) {
  return <ul className="vocab-word-list">{value.words.map(word => <li key={word.id}>
    <div><strong>{word.emoji && <span aria-hidden="true">{word.emoji} </span>}{word.term}</strong>
      {word.imageUrl && <img className="vocab-word-image" src={word.imageUrl} alt={word.term} loading="lazy" />}
      <span>{word.translation}</span><small>{word.partOfSpeech || 'Word or phrase'} · {word.mastery}</small>
      {word.example && <small>{word.example}</small>}{word.notes && <small>Note: {word.notes}</small>}</div>
    <div className="vocab-word-actions"><PronunciationButton text={word.translation} language={value.targetLanguage} />
      <button className="secondary" aria-label={`${word.favorite ? 'Remove favorite from' : 'Star'} ${word.term}`}
        aria-pressed={word.favorite} onClick={() => void update(value.id, word.id, { favorite: !word.favorite })}>{word.favorite ? '★' : '☆'}</button></div>
  </li>)}</ul>
}

function VocabularyEditor({ uid, initial, sourceLanguage, targetLanguage, onCancel, onSaved }: {
  uid: string; initial?: VocabularySet; sourceLanguage: Language; targetLanguage: Language
  onCancel: () => void; onSaved: (id: string, message: string) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [topic, setTopic] = useState(initial?.topic ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [source, setSource] = useState<Language>(initial?.sourceLanguage ?? sourceLanguage)
  const [target, setTarget] = useState<Language>(initial?.targetLanguage ?? targetLanguage)
  const [words, setWords] = useState<VocabularyWord[]>(initial?.words ?? [blankWord()])
  const [importText, setImportText] = useState('')
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function changeWord(id: string, change: Partial<VocabularyWord>) {
    setWords(current => current.map(word => word.id === id ? { ...word, ...change } : word))
  }
  function importWords() {
    const parsed = parseWordImport(importText)
    if (parsed.errors.length) { setError('Check the format on line ' + parsed.errors.join(', ') + '. Use word — translation.'); return }
    if (!parsed.words.length) { setError('Add at least one word to import.'); return }
    if (words.filter(word => word.term.trim() || word.translation.trim()).length + parsed.words.length > 200) {
      setError('A set can hold up to 200 words.'); return
    }
    setWords(current => [...current.filter(word => word.term.trim() || word.translation.trim()), ...parsed.words])
    setImportText(''); setError(''); setMessage(`${parsed.words.length} words imported.`)
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    const clean = words.filter(word => word.term.trim() || word.translation.trim())
      .map(word => ({ ...word, term: word.term.trim(), translation: word.translation.trim(),
        partOfSpeech: word.partOfSpeech.trim(), example: word.example.trim(), notes: word.notes.trim(), emoji: word.emoji.trim(), imageUrl: word.imageUrl?.trim() ?? '' }))
    if (clean.some(word => word.imageUrl && !/^https:\/\//i.test(word.imageUrl))) {
      setError('Image links must start with https://.'); return
    }
    if (!name.trim() || source === target || !clean.length || clean.some(word => !word.term || !word.translation) || clean.length > 200) {
      setError('Add a set name, choose different languages, and complete at least one word and translation (up to 200).')
      return
    }
    setBusy(true); setError('')
    try {
      const now = Date.now()
      const value: VocabularySet = {
        id: initial?.id ?? crypto.randomUUID(), ownerUid: uid, name: name.trim(), topic: topic.trim() || 'My words',
        description: description.trim(), sourceLanguage: source, targetLanguage: target,
        words: clean, createdAt: initial?.createdAt ?? now, updatedAt: now,
        lastPracticedAt: initial?.lastPracticedAt ?? null,
      }
      if (initial) await editVocabularySet(value)
      else await saveVocabularySet(value)
      onSaved(value.id, initial ? 'Set updated.' : 'Set created.')
    } catch (failure) { setError(errorText(failure)) }
    finally { setBusy(false) }
  }

  return <section className="vocab-page stack" aria-label="Vocabulary set editor">
    <button className="secondary vocab-back" data-navigation="back" onClick={onCancel}>← Back to vocabulary</button>
    <header className="vocab-header"><span className="vocab-emblem" aria-hidden="true">✎</span>
      <div><h1>{initial ? 'Edit Vocabulary Set' : 'Create Vocabulary Set'}</h1>
        <p>Collect words you want to use with your next partner.</p></div></header>
    {error && <p className="error" role="alert">{error}</p>}
    {message && <p className="notice" role="status">{message}</p>}
    <form className="stack" onSubmit={event => void save(event)}>
      <section className="panel vocab-editor-fields">
        <label>Set name<input required maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="My conversation words" /></label>
        <label>Topic<input maxLength={60} value={topic} onChange={event => setTopic(event.target.value)} placeholder="Travel, food, school…" /></label>
        <label>Source language<select value={source} onChange={event => setSource(event.target.value as Language)}>
          {languages.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Target language<select value={target} onChange={event => setTarget(event.target.value as Language)}>
          {languages.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="vocab-span">Description<textarea maxLength={280} value={description} onChange={event => setDescription(event.target.value)}
          placeholder="What will you practice?" /></label>
      </section>
      <section className="panel stack"><div className="heading-row"><h2>Words</h2><span>{words.length} / 200</span></div>
        {words.map((word, index) => <fieldset className="vocab-word-editor" key={word.id}>
          <legend>Word {index + 1}</legend>
          <label>Word or phrase<input value={word.term} maxLength={120} onChange={event => changeWord(word.id, { term: event.target.value })} /></label>
          <label>Translation<input value={word.translation} maxLength={120} onChange={event => changeWord(word.id, { translation: event.target.value })} /></label>
          <label>Part of speech<input value={word.partOfSpeech} maxLength={40} onChange={event => changeWord(word.id, { partOfSpeech: event.target.value })} placeholder="Noun, verb, phrase…" /></label>
          <label>Emoji or image symbol<input value={word.emoji} maxLength={8} onChange={event => changeWord(word.id, { emoji: event.target.value })} placeholder="Optional emoji" /></label>
          <label>Image link (optional)<input type="url" value={word.imageUrl ?? ''} maxLength={500} onChange={event => changeWord(word.id, { imageUrl: event.target.value })} placeholder="https://…" /></label>
          <label>Example sentence<input value={word.example} maxLength={280} onChange={event => changeWord(word.id, { example: event.target.value })} /></label>
          <label>Notes<input value={word.notes} maxLength={500} onChange={event => changeWord(word.id, { notes: event.target.value })} /></label>
          <button type="button" className="secondary" onClick={() => setWords(current => current.filter(item => item.id !== word.id))}
            aria-label={`Remove word ${index + 1}`}>Remove word</button>
        </fieldset>)}
        <button type="button" className="secondary" disabled={words.length >= 200} onClick={() => setWords(current => [...current, blankWord()])}>+ Add word</button>
      </section>
      <section className="panel stack"><h2>Import words</h2>
        <p>One pair per line: <strong>word — translation</strong></p>
        <label>Paste word pairs<textarea rows={5} value={importText} onChange={event => setImportText(event.target.value)}
          placeholder={'hello — bonjour\nthank you — merci'} /></label>
        <button type="button" className="secondary" onClick={importWords}>Import word pairs</button>
      </section>
      {preview && <section className="panel stack" aria-label="Set preview"><h2>Preview</h2>
        <p>{name || 'Untitled set'} · {source} → {target}</p>
        <ul>{words.filter(word => word.term || word.translation).map(word => <li key={word.id}>{word.term || '…'} — {word.translation || '…'}</li>)}</ul>
      </section>}
      <div className="vocab-actions">
        <button disabled={busy} type="submit">{busy ? 'Saving…' : 'Save set'}</button>
        <button type="button" className="secondary" onClick={() => setPreview(value => !value)}>{preview ? 'Hide preview' : 'Preview'}</button>
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  </section>
}
