import { useEffect, useRef, useState } from 'react'
import type { Room } from 'colyseus.js'
import type { VoiceConfiguration, VoiceSignal } from '../shared/types'
import { api, errorText } from './backend'
import { VoiceConnection } from './voice/connection'

export function Voice({ room, host }: { room?: Room; host: boolean }) {
  const [stream, setStream] = useState<MediaStream>()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [muted, setMuted] = useState(false)
  const [playbackBlocked, setPlaybackBlocked] = useState(false)
  const [speaking, setSpeaking] = useState([false, false])
  const audio = useRef<HTMLAudioElement>(null)
  const local = useRef<MediaStream | undefined>(undefined)
  const controller = useRef<VoiceConnection | undefined>(undefined)
  const mounted = useRef(false)
  const joining = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      controller.current?.stop()
      local.current?.getTracks().forEach(track => track.stop())
      local.current = undefined
    }
  }, [])

  async function join() {
    if (!room || joining.current) return
    joining.current = true
    setBusy(true)
    setError('')
    let opened: MediaStream | undefined
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access requires HTTPS or localhost.')
      if (!window.RTCPeerConnection) throw new Error('This browser does not support voice. You can keep using text chat.')
      opened = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!mounted.current) {
        opened.getTracks().forEach(track => track.stop())
        return
      }
      local.current = opened
      setStream(opened)
    } catch (failure) {
      opened?.getTracks().forEach(track => track.stop())
      if (mounted.current) setError(failure instanceof DOMException && failure.name === 'NotAllowedError'
        ? 'Microphone access was denied. Enable it in your browser and try again. You can keep using text chat.'
        : errorText(failure))
    } finally {
      joining.current = false
      if (mounted.current) setBusy(false)
    }
  }

  function leave() {
    controller.current?.stop()
    controller.current = undefined
    local.current?.getTracks().forEach(track => track.stop())
    local.current = undefined
    setStream(undefined)
    setMuted(false)
    setPlaybackBlocked(false)
    setSpeaking([false, false])
    setError('')
  }

  useEffect(() => {
    if (!stream) return
    if (!room) {
      setStatus('Reconnecting to the room…')
      setError('')
      setSpeaking([false, false])
      return
    }
    let active = true
    let audioContext: AudioContext | undefined
    let remoteSource: MediaStreamAudioSourceNode | undefined
    const meters: (AnalyserNode | undefined)[] = []
    const requests = new Set<AbortController>()
    const element = audio.current
    try {
      audioContext = new AudioContext()
      meters[0] = audioContext.createAnalyser()
      audioContext.createMediaStreamSource(stream).connect(meters[0])
      void audioContext.resume().catch(() => {})
    } catch {
      // Voice playback can still work without audio meters.
    }
    const connection = new VoiceConnection({
      host,
      stream,
      send: signal => { if (room.connection.isOpen) room.send('voice', signal) },
      loadConfiguration: async () => {
        const request = new AbortController()
        requests.add(request)
        const timeout = setTimeout(() => request.abort(), 10000)
        try {
          // Bound the entire request, including Firebase token refresh when a
          // mobile connection goes offline before fetch has started.
          return await Promise.race([
            api<VoiceConfiguration>('/voice?roomId=' + encodeURIComponent(room.roomId), 'GET', undefined, request.signal),
            new Promise<never>((_, reject) => request.signal.addEventListener('abort',
              () => reject(new DOMException('Voice settings request timed out.', 'AbortError')), { once: true })),
          ])
        } finally {
          clearTimeout(timeout)
          requests.delete(request)
        }
      },
      status: (next, message = '') => {
        if (active) { setStatus(next); setError(message) }
      },
      remote: remote => {
        remoteSource?.disconnect()
        remoteSource = undefined
        meters[1] = undefined
        if (!active) return
        setPlaybackBlocked(false)
        if (element) {
          element.srcObject = remote ?? null
          if (remote) void element.play().catch(() => { if (active && element.srcObject === remote) setPlaybackBlocked(true) })
        }
        if (remote && audioContext && audioContext.state !== 'closed') {
          try {
            meters[1] = audioContext.createAnalyser()
            remoteSource = audioContext.createMediaStreamSource(remote)
            remoteSource.connect(meters[1])
          } catch { /* Meter failure must not interrupt signaling or playback. */ }
        }
      },
    })
    controller.current = connection
    const unsubscribe = room.onMessage<VoiceSignal>('voice', signal => connection.receive(signal))
    const resume = () => {
      if (document.visibilityState === 'visible') {
        void audioContext?.resume().catch(() => {})
        connection.resume()
      }
    }
    window.addEventListener('online', connection.resume)
    document.addEventListener('visibilitychange', resume)
    const microphoneEnded = () => {
      if (active) {
        setError('Your microphone was disconnected. Leave voice and join again to choose an available microphone. You can keep using text chat.')
        setStatus('Microphone unavailable')
        connection.stop()
      }
    }
    stream.getAudioTracks().forEach(track => track.addEventListener('ended', microphoneEnded))
    const sample = new Uint8Array(2048)
    const timer = setInterval(() => {
      const next = [0, 1].map(index => {
        const meter = meters[index]
        if (!meter || audioContext?.state !== 'running') return false
        meter.getByteTimeDomainData(sample)
        let energy = 0
        for (const value of sample) energy += ((value - 128) / 128) ** 2
        return Math.sqrt(energy / sample.length) > 0.025
      })
      setSpeaking(previous => previous.every((value, index) => value === next[index]) ? previous : next)
    }, 150)
    connection.start()
    if (room.connection.isOpen) room.send('sync')
    return () => {
      active = false
      unsubscribe()
      connection.stop()
      if (controller.current === connection) controller.current = undefined
      requests.forEach(request => request.abort())
      window.removeEventListener('online', connection.resume)
      document.removeEventListener('visibilitychange', resume)
      stream.getAudioTracks().forEach(track => track.removeEventListener('ended', microphoneEnded))
      clearInterval(timer)
      remoteSource?.disconnect()
      if (element) element.srcObject = null
      if (audioContext) void audioContext.close().catch(() => {})
    }
  }, [room, stream, host])

  return <section className="panel" aria-label="Voice chat">
    <h2>Voice</h2>
    {stream ? <>
      <p role="status">{status}</p>
      <p className="muted">{muted ? 'Microphone muted.' : speaking[0] ? 'You are speaking.' : 'Microphone on.'}
        {speaking[1] && ' Your partner is speaking.'}</p>
      <div className="actions">
        <button className="secondary" aria-pressed={muted} onClick={() => {
          stream.getAudioTracks().forEach(track => { track.enabled = muted })
          setMuted(!muted)
        }}>{muted ? 'Unmute' : 'Mute'}</button>
        {status === 'Voice could not connect' && <button className="secondary" disabled={!room} onClick={() => controller.current?.retry()}>Retry Voice</button>}
        <button className="secondary" onClick={leave}>Leave Voice</button>
      </div>
      {playbackBlocked && <button className="secondary" onClick={() => {
        void audio.current?.play().then(() => setPlaybackBlocked(false))
          .catch(() => setError('Audio playback is blocked by your browser. Check its site permissions.'))
      }}>Play partner audio</button>}
      <audio ref={audio} autoPlay playsInline onPlaying={() => setPlaybackBlocked(false)} />
    </> : <button onClick={() => void join()} disabled={!room || busy}>{busy ? 'Opening microphone…' : 'Join Voice'}</button>}
    {error && <p className="error" role="alert">{error}</p>}
  </section>
}
