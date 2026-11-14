import assert from 'node:assert/strict'
import { chromium, type Browser, type Page } from 'playwright'
import { puzzles } from '../server/minigames/lost-instructions/puzzles'
import type { Piece } from '../shared/minigames/lost-instructions'
import { wordCards } from '../shared/minigames/codenames'

const url = process.env.IDLE_BROWSER_URL ?? 'http://localhost:5173'
const tag = Date.now().toString(36)
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const slots = (page: Page) => page.locator('[data-lost-slot]')
const positions = ['Left', 'Middle', 'Right']
const label = (slot: number, piece: Piece) => positions[slot] + ': ' + piece.color + ' ' + piece.shape

async function player(browser: Browser, name: string, touch: boolean) {
  const context = await browser.newContext({ viewport: { width: 320, height: 700 }, hasTouch: touch })
  await context.addInitScript({ content: `
    (() => {
      const calls = []
      const synth = new EventTarget()
      let voices = []
      let end
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: Object.assign(synth, {
        getVoices: () => voices,
        cancel: () => clearTimeout(end),
        speak: utterance => {
          calls.push({ text: utterance.text, lang: utterance.lang, rate: utterance.rate })
          end = setTimeout(() => utterance.onend?.(new Event('end')), 800)
        },
      }) })
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: function (text) {
        return { text }
      } })
      Object.assign(window, { pronunciationCalls: calls, loadPronunciationVoices: () => {
        voices = ['en-US', 'fr-FR', 'es-ES'].map(lang => ({ lang, localService: true }))
        synth.dispatchEvent(new Event('voiceschanged'))
      } })
    })()
  ` })
  await context.addInitScript(() => {
    const Original = window.RTCPeerConnection
    const peers: RTCPeerConnection[] = []
    Object.assign(window, { peers })
    window.RTCPeerConnection = class extends Original {
      constructor(config?: RTCConfiguration) {
        super(config)
        peers.push(this)
      }
    }
  })
  await context.addInitScript(() => {
    const events: { action: string; src: string; loop: boolean }[] = []
    Object.assign(window, { soundEvents: events })
    const play = HTMLMediaElement.prototype.play
    const pause = HTMLMediaElement.prototype.pause
    HTMLMediaElement.prototype.play = function () {
      if (this instanceof HTMLAudioElement && !this.isConnected) events.push({ action: 'play', src: this.src, loop: this.loop })
      return play.call(this)
    }
    HTMLMediaElement.prototype.pause = function () {
      if (this instanceof HTMLAudioElement && !this.isConnected) events.push({ action: 'pause', src: this.src, loop: this.loop })
      return pause.call(this)
    }
  })
  if (process.env.IDLE_TEST_BLOCKED_AUDIO === 'true') {
    await context.addInitScript(() => {
      const play = HTMLMediaElement.prototype.play
      let blocked = false
      HTMLMediaElement.prototype.play = function () {
        if (!blocked && this instanceof HTMLAudioElement && this.isConnected) {
          blocked = true
          return Promise.reject(new DOMException('Autoplay blocked for smoke test', 'NotAllowedError'))
        }
        return play.call(this)
      }
    })
  }
  const page = await context.newPage()
  await page.goto(url)
  await button(page, 'Play as guest').click()
  await page.getByLabel('Username').fill(name + tag)
  await page.getByLabel('Display name').fill(name)
  if (name === 'Bob' || name === 'Remy' || name === 'IconGuest' || name === 'TapGuest') {
    await page.getByLabel('Fluent language').selectOption('French')
    await page.getByLabel('Learning language').selectOption('English')
  }
  await button(page, 'Save profile').click()
  await button(page, 'Play').waitFor()
  await button(page, 'Play').click()
  await button(page, 'Save language assessment').click()
  await button(page, 'Play').waitFor()
  if (name === 'Alice' || name === 'Lina') {
    const picker = page.getByRole('combobox', { name: /Learning/ })
    await picker.focus()
    await picker.press('ArrowDown')
    assert.equal(await picker.getAttribute('aria-expanded'), 'true')
    await picker.press('End')
    assert.equal(await picker.getAttribute('aria-activedescendant'), 'practice-language-Spanish')
    await picker.press('Escape')
    assert.equal(await picker.getAttribute('aria-expanded'), 'false')
    await picker.press('ArrowDown')
    await picker.press('End')
    await picker.press('Enter')
    await button(page, 'Save language assessment').click()
    await picker.waitFor()
    await picker.click()
    await page.getByRole('option', { name: 'French' }).click()
    await page.getByRole('combobox', { name: 'Learning French' }).waitFor()
  }
  return page
}

async function assertVoice(page: Page) {
  await page.getByText('Voice connected', { exact: true }).waitFor()
  await page.waitForFunction(async () => {
    const peers = (window as Window & { peers?: RTCPeerConnection[] }).peers
    if (!peers || peers.length !== 1 || peers[0].connectionState !== 'connected') return false
    const stats = await peers[0].getStats()
    return [...stats.values()].some(stat => stat.type === 'inbound-rtp' && stat.kind === 'audio' && stat.packetsReceived > 0)
  }, undefined, { timeout: 8000 })
}

async function drag(page: Page, from: number, to: number, touch: boolean) {
  await slots(page).nth(from).scrollIntoViewIfNeeded()
  const first = (await slots(page).nth(from).boundingBox())!
  const last = (await slots(page).nth(to).boundingBox())!
  const start = { x: Math.round(first.x + first.width / 2), y: Math.round(first.y + first.height / 2) }
  const end = { x: Math.round(last.x + last.width / 2), y: Math.round(last.y + last.height / 2) }
  if (touch) {
    const protocol = await page.context().newCDPSession(page)
    await protocol.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
    for (let step = 1; step <= 5; step++) {
      await protocol.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
        x: start.x + (end.x - start.x) * step / 5, y: start.y + (end.y - start.y) * step / 5,
      }] })
    }
    await protocol.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await protocol.detach()
  } else {
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(end.x, end.y, { steps: 5 })
    await page.mouse.up()
  }
}

async function agree(host: Page, guest: Page, label: string) {
  await button(host, label).click()
  await host.getByText('Waiting for your partner…', { exact: true }).waitFor()
  await guest.getByText('Your partner is ready.', { exact: true }).waitFor()
  await button(guest, label).click()
}

async function startGame(host: Page, guest: Page) {
  await agree(host, guest, 'I’m ready!')
  await guest.reload()
  await guest.getByRole('heading', { name: 'Meet your partner!' }).waitFor()
  await button(host, 'Test mic').click()
  await host.getByRole('meter', { name: 'Microphone level' }).waitFor()
  await button(host, 'Stop test').click()
  await button(host, 'Join Voice').click()
  await button(guest, 'Join Voice').click()
  await Promise.all([assertVoice(host), assertVoice(guest)])
  if (process.env.IDLE_TEST_BLOCKED_AUDIO === 'true') {
    for (const page of [host, guest]) {
      await button(page, 'Play partner audio').click()
      await page.waitForFunction(() => {
        const audio = document.querySelector('audio')
        return audio && !audio.paused
      })
    }
  }
  await agree(host, guest, 'I’m ready to play!')
}

async function run(browser: Browser, touch: boolean, icons = false, tandem = false) {
  const [host, guest] = await Promise.all([
    player(browser, icons ? (touch ? 'TapHost' : 'IconHost') : touch ? 'Lina' : 'Alice', touch),
    player(browser, icons ? (touch ? 'TapGuest' : 'IconGuest') : touch ? 'Remy' : 'Bob', touch),
  ])
  try {
    if (!touch && !icons && !tandem) {
      await host.setViewportSize({ width: 1280, height: 800 })
      assert.equal(await host.getByRole('navigation').count(), 0)
      await host.getByRole('img', { name: 'Lost in Translation' }).waitFor()
      await button(host, 'Open profile and settings').click()
      await host.getByRole('heading', { name: 'Settings' }).waitFor()
      await button(host, '← Back to home').click()
      await button(host, 'Play With Friends').click()
      await host.getByRole('heading', { name: 'Friends', exact: true }).waitFor()
      await button(host, '← Back to home').click()
      await host.setViewportSize({ width: 320, height: 700 })
    }
    await Promise.all([
      host.waitForResponse(response => response.url().endsWith('/api/matchmaking') && response.request().method() === 'POST' && response.ok()),
      button(host, 'Play').click(),
    ])
    await host.getByText('Finding your partner…').waitFor()
    if (process.env.IDLE_TEST_SOUND === 'true') {
      const soundEvents = () => host.evaluate(() => (window as unknown as { soundEvents: { action: string; src: string; loop: boolean }[] }).soundEvents)
      assert.ok((await soundEvents()).some(event => event.action === 'play' && event.src.includes('connecting1') && event.loop))
      await button(host, 'Cancel').click()
      await button(host, 'Play').waitFor()
      assert.ok((await soundEvents()).some(event => event.action === 'pause' && event.src.includes('connecting1')))
      await button(host, 'Open profile and settings').click()
      await button(host, 'Game sounds on').click()
      await button(host, '← Back to home').click()
      const before = (await soundEvents()).length
      await button(host, 'Play').click()
      await host.getByText('Finding your partner…').waitFor()
      assert.equal((await soundEvents()).filter(event => event.action === 'play').length,
        (await soundEvents()).slice(0, before).filter(event => event.action === 'play').length)
      await button(host, 'Cancel').click()
      await button(host, 'Open profile and settings').click()
      await button(host, 'Game sounds off').click()
      await button(host, '← Back to home').click()
      await button(host, 'Play').click()
      await host.getByText('Finding your partner…').waitFor()
    }
    await button(guest, 'Play').click()
    await Promise.all([host, guest].map(page => page.getByText('Reciprocal match', { exact: true }).waitFor()))
    if (process.env.IDLE_TEST_SOUND === 'true') {
      await host.waitForFunction(() => (window as unknown as { soundEvents: { action: string; src: string; loop: boolean }[] }).soundEvents
        .some(event => event.action === 'play' && event.src.includes('connected2') && !event.loop))
      await host.waitForFunction(() => {
        const events = (window as unknown as { soundEvents: { action: string; src: string; loop: boolean }[] }).soundEvents
        const search = events.map(event => event.action === 'play' && event.src.includes('connecting1')).lastIndexOf(true)
        return events.slice(search + 1).some(event => event.action === 'pause' && event.src.includes('connecting1'))
      })
      return
    }

    if (process.env.IDLE_TEST_CODENAMES === 'true') {
      await host.getByLabel('Minigame').selectOption('codenames')
      await guest.getByRole('heading', { name: 'Codenames' }).waitFor()
      await startGame(host, guest)
      await host.getByLabel('One-word clue').fill('animal')
      await button(host, 'Give clue').click()
      await guest.getByText(/Indice.*animal/).waitFor()
      const team = host.locator('.word-card[data-kind="team"]').first()
      assert.equal(await guest.locator('.word-card').count(), 25)
      const id = await team.getAttribute('data-id')
      const item = wordCards.find(entry => entry.id === id)!
      assert.equal(await guest.locator('.word-card[data-kind]').count(), 0)
      const card = guest.locator('.word-card[data-id="' + id + '"]')
      assert.equal((await team.innerText()).trim(), item.words.French)
      assert.equal((await card.innerText()).trim(), item.words.English)
      const info = card.locator('..').getByRole('button', { name: /^Définition de/ })
      await info.click()
      assert.equal(await info.getAttribute('aria-expanded'), 'true')
      assert.equal((await card.locator('..').getByRole('tooltip').innerText()).trim(), item.definitions.French)
      await card.click()
      await host.getByText('Team words found 1 · Team score 1').waitFor()
      assert.equal(await card.getAttribute('data-revealed'), 'true')
      assert.equal(await guest.evaluate(() => document.documentElement.scrollWidth), 320)
      return
    }
    if (process.env.IDLE_TEST_SPOT === 'true') {
      await host.getByLabel('Minigame').selectOption('spot-difference')
      await guest.getByRole('heading', { name: 'Spot the Difference', exact: true }).waitFor()
      await startGame(host, guest)
      await host.getByLabel('Player 1 scene', { exact: true }).waitFor()
      await guest.getByLabel('Player 2 scene', { exact: true }).waitFor()
      await button(guest, 'Finish Round').click()
      for (const page of [host, guest]) {
        await page.getByRole('heading', { name: /Round finished/ }).waitFor()
        assert.equal(await page.locator('.results-confetti').count(), 0)
      }
      await button(host, 'Add friend 🙌').click()
      await button(guest, 'Accept friendship').click()
      await Promise.all([host, guest].map(page => page.getByText('You’re friends!').waitFor()))
      await Promise.all([host, guest].map(page => page.getByRole('img', { name: 'High five and hug' }).waitFor()))
      await agree(host, guest, 'Play Again')
      await Promise.all([assertVoice(host), assertVoice(guest)])
      return
    }
    if (process.env.IDLE_TEST_MAP === 'true') {
      await host.getByLabel('Minigame').selectOption('map-navigator')
      await guest.getByRole('heading', { name: 'Map Navigator' }).waitFor()
      await startGame(host, guest)
      await guest.getByRole('grid', { name: 'Sunnyville city map' }).waitFor()
      assert.equal(await guest.getByRole('gridcell').count(), 49)
      assert.equal(await guest.getByRole('gridcell', { name: /Destination|Checkpoint/ }).count(), 0)
      assert.equal(await host.getByRole('gridcell', { name: /Destination|Checkpoint/ }).count(), 3)
      assert.equal(await guest.evaluate(() => document.documentElement.scrollWidth), 320)
      for (const [index, direction] of ['South', 'South', 'East', 'East', 'South', 'South', 'East', 'East'].entries()) {
        await button(guest, direction).tap()
        if (index === 1 || index === 5) await guest.getByText((index === 1 ? '1' : '2') + '/2 checkpoints').waitFor()
        else if (index < 7) await guest.getByText((index + 1) + (index === 0 ? ' move' : ' moves'), { exact: true }).waitFor()
      }
      for (const page of [host, guest]) {
        await page.getByRole('heading', { name: 'Destination reached' }).waitFor()
        assert.equal(await page.locator('.results-confetti i').count(), 32)
        await assertVoice(page)
      }
      return
    }
    if (tandem) {
      await host.getByLabel('Minigame').selectOption('tandem-drive')
      await guest.getByRole('heading', { name: 'Tandem Drive' }).waitFor()
      await startGame(host, guest)
      await host.getByText('Optic · Navigation', { exact: true }).waitFor()
      await guest.getByText('Radar · Cadence', { exact: true }).waitFor()
      assert.equal(await host.locator('canvas').count(), 1)
      assert.equal(await guest.locator('canvas').count(), 1)
      assert.equal(await host.locator('.drive-beats').count(), 0)
      assert.equal(await guest.getByText(/Safe gate/).count(), 0)
      assert.equal(await button(host, 'Release gate').count(), 0)
      assert.equal(await button(guest, 'Release gate').isDisabled(), true)
      const before = await guest.locator('canvas').evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL())
      const left = button(host, 'Left thruster')
      const right = button(guest, 'Right thruster')
      await Promise.all([left.focus(), right.focus()])
      await Promise.all([host.keyboard.down('Space'), guest.keyboard.down('Space')])
      await guest.waitForFunction(image => document.querySelector('canvas')?.toDataURL() !== image, before)
      await Promise.all([host.keyboard.up('Space'), guest.keyboard.up('Space')])
      assert.equal(await left.getAttribute('aria-pressed'), 'false')
      assert.equal(await right.getAttribute('aria-pressed'), 'false')
      await Promise.all([assertVoice(host), assertVoice(guest)])
      return
    }
    if (icons) {
      await host.getByLabel('Minigame').selectOption('icon-communication')
      await guest.getByRole('heading', { name: 'Icon Communication' }).waitFor()
      await startGame(host, guest)
      await guest.getByText('Get ready! Your next icon is coming…').waitFor()
      const grid = host.locator('.icon-tile')
      assert.equal(await grid.count(), 9)
      assert.equal(await grid.first().isDisabled(), true)
      assert.equal(await host.locator('time').count(), 0)
      const target = guest.locator('.icon-target')
      await target.waitFor()
      const id = (await target.getAttribute('src'))!.split('/').at(-1)!.replace('.svg', '')
      assert.equal(await guest.locator('.icon-tile').count(), 0)
      assert.equal(await host.locator('.icon-target').count(), 0)
      await host.getByText(/Time left/).waitFor()
      await guest.getByText(/Time left/).waitFor()
      const bounds = await grid.first().boundingBox()
      assert.ok(bounds && bounds.width >= 44 && bounds.height >= 44)
      assert.equal(await host.evaluate(() => document.documentElement.scrollWidth), 320)
      await guest.getByLabel('Message', { exact: true }).fill('Here is my description')
      await button(guest, 'Send').click()
      await host.getByText('Here is my description', { exact: true }).waitFor()
      const wrong = host.locator('.icon-tile:not([data-icon="' + id + '"])').first()
      if (touch) await wrong.tap()
      else await wrong.click()
      await Promise.all([host, guest].map(page => page.getByText('Incorrect.', { exact: false }).waitFor()))
      const correct = host.locator('.icon-tile[data-icon="' + id + '"]')
      // The selector suppresses rapid double taps after an acknowledged guess.
      await host.waitForTimeout(320)
      if (touch) await correct.tap()
      else await correct.click()
      await guest.getByText('Correct! Get ready for the next round.').waitFor()
      await target.waitFor()
      const next = (await target.getAttribute('src'))!.split('/').at(-1)!.replace('.svg', '')
      assert.notEqual(next, id)
      const miss = host.locator('.icon-tile:not([data-icon="' + next + '"])').first()
      for (let count = 0; count < 5 && await miss.isVisible(); count++) {
        if (touch) await miss.tap()
        else await miss.click()
        await host.waitForTimeout(400)
      }
      for (const page of [host, guest]) {
        await page.getByRole('heading', { name: 'Time’s up' }).waitFor()
        assert.match(await page.locator('.game-results').innerText(), /Icons identified\s+1/)
        assert.match(await page.locator('.game-results').innerText(), /Final score\s+1/)
        await page.getByRole('button', { name: /^Pronounce / }).first().waitFor()
        await assertVoice(page)
      }
      assert.equal(await host.locator('.game-results').innerText(), await guest.locator('.game-results').innerText())
      await agree(host, guest, 'Play Again')
      await guest.getByText('0 solved · 0 points', { exact: true }).waitFor()
      await Promise.all([assertVoice(host), assertVoice(guest)])
      return
    }
    await startGame(host, guest)
    await host.getByText(/Starts in/).waitFor()
    assert.equal(await host.getByText('Your private instruction').count(), 0)
    await host.getByText('Your private instruction').waitFor()
    await Promise.all([assertVoice(host), assertVoice(guest)])
    assert.equal(await guest.getByText('Your private instruction').count(), 0)
    const speaker = button(host, 'Pronounce in French')
    await host.getByText('Pronunciation is unavailable for French on this device.').waitFor()
    await speaker.click()
    const calls = (page: Page) => page.evaluate(() =>
      (window as unknown as { pronunciationCalls: { text: string; lang: string; rate: number }[] }).pronunciationCalls)
    assert.deepEqual(await calls(host), [])
    await host.evaluate(() => (window as unknown as { loadPronunciationVoices: () => void }).loadPronunciationVoices())
    const spoken = await host.locator('.lost-instruction').textContent()
    if (touch) await speaker.tap()
    else await speaker.press('Enter')
    await host.getByText('Playing…', { exact: true }).waitFor()
    await speaker.click()
    assert.deepEqual(await calls(host), Array(2).fill({ text: spoken, lang: 'fr-FR', rate: 0.85 }))
    assert.deepEqual(await calls(guest), [])
    await host.getByText('Playing…', { exact: true }).waitFor({ state: 'hidden' })
    await Promise.all([assertVoice(host), assertVoice(guest)])
    for (const page of [host, guest]) {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320)
    }

    await host.getByLabel('Message', { exact: true }).fill('A clue from the instructor')
    await button(host, 'Send').click()
    await guest.getByText('A clue from the instructor', { exact: true }).waitFor()
    await button(guest, 'Check arrangement').click()
    await guest.getByText('That arrangement is incorrect. Try again.').waitFor()

    for (let round = 1; round <= 3; round++) {
      const status = 'Round ' + round + ' of 3'
      await host.getByText(status, { exact: true }).waitFor()
      await guest.getByText(status, { exact: true }).waitFor()
      const clue = host.locator('.lost-instruction')
      await clue.waitFor()
      assert.equal(await clue.getAttribute('lang'), 'fr')
      const bounds = await clue.boundingBox()
      assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 320)
      const text = await clue.textContent()
      const current = puzzles.find(value => value.instructions.French === text)
      assert.ok(current)
      await guest.getByText(text!, { exact: true }).waitFor({ state: 'hidden' })
      const order = [...current.initial]
      for (const [to, piece] of current.solution.entries()) {
        const from = order.indexOf(piece)
        if (from === to) continue
        const source = slots(guest).nth(from)
        const destination = slots(guest).nth(to)
        const expected = label(to, current.objects.find(object => object.id === piece)!)
        if (round === 1) await drag(guest, from, to, touch)
        else if (touch) { await source.tap(); await destination.tap() }
        else { await source.click(); await destination.click() }
        await guest.getByRole('button', { name: expected, exact: true }).waitFor()
        ;[order[from], order[to]] = [order[to], order[from]]
      }
      await button(guest, 'Check arrangement').click()
    }

    for (const page of [host, guest]) {
      await page.getByRole('heading', { name: 'Victory' }).waitFor()
      const results = await page.locator('.game-results').innerText()
      assert.match(results, /Puzzles completed\s+3/)
      assert.match(results, /Puzzles attempted\s+3/)
      assert.match(results, /Time elapsed\s+\d+s/)
      assert.match(results, /Final score\s+300/)
      await assertVoice(page)
    }
    assert.equal(await host.locator('.game-results').innerText(), await guest.locator('.game-results').innerText())
    await agree(host, guest, 'Play Again')
    await guest.getByText('0 solved · 0 points', { exact: true }).waitFor()
    await Promise.all([assertVoice(host), assertVoice(guest)])
  } finally {
    await Promise.all([host.context().close(), guest.context().close()])
  }
}

const browser = await chromium.launch({
  executablePath: process.env.IDLE_CHROMIUM_PATH,
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
})
try {
  if (process.env.IDLE_TEST_SOUND === 'true') {
    await run(browser, false)
    console.log('Passed sound playback, mute, search cancellation and match confirmation.')
  } else if (process.env.IDLE_TEST_CODENAMES === 'true') {
    await run(browser, true)
    console.log('Passed Codenames private key, clue, definition and synchronized guess at 320px.')
  } else if (process.env.IDLE_TEST_SPOT === 'true') {
    await run(browser, true)
    console.log('Passed Spot the Difference private scenes, results, friendship, replay, and voice.')
  } else if (process.env.IDLE_TEST_MAP === 'true') {
    await run(browser, true)
    console.log('Passed Map Navigator at 320px: private route, touch directions, both checkpoints, results, confetti and voice.')
  } else if (process.env.IDLE_TEST_TANDEM === 'true') {
    await run(browser, true, false, true)
    console.log('Passed Tandem Drive private views, cadence-only gate control, synchronized held controls, pedal release and active voice.')
  } else {
    await run(browser, false)
    console.log('Passed Chromium mouse drag, click placement, game chat, scoring, replay, and persistent audio at 320px.')
    await run(browser, true)
    console.log('Passed Chromium touch drag, tap placement, mobile layout, and persistent audio at 320px.')
    await run(browser, false, true)
    await run(browser, true, true)
    console.log('Passed Icon Communication mouse and touch at 320px, private views, chat, results, replay, and persistent audio.')
  }
} finally {
  await browser.close()
}
