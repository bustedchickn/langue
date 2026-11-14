import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { codenamesConfig } from '../shared/minigames/codenames'

const browser = await chromium.launch({ executablePath: process.env.IDLE_CHROMIUM_PATH })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto(process.env.IDLE_BROWSER_URL ?? 'http://localhost:5173')
  await page.getByRole('button', { name: 'Quick test guest' }).click()
  await page.getByRole('button', { name: 'Open leaderboard' }).waitFor()
  const logo = page.getByRole('button', { name: 'Switch logo language' })
  const initial = await logo.locator('img[alt="Lost in Translation"]').getAttribute('src')
  const started = Date.now()
  await page.waitForFunction(previous => document.querySelector('img[alt="Lost in Translation"]')?.getAttribute('src') !== previous,
    initial, { timeout: 3500 })
  assert.ok(Date.now() - started >= 1700, 'Logo switches after about two seconds')
  assert.equal(await logo.locator('img.game-logo-next').evaluate(element => getComputedStyle(element).animationName), 'logo-fade-in')
  await page.waitForTimeout(700)
  const first = await logo.locator('img[alt="Lost in Translation"]').getAttribute('src')
  const seen = new Set([first])
  for (let index = 0; index < 9; index++) {
    await logo.click()
    seen.add(await logo.locator('img[alt="Lost in Translation"]').getAttribute('src'))
    assert.equal(await logo.locator('img.game-logo-previous').count(), 1)
    assert.equal(await logo.locator('img.game-logo-next').evaluate(element => getComputedStyle(element).animationName), 'logo-fade-in')
    await logo.locator('img[alt="Lost in Translation"]').evaluate(async image => {
      if (!(image instanceof HTMLImageElement)) throw new Error('Logo image is missing')
      await image.decode()
    })
    await page.waitForTimeout(700)
  }
  assert.deepEqual(seen, new Set([
    '/lostintranslation.png', '/lostintranslationspanish.png', '/lostintranslationfrench.png',
    '/lostintranslationportuguese.png', '/lostintranslationkorean.png', '/lostintranslationjapanese.png',
    '/lostintranslationitalian.png', '/lostintranslationgerman.png', '/lostintranslationchinese.png',
    '/lostintranslationrussian.png',
  ]))
  await logo.click()
  assert.equal(await logo.locator('img[alt="Lost in Translation"]').getAttribute('src'), first)
  await page.getByRole('button', { name: 'Open leaderboard' }).click()
  await page.getByRole('heading', { name: 'Leaderboard', exact: true }).waitFor()
  await page.getByText('Overall scores', { exact: true }).waitFor()
  await page.getByRole('button', { name: codenamesConfig.name }).click()
  await page.getByText(`${codenamesConfig.name} high scores`).waitFor()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390)
  console.log('Home logo and leaderboard emulator check passed.')
} finally {
  await browser.close()
}
