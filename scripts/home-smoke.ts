import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const browser = await chromium.launch({ executablePath: process.env.IDLE_CHROMIUM_PATH })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto(process.env.IDLE_BROWSER_URL ?? 'http://localhost:5173')
  await page.getByRole('button', { name: 'Quick test guest' }).click()
  await page.getByRole('button', { name: 'Open leaderboard' }).waitFor()
  const logo = page.getByRole('button', { name: 'Switch logo language' })
  const first = await logo.locator('img[alt="Lost in Translation"]').getAttribute('src')
  const seen = new Set([first])
  for (let index = 0; index < 2; index++) {
    await logo.click()
    seen.add(await logo.locator('img[alt="Lost in Translation"]').getAttribute('src'))
    assert.equal(await logo.locator('img.game-logo-previous').count(), 1)
    assert.equal(await logo.locator('img.game-logo-next').evaluate(element => getComputedStyle(element).animationName), 'logo-fade-in')
    await page.waitForTimeout(700)
  }
  assert.deepEqual(seen, new Set(['/lostintranslation.png', '/lostintranslationspanish.png', '/lostintranslationfrench.png']))
  await logo.click()
  assert.equal(await logo.locator('img[alt="Lost in Translation"]').getAttribute('src'), first)
  await page.getByRole('button', { name: 'Open leaderboard' }).click()
  await page.getByRole('heading', { name: 'Leaderboard', exact: true }).waitFor()
  await page.getByText('Overall scores', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Codenames' }).click()
  await page.getByText('Codenames high scores').waitFor()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390)
  console.log('Home logo and leaderboard emulator check passed.')
} finally {
  await browser.close()
}
