import assert from 'node:assert/strict'
import { chromium, type Browser, type Page } from 'playwright'
import { puzzles } from '../server/minigames/lost-instructions/puzzles'
import type { Piece } from '../shared/minigames/lost-instructions'

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
  const page = await context.newPage()
  await page.goto(url)
  await button(page, 'Play as guest').click()
  await page.getByLabel('Username').fill(name + tag)
  await page.getByLabel('Display name').fill(name)
  if (name === 'Bob' || name === 'Remy') {
    await page.getByLabel('Fluent language').selectOption('French')
    await page.getByLabel('Learning language').selectOption('English')
  }
  await button(page, 'Save profile').click()
  await page.getByRole('navigation').waitFor()
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

async function run(browser: Browser, touch: boolean) {
  const [host, guest] = await Promise.all([player(browser, touch ? 'Lina' : 'Alice', touch), player(browser, touch ? 'Remy' : 'Bob', touch)])
  try {
    await button(host, 'Play').first().click()
    await Promise.all([
      host.waitForResponse(response => response.url().endsWith('/api/matchmaking') && response.request().method() === 'POST' && response.ok()),
      button(host, 'Quick Play').click(),
    ])
    await host.getByText('Finding your language partner…').waitFor()
    await button(guest, 'Play').first().click()
    await button(guest, 'Quick Play').click()
    await Promise.all([host, guest].map(page => page.getByText('Reciprocal match', { exact: true }).waitFor()))

    await button(host, 'Join Voice').click()
    await button(guest, 'Join Voice').click()
    await Promise.all([assertVoice(host), assertVoice(guest)])
    await button(host, 'Start Game').click()
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
    await host.evaluate(() => Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined }))
    await button(host, 'Play Again').click()
    await guest.getByText('0 solved · 0 points', { exact: true }).waitFor()
    await Promise.all([assertVoice(host), assertVoice(guest)])
    await host.getByText('This browser does not support pronunciation.').waitFor()
    assert.equal(await button(host, 'Pronounce in French').isDisabled(), true)
  } finally {
    await Promise.all([host.context().close(), guest.context().close()])
  }
}

const browser = await chromium.launch({
  executablePath: process.env.IDLE_CHROMIUM_PATH,
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
})
try {
  await run(browser, false)
  console.log('Passed Chromium mouse drag, click placement, game chat, scoring, replay, and persistent audio at 320px.')
  await run(browser, true)
  console.log('Passed Chromium touch drag, tap placement, mobile layout, and persistent audio at 320px.')
} finally {
  await browser.close()
}
