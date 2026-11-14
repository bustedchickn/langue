import { puzzles } from '../server/minigames/lost-instructions/puzzles.ts'
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

const message = (room, type, select = value => value) =>
  observe(next => room.onMessage(type, next), select)
const documents = (request, select) =>
  observe((next, fail) => onSnapshot(request, next, fail), snap => snap.docs.find(select))

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
    return { status: response.status, data: await response.json() }
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

  const host = await alice.client.create('duo')
  rooms.push(host)
  const lobby = message(host, 'session')
  host.send('phase', 'game')
  host.send('sync')
  assert.equal((await lobby).phase, 'lobby')
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
  await assert.rejects(carol.client.joinById(host.roomId))
  assert.equal((await bob.request(join, 'POST')).status, 409)

  const chat = message(guest, 'session', state => state.chat[0])
  host.send('chat', 'Bonjour!')
  assert.equal((await chat).text, 'Bonjour!')

  const voice = message(guest, 'voice', signal => signal.kind === 'state' && signal.joined)
  host.send('voice', { kind: 'state', joined: true })
  await voice
  const ready = message(host, 'voice', signal => signal.kind === 'state' && signal.joined)
  guest.send('voice', { kind: 'state', joined: true })
  await ready
  const hostViews = []
  const guestViews = []
  const guestOtherMessages = []
  unsubscribes.push(guest.onMessage('*', (type, value) => guestOtherMessages.push({ type, value })))
  unsubscribes.push(host.onMessage('game-view', value => hostViews.push(value)))
  unsubscribes.push(guest.onMessage('game-view', value => guestViews.push(value)))
  const countdown = message(host, 'session', state => state.progress)
  host.send('phase', 'game')
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
    const puzzle = puzzles.find(value => value.instructions.French === clue.data.instruction)
    assert.ok(puzzle)
    for (const [slot, piece] of puzzle.solution.entries()) {
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

  const replayed = message(host, 'session', state => state.progress && state.progress.matchId !== match.matchId && state.progress)
  host.send('phase', 'game')
  const replay = await replayed
  assert.equal(replay.round, 1)
  assert.equal(replay.score, 0)
  assert.equal(replay.completed, 0)
  assert.equal(rejoined.roomId, host.roomId)

  if (process.env.IDLE_TEST_TIMEOUT === 'true') {
    const defeat = room => observe(next => room.onMessage('session', next),
      state => state.results?.outcome === 'defeat' && state.results, 100000)
    const [hostResult, guestResult] = await Promise.all([defeat(host), defeat(rejoined)])
    assert.deepEqual(hostResult, guestResult)
    assert.equal(hostResult.elapsedMs, replay.endsAt - replay.startsAt)
    assert.equal(hostResult.completed, 0)
    assert.equal(hostResult.attempted, 1)
    const lobbyAgain = message(host, 'session', state => state.phase === 'lobby' && state)
    rejoined.send('phase', 'lobby')
    assert.equal((await lobbyAgain).results, undefined)
    console.log('Passed: the live server timed out the replay and published matching defeat results.')
  }
  const ended = message(host, 'ended')
  await rejoined.leave()
  assert.match(await ended, /left/)
  const queue = '/matchmaking'
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
  const matchEnded = message(matchedBob, 'ended')
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

