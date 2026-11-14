import express from 'express'
import cors from 'cors'
import { createServer } from 'node:http'
import { createHmac } from 'node:crypto'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { Server, matchMaker } from '@colyseus/core'
import { WebSocketTransport } from '@colyseus/ws-transport'
import type { Friendship, Invitation } from '../shared/types'
import { DuoRoom, rooms } from './room'
import { searchStatus, startSearch, stopSearch } from './matchmaking'
import { activity } from './participation'
import {
  db, friendshipRef, getProfile, profileRef, publicProfile,
  RequestError, requireProfile, saveProfile, usernameKey, verify,
} from './store'

const app = express()
app.disable('x-powered-by')
if (process.env.CLIENT_ORIGIN) app.use(cors({ origin: process.env.CLIENT_ORIGIN.split(',') }))
app.use(express.json({ limit: '4kb' }))

const api = express.Router()
app.use('/api', api)
api.use(async (req, res, next) => {
  try {
    res.locals.uid = await verify(req.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1])
    next()
  } catch (error) { next(error) }
})

api.get('/profile', async (_, res) => {
  const profile = await getProfile(res.locals.uid)
  if (profile) {
    profile.lastSeenAt = Date.now()
    await profileRef(profile.uid).update({ lastSeenAt: profile.lastSeenAt })
  }
  res.json(profile ?? null)
})
api.put('/profile', async (req, res) => res.json(await saveProfile(res.locals.uid, req.body ?? {})))
api.post('/matchmaking', async (_, res) => {
  res.set('Cache-Control', 'no-store').json(startSearch(await requireProfile(res.locals.uid)))
})
api.get('/matchmaking', (_, res) => {
  res.set('Cache-Control', 'no-store').json(searchStatus(res.locals.uid))
})
api.delete('/matchmaking', (_, res) => {
  stopSearch(res.locals.uid)
  res.json({ ok: true })
})
api.get('/search', async (req, res) => {
  const match = await db.collection('usernames').doc(usernameKey(req.query.username)).get()
  const profile = match.exists ? await getProfile(match.data()!.uid) : undefined
  res.json(profile ? publicProfile(profile) : null)
})
api.get('/people/:uid', async (req, res) => {
  const uid: string = res.locals.uid
  const other = req.params.uid
  const { ref } = friendshipRef(uid, other)
  if (!other || other.includes('/') || !(await ref.get()).exists) {
    throw new RequestError(404, 'Player not found.')
  }
  res.json(publicProfile(await requireProfile(other)))
})

api.post('/friends', async (req, res) => {
  const uid: string = res.locals.uid
  const target = req.body?.uid
  if (typeof target !== 'string' || !target || target.includes('/') || target.length > 128 || target === uid) {
    throw new RequestError(400, 'Choose another player.')
  }
  const { ref, members } = friendshipRef(uid, target)
  await db.runTransaction(async tx => {
    const [existing, first, second] = await tx.getAll(ref, profileRef(uid), profileRef(target))
    if (!first.exists || !second.exists) throw new RequestError(404, 'Player not found.')
    if (existing.exists) throw new RequestError(409, 'A friendship or request already exists.')
    tx.create(ref, { members, from: uid, to: target, status: 'pending' })
  })
  res.json({ ok: true })
})

api.patch('/friends/:id', async (req, res) => {
  const uid: string = res.locals.uid
  const action = req.body?.action
  const id = req.params.id
  if (!/^[a-f0-9]{64}$/.test(id)) throw new RequestError(404, 'Friendship not found.')
  const ref = db.collection('friendships').doc(id)
  await db.runTransaction(async tx => {
    const friend = (await tx.get(ref)).data() as Friendship | undefined
    if (!friend?.members.includes(uid)) throw new RequestError(404, 'Friendship not found.')
    if (friend.status === 'pending' && friend.to === uid && action === 'accept') {
      tx.update(ref, { status: 'accepted' })
    } else if ((friend.status === 'pending' && friend.to === uid && action === 'decline') ||
        (friend.status === 'accepted' && action === 'remove')) {
      tx.delete(ref)
    } else {
      throw new RequestError(403, 'You cannot take that action on this request.')
    }
  })
  res.json({ ok: true })
})

const inviteSeconds = Number(process.env.INVITE_SECONDS ?? 300)
if (!Number.isSafeInteger(inviteSeconds) || inviteSeconds < 1 || inviteSeconds > 86400) {
  throw new Error('INVITE_SECONDS must be between 1 and 86400.')
}

api.post('/invites', async (req, res) => {
  const uid: string = res.locals.uid
  const { to, roomId } = req.body ?? {}
  if (typeof to !== 'string' || !to || to === uid || typeof roomId !== 'string' || !rooms.get(roomId)?.canInvite(uid)) {
    throw new RequestError(409, 'Create an open room before inviting a friend.')
  }
  const { ref } = friendshipRef(uid, to)
  const invite = db.collection('invitations').doc()
  await db.runTransaction(async tx => {
    if ((await tx.get(ref)).data()?.status !== 'accepted') throw new RequestError(403, 'You can only invite friends.')
    if (!rooms.get(roomId)?.canInvite(uid)) throw new RequestError(409, 'This room is no longer available.')
    tx.create(db.collection('inviteRooms').doc(invite.id), { roomId })
    tx.create(invite, { from: uid, to, expiresAt: Date.now() + inviteSeconds * 1000, status: 'pending' })
  })
  res.json({ id: invite.id })
})

api.post('/invites/:id/join', async (req, res) => {
  if (activity(res.locals.uid)) throw new RequestError(409, 'Leave your current room or cancel Quick Play first.')
  const { id } = req.params
  if (!/^[a-zA-Z0-9]{20}$/.test(id)) throw new RequestError(404, 'Invitation not found.')
  const [record, destination] = await db.getAll(
    db.collection('invitations').doc(id), db.collection('inviteRooms').doc(id),
  )
  const invite = record.data() as Invitation | undefined
  const roomId: string | undefined = destination.data()?.roomId
  if (!invite || invite.to !== res.locals.uid || invite.status !== 'pending' || invite.expiresAt <= Date.now() ||
      !roomId || !rooms.get(roomId)?.canInvite(invite.from)) {
    throw new RequestError(409, 'This invitation is unavailable or expired.')
  }
  const token = req.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1]
  try {
    const seat = await matchMaker.joinById(roomId, { invitation: id },
      { token, headers: req.headers, ip: req.ip ?? '' })
    res.json(seat)
  } catch {
    throw new RequestError(409, 'This room is no longer available.')
  }
})
api.post('/invites/:id/decline', async (req, res) => {
  if (!/^[a-zA-Z0-9]{20}$/.test(req.params.id)) throw new RequestError(404, 'Invitation not found.')
  const ref = db.collection('invitations').doc(req.params.id)
  await db.runTransaction(async tx => {
    const invite = (await tx.get(ref)).data() as Invitation | undefined
    if (!invite || invite.to !== res.locals.uid || invite.status !== 'pending' || invite.expiresAt <= Date.now()) {
      throw new RequestError(404, 'Invitation unavailable.')
    }
    tx.update(ref, { status: 'declined' })
  })
  res.json({ ok: true })
})

const stunUrls = (process.env.STUN_URLS ?? 'stun:stun.l.google.com:19302').split(',').filter(Boolean)
const turnUrls = (process.env.TURN_URLS ?? '').split(',').filter(Boolean)
const turnSecret = process.env.TURN_SECRET
if (turnUrls.length && !turnSecret) throw new Error('TURN_URLS requires TURN_SECRET.')

api.get('/voice', (_, res) => {
  const iceServers: RTCIceServer[] = stunUrls.length ? [{ urls: stunUrls }] : []
  if (turnSecret && turnUrls.length) {
    const username = Math.floor(Date.now() / 1000 + 3600) + ':' + res.locals.uid
    const credential = createHmac('sha1', turnSecret).update(username).digest('base64')
    iceServers.push({ urls: turnUrls, username, credential })
  }
  res.set('Cache-Control', 'no-store').json(iceServers)
})

api.use((_req, _res, next) => next(new RequestError(404, 'Endpoint not found.')))
const dist = resolve(process.env.CLIENT_DIST_DIR ?? 'dist')
if (existsSync(dist)) app.use(express.static(dist))
app.use(((error, _req, res, _next) => {
  if (error instanceof RequestError) {
    res.status(error.status).json({ error: error.message })
  } else if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: 'Invalid JSON.' })
  } else if (error instanceof Error && 'status' in error && error.status === 413) {
    res.status(413).json({ error: 'Request is too large.' })
  } else {
    console.error(error)
    res.status(500).json({ error: 'Something went wrong. Try again.' })
  }
}) satisfies express.ErrorRequestHandler)

const server = new Server({
  transport: new WebSocketTransport({ server: createServer(app), maxPayload: 24000 }),
  greet: false,
})
server.define('duo', DuoRoom)
const port = Number(process.env.PORT ?? 2567)
await server.listen(port, process.env.HOST ?? '0.0.0.0')
console.log('IDLE server listening on port ' + port)
