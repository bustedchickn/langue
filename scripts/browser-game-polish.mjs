import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { startCodenames } from '../server/minigames/codenames/game.ts'
import { startSpotDifference } from '../server/minigames/spot-difference/game.ts'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const players = { host: { name: 'A', learningLanguage: 'English', fluentLanguage: 'English' }, guest: { name: 'B', learningLanguage: 'French', fluentLanguage: 'English' } }
const browser = await chromium.launch({ executablePath: process.env.IDLE_CHROMIUM_PATH })
const page = await browser.newPage({ viewport: { width: 320, height: 700 } })
page.setDefaultTimeout(10000)
page.setDefaultNavigationTimeout(10000)
try {
  await page.route('**/__game-polish-check', route => route.fulfill({ contentType: 'text/html', body: '<html><head></head><body><main id="test"></main></body></html>' }))
  await page.goto((process.env.IDLE_BROWSER_URL ?? 'http://localhost:5173') + '/__game-polish-check')
  await page.evaluate(async () => {
    const react = await import('/node_modules/.vite/deps/react.js')
    const dom = await import('/node_modules/.vite/deps/react-dom_client.js')
    const createElement = (react.default ?? react).createElement
    const createRoot = (dom.default ?? dom).createRoot
    const { ActiveGame } = await import('/client/minigames/GameScreen.tsx')
    await import('/client/style.css')
    const root = createRoot(document.getElementById('test'))
    window.renderGameCheck = props => root.render(createElement(ActiveGame, { ...props, ready: true, send: action => { window.lastAction = action } }))
    window.renderDriveCheck = async () => {
      const { InstructionIllustration } = await import('/client/minigames/InstructionIllustration.tsx')
      root.render(createElement(InstructionIllustration, { gameId: 'tandem-drive' }))
    }
  })
  const game = startCodenames('browser-check', players, 0, () => 0)
  game.act('host', { type: 'clue', word: 'testword', count: 1, revision: 0 }, 3000)
  const target = game.view('host').cards.find(card => card.kind === 'team').id
  game.act('guest', { type: 'guess', id: target, revision: 1 }, 3000)
  const progress = game.progress(4000)
  const guest = game.view('guest')
  const view = { gameId: progress.gameId, matchId: progress.matchId, round: 1, data: { ...guest, hintsUnlocked: guest.cards.map(card => card.id) } }
  await page.evaluate(props => window.renderGameCheck(props), { progress, view })
  await page.getByText('Your turn', { exact: true }).waitFor()
  await page.getByText(/You now have one extra guess/).waitFor()
  for (const width of [280, 320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 700 })
    const board = page.locator('.codenames-grid')
    await board.scrollIntoViewIfNeeded()
    const rect = await board.boundingBox()
    assert.ok(rect.width <= width && rect.height <= 700)
    for (let i = 0; i < view.data.cards.length; i++) {
      const card = page.locator('.word-card').nth(i)
      const size = await card.boundingBox()
      assert.ok(Math.abs(size.width - size.height) < 1, 'Cards must remain square')
      await card.click()
      const popup = page.locator('.word-preview')
      await popup.waitFor()
      const bounds = await popup.boundingBox()
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, 'Popup must fit horizontally')
      assert.ok(Math.abs(bounds.width - bounds.height) < 1, 'Popup must remain square')
      await popup.getByRole('button', { name: 'Close', exact: true }).click()
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.word-card').nth(5).click()
  await page.screenshot({ path: join(tmpdir(), 'langue-codenames-polish.png'), fullPage: true })
  console.log('PASS: Nicknames turn, bonus message, 25 square cards and anchored square popovers at 280–1280px.')
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Pass turn', exact: true }).click()
  assert.equal((await page.evaluate(() => window.lastAction)).action.type, 'pass')
  const spot = startSpotDifference('spot-clock-check', players, 0)
  const spotProgress = { ...spot.progress(4001), startsAt: 3000, endsAt: 9501 }
  await page.evaluate(props => window.renderGameCheck(props), {
    progress: spotProgress, view: { gameId: spotProgress.gameId, matchId: spotProgress.matchId, round: 1, data: spot.view('host') },
  })
  await page.locator('.spot-badges').waitFor()
  const initial = await page.locator('.spot-badges').innerText()
  await page.waitForFunction(before => document.querySelector('.spot-badges').innerText !== before, initial, { timeout: 3000 })
  await page.locator('.game-clock-warning').waitFor()
  assert.equal(await page.locator('.game-clock-warning').evaluate(el => getComputedStyle(el).pointerEvents), 'none')
  await page.waitForFunction(() => document.querySelector('.game-progress time')?.textContent === '0s', { timeout: 8000 })
  assert.equal(await page.locator('.game-clock-warning').count(), 0)
  assert.ok(await page.locator('.scene-object').first().isDisabled())
  console.log('PASS: Spot clock ticks without server updates, shared warning appears for the final five seconds and stops at zero.')
  await page.evaluate(() => window.renderDriveCheck())
  await page.locator('.instruction-recipe').waitFor()
  await page.evaluate(() => Promise.all([...document.images].map(img => img.decode().catch(() => {}))))
  await page.screenshot({ path: join(tmpdir(), 'langue-driving-instructions.png'), fullPage: true })
  console.log('PASS: Driving instructions render with live board assets. Screenshots saved to the temporary folder.')
} finally { await browser.close() }
