import { pieceName } from '../shared/minigames/lost-instructions.ts'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { Client } = require('colyseus.js')
const { initializeApp, deleteApp } = require('firebase/app')
const { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } = require('firebase/auth')
const { collection, connectFirestoreEmulator, doc, getDoc, getFirestore, onSnapshot, query, setDoc, where } = require('firebase/firestore')

const endpoint = process.env.IDLE_TEST_SERVER ?? 'http://127.0.0.1:2567'
const suffix = randomBytes(4).toString('hex')
const apps = []
const rooms = []
const unsubscribes = []
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

function observe(start, select, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const clock = setTimeout(() => {
      stop()
      reject(new Error('Timed out waiting for an update.'))
    }, timeout)
    function finish(value, error) {
      clearTimeout(clock)
      stop()
      if (error) reject(error)
      else resolve(value)
    }
    const stop = start(value => {
      const found = select(value)
      if (found) finish(found)
    }, error => finish(undefined, error))
    unsubscribes.push(stop)
  })
}

const message = (room, type, select = value => value, timeout) =>
  observe(next => room.onMessage(type, next), select, timeout)
const documents = (request, select) =>
  observe((next, fail) => onSnapshot(request, next, fail), snap => snap.docs.find(select))

async function bothReady(host, guest, phase, next) {
  const waiting = message(guest, 'session', value => value.phase === phase && value.ready?.host && value)
  host.send('ready', phase)
  assert.equal((await waiting).ready.guest, false)
  const advanced = [host, guest].map(room => message(room, 'session', value => value.phase === next && value))
  guest.send('ready', phase)
  return Promise.all(advanced)
}

async function player(name) {
  const app = initializeApp({ apiKey: 'demo-key', projectId: 'demo-idle' }, name + suffix)
  apps.push(app)
  const auth = getAuth(app)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  const firestore = getFirestore(app)
  connectFirestoreEmulator(firestore, '127.0.0.1', 8080)
  const { user } = await createUserWithEmailAndPassword(auth, name + suffix + '@example.test', 'pass12345')
  const client = new Client(endpoint)
  client.auth.token = await user.getIdToken()
  const request = async (path, method = 'GET', data) => {
    const response = await fetch(endpoint + '/api' + path, {
      method,
      headers: { Authorization: 'Bearer ' + client.auth.token, 'Content-Type': 'application/json' },
      body: data && JSON.stringify(data),
    })
    return { status: response.status, data: await response.json(), headers: response.headers }
  }
  const profile = {
    username: name + suffix, displayName: name,
    fluentLanguage: 'English', learningLanguage: name === 'alice' ? 'French' : 'Spanish',
  }
  assert.equal((await request('/profile', 'PUT', profile)).status, 200)
  return { uid: user.uid, client, request, firestore, profile }
}

try {
  const [alice, bob, carol] = await Promise.all(['alice', 'bob', 'carol'].map(player))
  const unauthenticatedVoice = await fetch(endpoint + '/api/voice?roomId=unknown')
  assert.equal(unauthenticatedVoice.status, 401)
  assert.equal(unauthenticatedVoice.headers.get('cache-control'), 'no-store')
  assert.equal((await alice.request('/voice')).status, 403)
  const search = await alice.request('/search?username=' + bob.profile.username.toUpperCase())
  assert.equal(search.data.uid, bob.uid)
  assert.equal(search.data.email, undefined)
  await assert.rejects(getDoc(doc(carol.firestore, 'profiles', alice.uid)))
  await assert.rejects(setDoc(doc(carol.firestore, 'usernames', alice.profile.username), { uid: carol.uid }))

  assert.equal((await alice.request('/friends', 'POST', { uid: alice.uid })).status, 400)
  assert.equal((await alice.request('/friends', 'POST', { uid: bob.uid })).status, 200)
  assert.equal((await bob.request('/friends', 'POST', { uid: alice.uid })).status, 409)
  const friends = query(collection(bob.firestore, 'friendships'), where('members', 'array-contains', bob.uid))
  const request = await documents(friends, doc => doc.data().status === 'pending')
  const path = '/friends/' + request.id
  await assert.rejects(setDoc(doc(alice.firestore, 'friendships', request.id), { status: 'accepted' }))
  assert.equal((await alice.request(path, 'PATCH', { action: 'accept' })).status, 403)
  assert.equal((await bob.request(path, 'PATCH', { action: 'accept' })).status, 200)
  await documents(friends, doc => doc.data().status === 'accepted')
  assert.notEqual(alice.profile.learningLanguage, bob.profile.learningLanguage)
  assert.notEqual(alice.profile.fluentLanguage, bob.profile.learningLanguage)

  const host = await alice.client.create('duo', { gameId: 'icon-communication' })
  rooms.push(host)
  const voicePath = '/voice?roomId=' + encodeURIComponent(host.roomId)
  assert.equal((await bob.request(voicePath)).status, 403)
  assert.equal((await carol.request(voicePath)).status, 403)
  const voiceConfiguration = await alice.request(voicePath)
  assert.equal(voiceConfiguration.status, 200)
  assert.equal(voiceConfiguration.headers.get('cache-control'), 'no-store')
  assert.ok(Array.isArray(voiceConfiguration.data.iceServers))
  assert.equal(typeof voiceConfiguration.data.serverTime, 'number')
  assert.equal(typeof voiceConfiguration.data.relayConfigured, 'boolean')
  if (voiceConfiguration.data.relayConfigured) {
    assert.ok(voiceConfiguration.data.expiresAt > voiceConfiguration.data.serverTime)
    const relay = voiceConfiguration.data.iceServers.find(server => server.credential)
    assert.ok(relay && typeof relay.username === 'string' && typeof relay.credential === 'string')
    assert.ok(Number(relay.username.split(':')[0]) * 1000 >= voiceConfiguration.data.expiresAt - 1000)
  } else {
    assert.equal(voiceConfiguration.data.expiresAt, null)
  }
  const lobby = message(host, 'session')
  host.send('phase', 'game')
  host.send('sync')
  const initialLobby = await lobby
  assert.equal(initialLobby.phase, 'lobby')
  assert.equal(initialLobby.gameId, 'icon-communication')
  const created = await alice.request('/invites', 'POST', { to: bob.uid, roomId: host.roomId })
  assert.equal(created.status, 200)
  const invites = query(collection(bob.firestore, 'invitations'), where('to', '==', bob.uid))
  const invite = await documents(invites, doc => doc.id === created.data.id)
  assert.equal(invite.data().status, 'pending')
  assert.equal(invite.data().roomId, undefined)
  const join = '/invites/' + invite.id + '/join'
  assert.equal((await carol.request(join, 'POST')).status, 409)
  await assert.rejects(carol.client.joinById(host.roomId))
  await assert.rejects(setDoc(doc(bob.firestore, 'invitations', invite.id), { status: 'accepted' }))
  const seat = await bob.request(join, 'POST')
  assert.equal(seat.status, 200)
  const guest = await bob.client.consumeSeatReservation(seat.data)
  rooms.push(guest)
  const invitedLobby = message(guest, 'session')
  guest.send('sync')
  assert.equal((await invitedLobby).gameId, 'icon-communication')
  assert.equal((await invitedLobby).phase, 'confirmation')
  const changedGame = message(guest, 'session', state => state.gameId === 'lost-instructions' && state)
  host.send('phase', { gameId: 'lost-instructions' })
  await changedGame
  await assert.rejects(carol.client.joinById(host.roomId))
  assert.equal((await bob.request(join, 'POST')).status, 409)

  const chat = message(guest, 'session', state => state.chat[0])
  host.send('chat', 'Bonjour!')
  assert.equal((await chat).text, 'Bonjour!')

  const premature = message(host, 'session')
  host.send('phase', 'game')
  host.send('ready', 'introduction')
  host.send('sync')
  assert.equal((await premature).phase, 'confirmation')
  await bothReady(host, guest, 'confirmation', 'introduction')

  const voice = message(guest, 'voice', signal => signal.kind === 'state' && signal.joined)
  host.send('voice', { kind: 'state', joined: true })
  await voice
  const ready = message(host, 'voice', signal => signal.kind === 'state' && signal.joined)
  guest.send('voice', { kind: 'state', joined: true })
  await ready
  const negotiationId = 'smoke_' + suffix
  const description = { type: 'offer', sdp: 'v=0\r\n' }
  const offered = message(guest, 'voice', signal => signal.kind === 'description' && signal)
  host.send('voice', { kind: 'description', negotiationId, description })
  assert.deepEqual(await offered, { kind: 'description', negotiationId, description })
  const candidate = { candidate: 'candidate:1 1 udp 1 127.0.0.1 50000 typ host', sdpMid: '0', sdpMLineIndex: 0, usernameFragment: 'smokefrag' }
  const ice = message(guest, 'voice', signal => signal.kind === 'candidate' && signal)
  host.send('voice', { kind: 'candidate', negotiationId, candidate })
  assert.deepEqual(await ice, { kind: 'candidate', negotiationId, candidate })
  const restarted = message(host, 'voice', signal => signal.kind === 'restart' && signal)
  guest.send('voice', { kind: 'restart' })
  assert.deepEqual(await restarted, { kind: 'restart' })
  const invalidSignals = []
  const stopInvalid = host.onMessage('voice', signal => {
    if (signal.kind === 'description' || signal.kind === 'candidate') invalidSignals.push(signal)
  })
  guest.send('voice', { kind: 'description', negotiationId, description })
  guest.send('voice', { kind: 'candidate', candidate })
  guest.send('voice', { kind: 'candidate', negotiationId, candidate: { ...candidate, sdpMLineIndex: -1 } })
  guest.send('voice', { kind: 'candidate', negotiationId: 'obsolete_' + suffix, candidate })
  guest.send('voice', { kind: 'description', negotiationId: 'obsolete_' + suffix, description: { type: 'answer', sdp: 'v=0\r\n' } })
  const checked = message(guest, 'session')
  guest.send('sync')
  await checked
  assert.deepEqual(invalidSignals, [])
  stopInvalid()
  const hostViews = []
  const guestViews = []
  const guestOtherMessages = []
  unsubscribes.push(guest.onMessage('*', (type, value) => guestOtherMessages.push({ type, value })))
  unsubscribes.push(host.onMessage('game-view', value => hostViews.push(value)))
  unsubscribes.push(guest.onMessage('game-view', value => guestViews.push(value)))
  const countdown = message(host, 'session', state => state.progress)
  await bothReady(host, guest, 'introduction', 'game')
  const match = await countdown
  assert.equal(match.startsAt - match.serverNow <= 3000, true)
  assert.equal(match.endsAt - match.startsAt, 90000)
  const [initialViews, firstView] = await Promise.all([
    message(host, 'game-view', event => event.data.instruction && event),
    message(guest, 'game-view', event => event.data.slots && event),
  ])
  assert.equal(firstView.data.role, 'operator')
  assert.equal(initialViews.data.role, 'instructor')

  const send = (player, view, action) => player.send('game-action', {
    matchId: view.matchId,
    action: { round: view.round, revision: view.data.revision, ...action },
  })
  const stale = { type: 'move', piece: firstView.data.slots[1].id, slot: 0 }
  send(host, firstView, stale)
  send(guest, firstView, { ...stale, slot: 99 })
  const incorrect = message(guest, 'game-view', value => value.data.feedback === 'incorrect' && value)
  send(guest, firstView, { type: 'submit' })
  const failed = await incorrect
  assert.equal(failed.data.revision, 1)
  assert.deepEqual(failed.data.slots, firstView.data.slots)

  const playingChat = message(host, 'session', state => state.chat.find(entry => entry.text === 'Pendant le jeu'))
  guest.send('chat', 'Pendant le jeu')
  await playingChat

  const dropped = message(host, 'session', state => state.guest && !state.guest.connected && state)
  const token = guest.reconnectionToken
  await guest.leave(false)
  await dropped
  await assert.rejects(carol.client.joinById(host.roomId))
  const restored = message(host, 'session', state => state.guest?.connected && state)
  const rejoined = await bob.client.reconnect(token)
  rooms.push(rejoined)
  assert.equal((await restored).progress.matchId, match.matchId)
  unsubscribes.push(rejoined.onMessage('game-view', value => guestViews.push(value)))
  unsubscribes.push(rejoined.onMessage('*', (type, value) => guestOtherMessages.push({ type, value })))
  const syncedView = message(rejoined, 'game-view')
  rejoined.send('sync')
  assert.deepEqual(await syncedView, failed)

  let board = failed
  for (let round = 1; round <= match.rounds; round++) {
    const clue = hostViews.findLast(value => value.round === round && value.data.instruction) ??
      await message(host, 'game-view', value => value.round === round && value.data.instruction && value)
    assert.equal(clue.data.role, 'instructor')
    assert.equal(clue.data.language, 'French')
    const solution = [...board.data.slots].sort((a, b) => clue.data.instruction.indexOf(pieceName(a, 'French')) -
      clue.data.instruction.indexOf(pieceName(b, 'French')))
    assert.ok(solution.every(piece => clue.data.instruction.includes(pieceName(piece, 'French'))))
    for (const [slot, { id: piece }] of solution.entries()) {
      if (board.data.slots[slot].id === piece) continue
      const moved = message(rejoined, 'game-view', value => value.data.revision > board.data.revision && value)
      send(rejoined, board, { type: 'move', piece, slot })
      send(rejoined, board, { type: 'move', piece, slot })
      board = await moved
    }
    const previous = board
    const hostProgress = message(host, 'session', state => (state.results?.completed === round || state.progress?.completed === round) && state)
    const guestProgress = message(rejoined, 'session', state => (state.results?.completed === round || state.progress?.completed === round) && state)
    const next = round < match.rounds
      ? message(rejoined, 'game-view', value => value.round === round + 1 && value) : undefined
    send(rejoined, previous, { type: 'submit' })
    const [first, second] = await Promise.all([hostProgress, guestProgress])
    if (next) {
      board = await next
      assert.equal(board.data.revision, previous.data.revision + 1)
      assert.equal(first.progress.score, second.progress.score)
    } else {
      assert.deepEqual(first.results, second.results)
      assert.equal(first.results.outcome, 'victory')
      assert.equal(first.results.score, 300)
    }
  }
  for (const { data } of guestViews) {
    assert.equal(data.role, 'operator')
    assert.ok(Object.keys(data).every(key => ['role', 'revision', 'feedback', 'slots'].includes(key)))
    assert.ok(data.slots?.every(piece => Object.keys(piece).sort().join(',') === 'color,id,shape') ?? true)
  }
  assert.ok(!guestOtherMessages.some(({ type, value }) =>
    type === 'instruction' || /"(instruction|instructions|solution|hint|puzzleId)":/.test(JSON.stringify(value) ?? '')))

  const nextGame = message(host, 'session', state => state.phase === 'results' && state.gameId === 'icon-communication' && state)
  rejoined.send('phase', { gameId: 'icon-communication' })
  await nextGame
  const swappedHostView = message(host, 'game-view', value => value.gameId === 'icon-communication' && value)
  const swappedGuestView = message(rejoined, 'game-view', value => value.gameId === 'icon-communication' && value)
  const replayed = message(host, 'session', state => state.progress && state.progress.matchId !== match.matchId && state)
  await bothReady(host, rejoined, 'results', 'game')
  const replayState = await replayed
  assert.equal(replayState.rolesSwapped, true)
  assert.equal(replayState.gameId, 'icon-communication')
  assert.equal((await swappedHostView).data.role, 'describer')
  assert.equal((await swappedGuestView).data.role, 'selector')
  const replay = replayState.progress
  assert.equal(replay.round, 1)
  assert.equal(replay.score, 0)
  assert.equal(replay.completed, 0)
  assert.equal(rejoined.roomId, host.roomId)

  if (process.env.IDLE_TEST_TIMEOUT === 'true' && replay.gameId === 'lost-instructions') {
    const defeat = room => observe(next => room.onMessage('session', next),
      state => state.results?.outcome === 'defeat' && state.results, 100000)
    const [hostResult, guestResult] = await Promise.all([defeat(host), defeat(rejoined)])
    assert.deepEqual(hostResult, guestResult)
    assert.equal(hostResult.elapsedMs, replay.endsAt - replay.startsAt)
    assert.equal(hostResult.completed, 0)
    assert.equal(hostResult.attempted, 1)
    console.log('Passed: the live server timed out the replay and published matching defeat results.')
  }
  const ended = message(host, 'ended')
  await rejoined.leave()
  assert.match(await ended, /left/)
  const queue = '/matchmaking'
  assert.equal((await alice.request(path, 'PATCH', { action: 'remove' })).status, 200)
  async function findSeat(player) {
    const deadline = Date.now() + 12000
    while (Date.now() < deadline) {
      const { data } = await player.request(queue)
      if (data.status === 'matched') return data.seat
      await pause(250)
    }
    throw new Error('No matchmaking seat received.')
  }
  assert.equal((await alice.request(queue, 'POST')).status, 200)
  assert.equal((await alice.request(queue, 'POST')).status, 200)
  assert.equal((await bob.request(queue, 'POST')).status, 200)
  assert.equal((await bob.request(queue)).data.status, 'searching')
  assert.equal((await bob.request(queue, 'DELETE')).status, 200)
  assert.equal((await bob.request(queue)).data.status, 'idle')
  await assert.rejects(alice.client.create('duo'))
  assert.equal((await alice.request(queue, 'DELETE')).status, 200)
  assert.equal((await bob.request('/profile', 'PUT', { ...bob.profile, learningLanguage: 'invalid' })).status, 400)
  assert.equal((await bob.request('/profile', 'PUT', { ...bob.profile, fluentLanguage: 'French', learningLanguage: 'English' })).status, 200)
  const started = await Promise.all([alice, bob, alice].map(player => player.request(queue, 'POST')))
  assert.equal(started[0].status, 200)
  assert.equal(started[1].status, 200)
  assert.ok([200, 409].includes(started[2].status))
  const [aliceSeat, bobSeat] = await Promise.all([findSeat(alice), findSeat(bob)])
  assert.equal(aliceSeat.room.roomId, bobSeat.room.roomId)
  await assert.rejects(carol.client.joinById(aliceSeat.room.roomId))
  const [matchedAlice, matchedBob] = await Promise.all([
    alice.client.consumeSeatReservation(aliceSeat), bob.client.consumeSeatReservation(bobSeat),
  ])
  rooms.push(matchedAlice, matchedBob)
  const state = message(matchedAlice, 'session', state => state.host?.connected && state.guest?.connected && state)
  matchedAlice.send('sync')
  assert.equal((await state).matchType, 'reciprocal')
  assert.equal((await alice.request(queue, 'POST')).status, 409)
  const iconViews = []
  unsubscribes.push(matchedAlice.onMessage('game-view', event => iconViews.push(event)))
  unsubscribes.push(matchedAlice.onMessage('*', (type, data) => {
    if (type === 'target') iconViews.push({ data })
  }))
  const picked = message(matchedAlice, 'session', value => value.gameId === 'icon-communication' && value)
  matchedAlice.send('phase', { gameId: 'icon-communication' })
  await picked
  await bothReady(matchedAlice, matchedBob, 'confirmation', 'introduction')
  const reveal = message(matchedBob, 'game-view', event => event.data.target && event, 13000)
  const selectorReveal = message(matchedAlice, 'game-view', event => event.data.revealed && event, 13000)
  await bothReady(matchedAlice, matchedBob, 'introduction', 'game')
  const [icon, selector] = await Promise.all([reveal, selectorReveal])
  assert.equal(selector.data.grid.length, 9)
  assert.ok(iconViews.every(event => !Object.hasOwn(event.data, 'target')))
  assert.equal(Object.hasOwn(icon.data, 'grid'), false)
  const droppedIcon = message(matchedAlice, 'session', value => value.guest && !value.guest.connected && value)
  const reconnectToken = matchedBob.reconnectionToken
  await matchedBob.leave(false)
  await droppedIcon
  const iconPartner = await bob.client.reconnect(reconnectToken)
  rooms.push(iconPartner)
  const restoredIcon = message(iconPartner, 'game-view', event => event.data.target && event)
  iconPartner.send('sync')
  assert.deepEqual(await restoredIcon, icon)
  const checkClock = message(iconPartner, 'session', value => value.progress && value)
  iconPartner.send('sync')
  const beforePenalty = (await checkClock).progress.endsAt
  const wrong = selector.data.grid.find(id => id !== icon.data.target)
  const payload = { matchId: icon.matchId, action: { type: 'guess', icon: wrong, round: icon.round, revision: 0 } }
  iconPartner.send('game-action', { ...payload, action: { ...payload.action, icon: icon.data.target } })
  const hostPenalty = message(matchedAlice, 'session', value => value.progress?.endsAt === beforePenalty - 2000 && value)
  const guestPenalty = message(iconPartner, 'session', value => value.progress?.endsAt === beforePenalty - 2000 && value)
  matchedAlice.send('game-action', payload)
  const [firstClock, secondClock] = await Promise.all([hostPenalty, guestPenalty])
  assert.deepEqual(firstClock.progress, secondClock.progress)
  assert.equal(firstClock.progress.completed, 0)
  const results = message(iconPartner, 'session', value => value.results && value.results, 22000)
  assert.equal((await results).incorrectGuesses, 1)
  const requestedFriend = message(iconPartner, 'session', value => value.friendship?.host && value)
  matchedAlice.send('friend')
  assert.equal((await requestedFriend).friendship.accepted, false)
  const friendsAgain = message(matchedAlice, 'session', value => value.friendship?.accepted && value)
  iconPartner.send('friend')
  await friendsAgain
  assert.equal((await getDoc(doc(alice.firestore, 'friendships', request.id))).data().status, 'accepted')
  const iconReplay = message(iconPartner, 'session', value => value.progress && value)
  await bothReady(matchedAlice, iconPartner, 'results', 'game')
  const replayedIcon = await iconReplay
  assert.equal(replayedIcon.progress.round, 1)
  assert.equal(replayedIcon.progress.score, 0)
  assert.notEqual(replayedIcon.progress.matchId, icon.matchId)
  assert.equal(typeof replayedIcon.rolesSwapped, 'boolean')
  const matchEnded = message(iconPartner, 'ended')
  await matchedAlice.leave()
  await matchEnded
  assert.equal((await bob.request('/profile', 'PUT', { ...bob.profile, fluentLanguage: 'Spanish', learningLanguage: 'French' })).status, 200)
  assert.equal((await alice.request(queue, 'POST')).status, 200)
  const sharedStarted = Date.now()
  assert.equal((await bob.request(queue, 'POST')).status, 200)
  assert.equal((await bob.request(queue)).data.status, 'searching')
  const [sharedAlice, sharedBob] = await Promise.all([findSeat(alice), findSeat(bob)])
  assert.ok(Date.now() - sharedStarted >= 10000)
  assert.equal(sharedAlice.room.roomId, sharedBob.room.roomId)
  const sharedRoom = await alice.client.consumeSeatReservation(sharedAlice)
  rooms.push(sharedRoom)
  const sharedState = message(sharedRoom, 'session')
  sharedRoom.send('sync')
  assert.equal((await sharedState).matchType, 'shared-learning')
  const canceled = message(sharedRoom, 'ended')
  assert.equal((await bob.request(queue, 'DELETE')).status, 200)
  assert.match(await canceled, /canceled/)
  console.log('Passed: matchmaking deduplication, cancellation, concurrency, language validation, active-room exclusion and protected reciprocal seats.')
  console.log('Passed: accounts, profiles, Firestore rules, friendships, invitations, capacity, chat, signaling, game transitions, and reconnection.')
} finally {
  unsubscribes.forEach(stop => stop())
  await Promise.allSettled(rooms.filter(room => room.connection.isOpen).map(room => room.leave()))
  await Promise.allSettled(apps.map(deleteApp))
  await pause(50)
}
