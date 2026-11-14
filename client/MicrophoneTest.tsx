import { useEffect, useRef, useState } from 'react'
import { errorText } from './backend'

export function MicrophoneTest() {
  const [testing, setTesting] = useState(false)
  const [opening, setOpening] = useState(false)
  const [level, setLevel] = useState(0)
  const [heard, setHeard] = useState(false)
  const [error, setError] = useState('')
  const cleanup = useRef<() => void>(() => {})

  useEffect(() => () => cleanup.current(), [])

  async function start() {
    setOpening(true)
    setError('')
    setHeard(false)
    setLevel(0)
    let active = true
    let stream: MediaStream | undefined
    let context: AudioContext | undefined
    let timer: ReturnType<typeof setInterval> | undefined
    cleanup.current = () => {
      active = false
      clearInterval(timer)
      stream?.getTracks().forEach(track => track.stop())
      void context?.close().catch(() => {})
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access requires HTTPS or localhost.')
      context = new AudioContext()
      await context.resume()
      if (!active) return
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!active) {
        stream.getTracks().forEach(track => track.stop())
        return
      }
      const analyser = context.createAnalyser()
      context.createMediaStreamSource(stream).connect(analyser)
      const samples = new Float32Array(analyser.fftSize)
      timer = setInterval(() => {
        analyser.getFloatTimeDomainData(samples)
        const rms = Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length)
        setLevel(Math.min(1, rms * 5))
        if (rms > .015) setHeard(true)
      }, 100)
      setTesting(true)
    } catch (failure) {
      if (active) {
        setError(failure instanceof DOMException && failure.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Allow access in your browser to try again.'
          : errorText(failure))
        cleanup.current()
        setOpening(false)
      }
    } finally {
      if (active) setOpening(false)
    }
  }

  return <section className="mic-test stack">
    <h2>Test your microphone</h2>
    <p className="muted">This test stays on your device. Use Join Voice to talk to your partner.</p>
    {testing && <>
      <meter aria-label="Microphone level" min={0} max={1} value={level} />
      <p role="status">{heard ? 'Sound detected' : 'Speak to check your microphone.'}</p>
    </>}
    <button className="secondary" disabled={opening} onClick={() => {
      if (testing) { cleanup.current(); setTesting(false) }
      else void start()
    }}>{opening ? 'Opening test…' : testing ? 'Stop test' : 'Test mic'}</button>
    {error && <p className="error" role="alert">{error}</p>}
  </section>
}
