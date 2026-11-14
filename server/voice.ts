import { createHash, createHmac, randomBytes } from 'node:crypto'
import type { VoiceConfiguration, VoiceSignal } from '../shared/types'

interface VoiceSettings {
  stunUrls: string[]
  turnUrls: string[]
  turnSecret?: string
  cloudflare?: { keyId: string; apiToken: string }
  credentialTtlSeconds: number
  unavailableReason?: string
}

// TURN is a separate service. Never import this module into the browser bundle.
export function voiceSettings(env: NodeJS.ProcessEnv): VoiceSettings {
  const urls = (value: string, schemes: readonly string[], variable: string) => {
    const list = value.split(',').map(url => url.trim()).filter(Boolean)
    for (const url of list) {
      // ICE URLs have no paths, userinfo, passwords, fragments or arbitrary query parameters.
      const match = /^(stuns?|turns?):(\[[0-9a-f:]+\]|[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)(?::([0-9]{1,5}))?(?:\?transport=(udp|tcp))?$/i.exec(url)
      if (!match || !schemes.includes(match[1].toLowerCase()) ||
          (match[3] && (Number(match[3]) < 1 || Number(match[3]) > 65535)) ||
          (match[1].toLowerCase() === 'turns' && match[4]?.toLowerCase() === 'udp')) {
        throw new Error(`${variable} contains an invalid ICE URL.`)
      }
    }
    return [...new Set(list)]
  }
  const stunUrls = urls(env.STUN_URLS ?? 'stun:stun.l.google.com:19302', ['stun', 'stuns'], 'STUN_URLS')
  const turnUrls = urls(env.TURN_URLS ?? '', ['turn', 'turns'], 'TURN_URLS')
  const turnSecret = env.TURN_SECRET
  const keyId = env.CLOUDFLARE_TURN_KEY_ID?.trim()
  const apiToken = env.CLOUDFLARE_TURN_API_TOKEN?.trim()
  const cloudflare = keyId && apiToken && /^[a-zA-Z0-9_-]+$/.test(keyId) ? { keyId, apiToken } : undefined
  if (turnUrls.length && (!turnSecret || turnSecret.length < 32)) {
    throw new Error('TURN_URLS requires a server-only TURN_SECRET of at least 32 characters.')
  }
  const credentialTtlSeconds = Number(env.TURN_CREDENTIAL_TTL_SECONDS ?? 3600)
  if (!Number.isSafeInteger(credentialTtlSeconds) || credentialTtlSeconds < 120 || credentialTtlSeconds > 86400) {
    throw new Error('TURN_CREDENTIAL_TTL_SECONDS must be between 120 and 86400.')
  }
  let unavailableReason: string | undefined
  if ((keyId || apiToken) && !cloudflare) {
    unavailableReason = 'Voice relay credentials are incomplete. You can keep using text chat.'
  } else if (!cloudflare && env.NODE_ENV === 'production' && env.VOICE_ALLOW_STUN_ONLY !== 'true') {
    if (!turnUrls.some(url => /^turn:.*\?transport=udp$/i.test(url)) ||
        !turnUrls.some(url => /^turn:.*\?transport=tcp$/i.test(url)) ||
        !turnUrls.some(url => /^turns:.*:443\?transport=tcp$/i.test(url))) {
      unavailableReason = 'Voice relay is not configured with UDP, TCP, and TLS on port 443. You can keep using text chat.'
    }
  }
  return { stunUrls, turnUrls, turnSecret, cloudflare, credentialTtlSeconds, unavailableReason }
}

export async function issueCloudflareVoiceConfiguration(
  { keyId, apiToken }: NonNullable<VoiceSettings['cloudflare']>, ttl: number, request = fetch,
): Promise<VoiceConfiguration> {
  const issuedAt = Date.now()
  const response = await request(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl }),
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) throw new Error('TURN credential request failed.')
  const { iceServers } = await response.json() as { iceServers?: RTCIceServer[] }
  const turn = Array.isArray(iceServers) && iceServers.find(server =>
    typeof server?.username === 'string' && server.username &&
    typeof server.credential === 'string' && server.credential && Array.isArray(server.urls))
  const urls = ['turn:turn.cloudflare.com:3478?transport=udp', 'turn:turn.cloudflare.com:3478?transport=tcp',
    'turns:turn.cloudflare.com:443?transport=tcp']
  if (!turn || !urls.every(url => turn.urls.includes(url))) throw new Error('TURN relay transports unavailable.')
  return {
    iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }, { urls, username: turn.username, credential: turn.credential }],
    serverTime: Date.now(), expiresAt: issuedAt + ttl * 1000, relayConfigured: true,
  }
}

export function issueVoiceConfiguration(settings: VoiceSettings, uid: string, now = Date.now()): VoiceConfiguration {
  const iceServers: RTCIceServer[] = settings.stunUrls.length ? [{ urls: settings.stunUrls }] : []
  let expiresAt: number | null = null
  if (settings.turnSecret && settings.turnUrls.length) {
    const expires = Math.floor(now / 1000) + settings.credentialTtlSeconds
    // Unique opaque identities avoid exposing Firebase UIDs to the relay operator.
    const identity = createHash('sha256').update(uid).digest('hex').slice(0, 24)
    const username = `${expires}:${identity}:${randomBytes(8).toString('hex')}`
    const credential = createHmac('sha1', settings.turnSecret).update(username).digest('base64')
    iceServers.push({ urls: settings.turnUrls, username, credential })
    expiresAt = expires * 1000
  }
  return { iceServers, serverTime: now, expiresAt, relayConfigured: expiresAt !== null }
}

/** Only bounded, expected signaling fields are ever forwarded to the other player. */
export function parseVoiceSignal(input: unknown): VoiceSignal | undefined {
  if (!input || typeof input !== 'object') return
  const signal = input as Record<string, unknown>
  if (signal.kind === 'state' && typeof signal.joined === 'boolean') return { kind: 'state', joined: signal.joined }
  if (signal.kind === 'restart') return { kind: 'restart', ...(signal.manual === true ? { manual: true } : {}) }
  if (typeof signal.negotiationId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(signal.negotiationId)) return
  const negotiationId = signal.negotiationId
  if (signal.kind === 'description') {
    const value = signal.description as Record<string, unknown> | undefined
    if (value && (value.type === 'offer' || value.type === 'answer') &&
        typeof value.sdp === 'string' && value.sdp.length > 0 && value.sdp.length <= 16000) {
      return { kind: 'description', negotiationId, description: { type: value.type, sdp: value.sdp } }
    }
  }
  if (signal.kind === 'candidate') {
    const value = signal.candidate as Record<string, unknown> | undefined
    if (value && typeof value.candidate === 'string' && value.candidate.length <= 2048 &&
        (value.sdpMid == null || (typeof value.sdpMid === 'string' && value.sdpMid.length <= 64)) &&
        (value.sdpMLineIndex == null || (Number.isInteger(value.sdpMLineIndex) &&
          Number(value.sdpMLineIndex) >= 0 && Number(value.sdpMLineIndex) <= 65535)) &&
        (value.usernameFragment == null || (typeof value.usernameFragment === 'string' && value.usernameFragment.length <= 256))) {
      return { kind: 'candidate', negotiationId, candidate: {
        candidate: value.candidate,
        sdpMid: value.sdpMid as string | null | undefined,
        sdpMLineIndex: value.sdpMLineIndex as number | null | undefined,
        usernameFragment: value.usernameFragment as string | null | undefined,
      } }
    }
  }
}
