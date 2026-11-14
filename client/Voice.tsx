import { useEffect, useRef, useState } from 'react'
import type { Room } from 'colyseus.js'
import type { VoiceSignal } from '../shared/types'
import { api, errorText } from './backend'

export function Voice({ room, host }: { room?: Room; host: boolean }) {
  const [stream, setStream] = useState<MediaStream>()
  const [iceServers, setIceServers] = useState<RTCIceServer[]>([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [muted, setMuted] = useState(false)
  const [playbackBlocked, setPlaybackBlocked] = useState(false)
  const [speaking, setSpeaking] = useState([false, false])
  const audio = useRef<HTMLAudioElement>(null)
  const local = useRef<MediaStream | undefined>(undefined)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      local.current?.getTracks().forEach(track => track.stop())
      local.current = undefined
    }
  }, [])

  async function join() {
    setBusy(true)
    setError('')
    let opened: MediaStream | undefined
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access requires HTTPS or localhost.')
      opened = await navigator.mediaDevices.getUserMedia({ audio: true })
      const servers = await api<RTCIceServer[]>('/voice')
      if (!mounted.current) {
        opened.getTracks().forEach(track => track.stop())
        return
      }
      local.current = opened
      setIceServers(servers)
      setStream(opened)
    } catch (failure) {
      opened?.getTracks().forEach(track => track.stop())
      if (mounted.current) setError(failure instanceof DOMException && failure.name === 'NotAllowedError'
        ? 'Microphone access was denied. Enable it in your browser and try again.'
        : errorText(failure))
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  function leave() {
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
      setSpeaking([false, false])
      return
    }
    let active = true
    let peer: RTCPeerConnection | undefined
    let pending: RTCIceCandidateInit[] = []
    let work = Promise.resolve()
    let renegotiate: ReturnType<typeof setTimeout> | undefined
    let connectionTimeout: ReturnType<typeof setTimeout> | undefined
    let audioContext: AudioContext | undefined
    let remoteSource: MediaStreamAudioSourceNode | undefined
    let meters: (AnalyserNode | undefined)[] = []
    const element = audio.current
    const send = (data: VoiceSignal) => {
      if (room.connection.isOpen) room.send('voice', data)
    }
    try {
      audioContext = new AudioContext()
      meters[0] = audioContext.createAnalyser()
      audioContext.createMediaStreamSource(stream).connect(meters[0])
      void audioContext.resume().catch(() => {})
    } catch {
      // Voice playback can still work if the browser cannot provide audio meters.
    }
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

    function closePeer() {
      clearTimeout(renegotiate)
      clearTimeout(connectionTimeout)
      setPlaybackBlocked(false)
      if (peer) {
        peer.onconnectionstatechange = null
        peer.onicecandidate = null
        peer.ontrack = null
        peer.close()
      }
      peer = undefined
      pending = []
      remoteSource?.disconnect()
      remoteSource = undefined
      meters[1] = undefined
      if (element) element.srcObject = null
    }

    function createPeer() {
      const connection = new RTCPeerConnection({ iceServers })
      peer = connection
      connectionTimeout = setTimeout(() => {
        if (!active || peer !== connection || connection.connectionState === 'connected') return
        setStatus('Voice could not connect')
        setError(iceServers.some(server => [server.urls].flat().some(url => /^turns?:/i.test(url)))
          ? 'The voice connection timed out. Leave voice and join again.'
          : 'A direct voice connection could not be established. This server has no TURN relay for restricted networks.')
      }, 15000)
      stream!.getTracks().forEach(track => connection.addTrack(track, stream!))
      connection.onicecandidate = event => {
        if (event.candidate) send({ kind: 'candidate', candidate: event.candidate.toJSON() })
      }
      connection.ontrack = event => {
        const remote = event.streams[0] ?? new MediaStream([event.track])
        if (element) {
          element.srcObject = remote
          void element.play().catch(() => {
            if (active && peer === connection) setPlaybackBlocked(true)
          })
        }
        if (audioContext && audioContext.state !== 'closed') {
          remoteSource?.disconnect()
          meters[1] = audioContext.createAnalyser()
          remoteSource = audioContext.createMediaStreamSource(remote)
          remoteSource.connect(meters[1])
        }
      }
      connection.onconnectionstatechange = () => {
        clearTimeout(renegotiate)
        if (connection.connectionState === 'connected') {
          clearTimeout(connectionTimeout)
          setStatus('Voice connected')
          setError('')
        }
        if (connection.connectionState === 'disconnected' || connection.connectionState === 'failed') {
          setStatus('Reconnecting voice…')
          if (host) renegotiate = setTimeout(() => enqueue(async () => {
            if (peer !== connection || connection.signalingState !== 'stable') return
            await offer(connection, true)
          }), 2500)
        }
      }
      return connection
    }

    async function offer(connection: RTCPeerConnection, iceRestart = false) {
      await connection.setLocalDescription(await connection.createOffer({ iceRestart }))
      if (active && peer === connection && connection.localDescription) {
        send({ kind: 'description', description: connection.localDescription.toJSON() })
      }
    }

    function enqueue(action: () => Promise<void>) {
      work = work.then(async () => { if (active) await action() }).catch(() => {
        if (active) setError('Voice could not connect. Leave voice and try again.')
      })
    }

    const unsubscribe = room.onMessage<VoiceSignal>('voice', signal => enqueue(async () => {
      if (signal.kind === 'state') {
        if (!signal.joined) {
          closePeer()
          setStatus('Waiting for your partner to join voice…')
        } else if (host && !peer) {
          setStatus('Connecting voice…')
          await offer(createPeer())
        }
      } else if (signal.kind === 'description') {
        if (signal.description.type !== (host ? 'answer' : 'offer')) return
        const connection = peer ?? createPeer()
        await connection.setRemoteDescription(signal.description)
        for (const candidate of pending) await connection.addIceCandidate(candidate)
        pending = []
        if (!host) {
          await connection.setLocalDescription()
          if (active && connection.localDescription) {
            send({ kind: 'description', description: connection.localDescription.toJSON() })
          }
        }
      } else if (signal.kind === 'candidate') {
        if (peer?.remoteDescription) await peer.addIceCandidate(signal.candidate)
        else if (pending.length < 100) pending.push(signal.candidate)
      }
    }))
    setStatus('Waiting for your partner to join voice…')
    send({ kind: 'state', joined: true })
    // Request peer readiness again when we join after the initial room sync.
    room.send('sync')
    return () => {
      active = false
      unsubscribe()
      send({ kind: 'state', joined: false })
      clearInterval(timer)
      closePeer()
      if (audioContext) void audioContext.close().catch(() => {})
    }
  }, [room, stream, iceServers, host])

  return <section className="panel">
    <h2>Voice</h2>
    {stream ? <>
      <p role="status">{status}</p>
      <p className="muted">{!muted && speaking[0] ? 'You are speaking. ' : ''}{speaking[1] ? 'Your partner is speaking.' : ''}</p>
      <div className="actions">
        <button className="secondary" onClick={() => {
          stream.getAudioTracks().forEach(track => { track.enabled = muted })
          setMuted(!muted)
        }}>{muted ? 'Unmute' : 'Mute'}</button>
        <button className="secondary" onClick={leave}>Leave Voice</button>
      </div>
      {playbackBlocked && <button className="secondary" onClick={() => {
        void audio.current?.play().then(() => setPlaybackBlocked(false))
          .catch(() => setError('Audio playback is blocked by your browser. Check its site permissions.'))
      }}>Play partner audio</button>}
      <audio ref={audio} onPlaying={() => setPlaybackBlocked(false)} />
    </> : <button onClick={() => void join()} disabled={!room || busy}>{busy ? 'Opening microphone…' : 'Join Voice'}</button>}
    {error && <p className="error" role="alert">{error}</p>}
  </section>
}
