import assert from 'node:assert/strict'
import { chromium, type Page } from 'playwright'

const browser = await chromium.launch({
  executablePath: process.env.IDLE_CHROMIUM_PATH,
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
})
const url = process.env.IDLE_BROWSER_URL ?? 'http://localhost:5173'

async function guest(): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto(url)
  await page.getByRole('button', { name: 'Quick test guest' }).click()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await page.getByLabel('Communication level').selectOption('Fluent')
  await page.getByRole('button', { name: 'Save language assessment' }).click()
  await page.getByRole('button', { name: 'Play', exact: true }).waitFor()
  return page
}

async function ready(pages: Page[], label: string, nextHeading?: string) {
  await pages[0].getByRole('button', { name: label, exact: true }).click()
  await pages[1].getByRole('button', { name: label, exact: true }).click()
  await Promise.all(pages.map(page => nextHeading
    ? page.getByRole('heading', { name: nextHeading, exact: true }).waitFor()
    : page.locator('.game-exit-controls').waitFor()))
}

try {
  const pages = await Promise.all([guest(), guest()])
  await Promise.all(pages.map(page => page.getByRole('button', { name: 'Play', exact: true }).click()))
  await Promise.all(pages.map(page => page.getByRole('heading', { name: 'Meet your partner!', exact: true }).waitFor({ timeout: 45000 })))
  for (const page of pages) {
    assert.equal(await page.getByRole('button', { name: 'Test mic' }).count(), 0)
    await page.getByRole('button', { name: 'Join Voice' }).click()
    await page.getByRole('button', { name: 'Leave Voice' }).waitFor()
    assert.equal(await page.locator('.game-instructions').getAttribute('open'), '')
    assert.equal(await page.locator('.instruction-recipe svg[role=img]').count(), 3)
  }
  await ready(pages, 'I’m ready to play!')
  for (const page of pages) {
    assert.equal(await page.locator('.game-instructions').getAttribute('open'), null)
    await page.locator('.game-instructions summary').click()
    assert.equal(await page.locator('.instruction-recipe svg[role=img]').count(), 3)
    await page.locator('.game-instructions summary').click()
    await page.getByRole('button', { name: 'Leave Voice' }).waitFor()
  }
  await pages[0].getByRole('button', { name: 'End early' }).click()
  await pages[0].getByRole('dialog', { name: 'End this game early?' }).getByRole('button', { name: 'End game' }).click()
  await Promise.all(pages.map(page => page.getByRole('button', { name: 'Play Again' }).waitFor()))
  await ready(pages, 'Play Again', 'Play again together?')
  for (const page of pages) await page.getByRole('button', { name: 'Leave Voice' }).waitFor()
  await ready(pages, 'I’m ready!', 'Meet your partner!')
  for (const page of pages) await page.getByRole('button', { name: 'Leave Voice' }).waitFor()
  console.log('Room flow and instructions emulator check passed.')
} finally {
  await browser.close()
}
