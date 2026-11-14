import { useLayoutEffect, useRef } from 'react'

/** Measure the real font and available card area, including after resize/reveal. */
export function FittedWord({ word, revealed }: { word: string; revealed: boolean }) {
  const area = useRef<HTMLSpanElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const container = area.current!
    const text = label.current!
    let active = true
    let frame = 0
    const fit = () => {
      if (!active || !container.clientWidth || !container.clientHeight) return
      let lower = 6
      let upper = 15
      for (let iteration = 0; iteration < 9; iteration++) {
        const size = (lower + upper) / 2
        text.style.fontSize = size + 'px'
        if (text.scrollWidth <= container.clientWidth && text.scrollHeight <= container.clientHeight) lower = size
        else upper = size
      }
      text.style.fontSize = Math.floor(lower * 10) / 10 + 'px'
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit) }
    fit()
    const observer = new ResizeObserver(schedule)
    observer.observe(container)
    void document.fonts.ready.then(() => { if (active) schedule() })
    document.fonts.addEventListener('loadingdone', schedule)
    return () => {
      active = false
      observer.disconnect()
      cancelAnimationFrame(frame)
      document.fonts.removeEventListener('loadingdone', schedule)
    }
  }, [word, revealed])
  return <span ref={area} className="word-label-area"><span ref={label} className="word-label">{word}</span></span>
}
