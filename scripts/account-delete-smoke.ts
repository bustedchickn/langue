import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { getAuth } from 'firebase-admin/auth'
import { db, deletePlayerAccount, friendshipRef, profileRef, saveProfile } from '../server/store'

const browser = await chromium.launch({ executablePath: process.env.IDLE_CHROMIUM_PATH })
const page = await browser.newPage()
const suffix = Date.now().toString(36)
const peerUid = 'delete-smoke-peer-' + suffix
const peerUsername = 'delete_peer_' + suffix
let uid: string | undefined
let username: string | undefined
const match = db.collection('scoredMatches').doc('delete-smoke-' + suffix)
const sentInvite = db.collection('invitations').doc()
const receivedInvite = db.collection('invitations').doc()

try {
  await page.goto(process.env.IDLE_BROWSER_URL ?? 'http://localhost:5173')
  await page.getByRole('button', { name: 'Quick test guest' }).click()
  await page.getByRole('button', { name: 'Open profile and settings' }).waitFor()
  uid = await page.evaluate(async () => (await import('/client/backend.ts')).auth.currentUser?.uid)
  assert.ok(uid)
  const profile = (await profileRef(uid).get()).data()
  username = profile?.username
  assert.ok(username)

  await saveProfile(peerUid, { username: peerUsername, displayName: 'Other player', fluentLanguage: 'English', learningLanguage: 'French' })
  const friendship = friendshipRef(uid, peerUid).ref
  await friendship.set({ members: [uid, peerUid].sort(), from: uid, to: peerUid, status: 'accepted' })
  await sentInvite.set({ from: uid, to: peerUid, expiresAt: Date.now() + 60000, status: 'pending' })
  await receivedInvite.set({ from: peerUid, to: uid, expiresAt: Date.now() + 60000, status: 'pending' })
  await db.collection('inviteRooms').doc(sentInvite.id).set({ roomId: 'test' })
  await db.collection('inviteRooms').doc(receivedInvite.id).set({ roomId: 'test' })
  await match.set({ gameId: 'tandem-drive', score: 1, players: [uid, peerUid], recordedAt: Date.now() })
  await profileRef(uid).update({ scores: { total: 42, gamesPlayed: 1, games: {} } })
  const vocabulary = db.collection('vocabularySets').doc('delete-smoke-' + suffix)
  await vocabulary.set({ id: vocabulary.id, ownerUid: uid, name: 'Private words', words: [], createdAt: Date.now() })
  await db.collection('vocabularyHubs').doc(uid).set({ ownerUid: uid, initializedAt: Date.now() })

  const unconfirmedStatus = await page.evaluate(async () => {
    const { auth } = await import('/client/backend.ts')
    const token = await auth.currentUser!.getIdToken()
    const response = await fetch('/api/profile', { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } })
    return response.status
  })
  assert.equal(unconfirmedStatus, 400)

  await page.getByRole('button', { name: 'Open profile and settings' }).click()
  await page.getByRole('button', { name: 'Delete account', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Delete your account?' })
  await dialog.waitFor()
  assert.match(await dialog.innerText(), /permanently deleted/)
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await page.getByRole('heading', { name: 'Your profile' }).waitFor()
  assert.ok((await profileRef(uid).get()).exists)
  await getAuth().getUser(uid)

  await page.getByRole('button', { name: 'Delete account', exact: true }).click()
  await dialog.getByRole('button', { name: 'Yes, delete my account' }).click()
  await page.getByRole('heading', { name: 'Sign in' }).waitFor()
  assert.equal((await profileRef(uid).get()).exists, false)
  assert.equal((await vocabulary.get()).exists, false)
  assert.equal((await db.collection('vocabularyHubs').doc(uid).get()).exists, false)
  assert.equal((await db.collection('usernames').doc(username).get()).exists, false)
  assert.equal((await friendship.get()).exists, false)
  for (const invite of [sentInvite, receivedInvite]) {
    assert.equal((await invite.get()).exists, false)
    assert.equal((await db.collection('inviteRooms').doc(invite.id).get()).exists, false)
  }
  assert.deepEqual((await match.get()).data()?.players, [peerUid])
  assert.ok((await profileRef(peerUid).get()).exists)
  await assert.rejects(getAuth().getUser(uid), error => (error as { code?: string }).code === 'auth/user-not-found')
  console.log('Account deletion emulator check passed.')
} finally {
  await browser.close()
  if (uid) await deletePlayerAccount(uid).catch(() => {})
  await profileRef(peerUid).delete()
  await db.collection('usernames').doc(peerUsername).delete()
  await match.delete()
  await sentInvite.delete()
  await receivedInvite.delete()
  await db.collection('inviteRooms').doc(sentInvite.id).delete()
  await db.collection('inviteRooms').doc(receivedInvite.id).delete()
}
