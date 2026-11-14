import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { languageNames, languages, type Language } from '../shared/types'
import { flags } from './PlayerIdentity'
import { useInterface } from './locales/interface'

export function LanguagePicker({ value, disabled, onChange }: {
  value: Language; disabled: boolean; onChange: (language: Language) => void
}) {
  const { text } = useInterface()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(value)
  const picker = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function dismiss(event: PointerEvent) {
      if (!picker.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  function choose(language: Language) {
    setOpen(false)
    if (language !== value) onChange(language)
    trigger.current?.focus()
  }

  function handleKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
      return
    }
    if (event.key === 'Tab') {
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const index = languages.indexOf(open ? active : value)
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? languages.length - 1
        : open ? (index + (event.key === 'ArrowDown' ? 1 : -1) + languages.length) % languages.length : index
      setActive(languages[next])
      setOpen(true)
      return
    }
    if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault()
      choose(active)
    }
  }

  return <div className="learning-picker" ref={picker}>
    <span aria-hidden="true">{flags[value]}</span>
    <span id="practice-language-label" className="learning-label">{text.learning}</span>
    <div className="language-menu">
      <button ref={trigger} type="button" className="language-trigger" role="combobox"
        aria-labelledby="practice-language-label practice-language-value"
        aria-controls="practice-language-options" aria-expanded={open}
        aria-activedescendant={open ? 'practice-language-' + active : undefined}
        aria-haspopup="listbox" disabled={disabled} onKeyDown={handleKey} onClick={() => {
          setActive(value)
          setOpen(!open)
        }}>
        <span id="practice-language-value">{languageNames[value]}</span>
        <span className="language-chevron" aria-hidden="true" />
      </button>
      {open && <div className="language-options" id="practice-language-options" role="listbox" aria-label={text.learningLanguage}>
        {languages.map(language => <div id={'practice-language-' + language} role="option" key={language}
          aria-selected={language === value} className="language-option" data-active={active === language}
          onPointerMove={() => setActive(language)}
          onClick={() => choose(language)}>
          <span className="language-option-flag" aria-hidden="true">{flags[language]}</span>
          <span>{languageNames[language]}</span>
          {language === value && <span className="language-check" aria-hidden="true">✓</span>}
        </div>)}
      </div>}
    </div>
  </div>
}
