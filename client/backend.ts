import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { Client } from 'colyseus.js'

const env = import.meta.env
const emulator = env.VITE_USE_EMULATORS === 'true' || (env.DEV && env.VITE_USE_EMULATORS !== 'false' && !env.VITE_FIREBASE_API_KEY)
export const devGuest = env.DEV && emulator && env.VITE_QUICK_GUEST === 'true'
const firebase = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY || (emulator ? 'demo-key' : undefined),
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID || (emulator ? 'demo-idle' : undefined),
  appId: env.VITE_FIREBASE_APP_ID,
})

export const auth = getAuth(firebase)
export const db = getFirestore(firebase)
if (emulator) {
  connectAuthEmulator(auth, 'http://' + location.hostname + ':9099')
  connectFirestoreEmulator(db, location.hostname, 8080)
}

const endpoint = env.VITE_GAME_SERVER || (env.DEV ? location.protocol + '//' + location.hostname + ':2567' : location.origin)
export const multiplayer = new Client(endpoint, {
  urlBuilder: url => {
    // The matchmaker already verified the header and bound this seat to the profile.
    url.searchParams.delete('_authToken')
    return url.href
  },
})

export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken()
  const response = await fetch('/api' + path, {
    method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'The request failed.')
  return data
}

export function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Try again.'
}
