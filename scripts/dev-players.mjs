import { chromium } from 'playwright'

const url = process.env.IDLE_BROWSER_URL ?? 'http://localhost:5173'
const browser = await chromium.launch({ headless: false, executablePath: process.env.IDLE_CHROMIUM_PATH })
try {
  await Promise.all([0, 1].map(async () => {
    const context = await browser.newContext({ viewport: { width: 420, height: 780 } })
    const page = await context.newPage()
    await page.goto(url)
  }))
  console.log('Opened two independent browser sessions. Press Ctrl+C to close them.')
  if (browser.isConnected()) await new Promise(resolve => browser.once('disconnected', resolve))
} finally {
  await browser.close()
}
