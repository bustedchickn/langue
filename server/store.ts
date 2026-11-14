import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { createHash } from 'node:crypto'
import { communicationLevels, languages, type Language, type LanguageAssessment, type ProfileFields, type UserProfile } from '../shared/types'

export const projectId = process.env.FIREBASE_PROJECT_ID || 'demo-idle'
initializeApp({ projectId })
export const db = getFirestore()

export class RequestError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export async function verify(token: unknown) {
  if (typeof token !== 'string') throw new RequestError(401, 'Sign in to continue.')
  try {
    return (await getAuth().verifyIdToken(token, true)).uid
  } catch {
    throw new RequestError(401, 'Your sign-in expired. Sign in again.')
  }
}

export const profileRef = (uid: string) => db.collection('profiles').doc(uid)

export async function getProfile(uid: string) {
  return (await profileRef(uid).get()).data() as UserProfile | undefined
}

export async function requireProfile(uid: string) {
  const profile = await getProfile(uid)
  if (!profile) throw new RequestError(409, 'Create your profile first.')
  return profile
}

export function usernameKey(value: unknown) {
  const name = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!/^[a-z0-9_]{3,24}$/.test(name)) {
    throw new RequestError(400, 'Use 3–24 letters, numbers, or underscores for your username.')
  }
  return name
}

export async function saveProfile(uid: string, input: Partial<ProfileFields>) {
  const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : ''
  const { fluentLanguage, learningLanguage } = input
  if (!displayName || displayName.length > 40 || !fluentLanguage || !learningLanguage ||
      !languages.includes(fluentLanguage) || !languages.includes(learningLanguage)) {
    throw new RequestError(400, 'Enter a display name of up to 40 characters and select both languages.')
  }
  return db.runTransaction(async tx => {
    const ref = profileRef(uid)
    const existing = (await tx.get(ref)).data() as UserProfile | undefined
    const username = existing?.username ?? usernameKey(input.username)
    if (!existing) {
      const claim = db.collection('usernames').doc(username)
      if ((await tx.get(claim)).exists) throw new RequestError(409, 'That username is already taken.')
      tx.create(claim, { uid })
    }
    const now = Date.now()
    const profile: UserProfile = {
      uid, username, displayName, fluentLanguage, learningLanguage,
      ...(existing?.assessments ? { assessments: existing.assessments } : {}),
      createdAt: existing?.createdAt ?? now, lastSeenAt: now,
    }
    tx.set(ref, profile)
    return profile
  })
}

export async function saveAssessment(uid: string, language: string, input: unknown) {
  if (!languages.includes(language as Language) || !input || typeof input !== 'object') {
    throw new RequestError(400, 'Choose a valid language and assessment.')
  }
  const { level, fluent } = input as LanguageAssessment
  if (!communicationLevels.includes(level) || typeof fluent !== 'boolean') {
    throw new RequestError(400, 'Choose a valid communication level.')
  }
  return db.runTransaction(async tx => {
    const ref = profileRef(uid)
    const profile = (await tx.get(ref)).data() as UserProfile | undefined
    if (!profile) throw new RequestError(409, 'Create your profile first.')
    const assessments = { ...profile.assessments, [language]: { level, fluent } }
    tx.update(ref, { assessments })
    return { ...profile, assessments }
  })
}

export function friendshipRef(first: string, second: string) {
  const members = [first, second].sort()
  const id = createHash('sha256').update(JSON.stringify(members)).digest('hex')
  return { ref: db.collection('friendships').doc(id), members }
}

export function publicProfile(profile: UserProfile) {
  const { uid, username, displayName, fluentLanguage, learningLanguage } = profile
  return { uid, username, displayName, fluentLanguage, learningLanguage }
}
