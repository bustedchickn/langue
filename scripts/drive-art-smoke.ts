import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const browser = await chromium.launch({ executablePath: process.env.IDLE_CHROMIUM_PATH })
try {
  const page = await browser.newPage()
  await page.goto(process.env.IDLE_BROWSER_URL ?? 'http://localhost:5173')
  const colors = await page.evaluate(`(async () => {
    const modulePath = '/client/minigames/tandem-drive/art.ts'
    const { drawCourse } = await import(/* @vite-ignore */ modulePath)
    const { driveMaps } = await import(/* @vite-ignore */ '/shared/minigames/tandem-drive.ts')
    const canvas = document.createElement('canvas')
    canvas.width = 500
    canvas.height = 378
    const ctx = canvas.getContext('2d')
    const map = driveMaps[0]
    const base = {
      map, language: 'French', x: 0, angle: 0, distance: 200, stage: 0, hull: 100, left: false, right: false,
      swapped: false, switchAhead: false, message: '', gateKind: 'lane', unlockedUntil: 0,
      serverNow: 0, impact: 0, blocked: false, role: 'navigation', gate: 0,
      hazards: [{ x: 120, y: -190, w: 64, h: 64, shape: 'crate', vis: 'BOTH', label: 'CRATE' }],
    }
    const pixel = (x, y) => [...ctx.getImageData(x, y, 1, 1).data].slice(0, 3)
    let crate = []
    for (let attempt = 0; attempt < 20; attempt++) {
      drawCourse(ctx, base)
      crate = pixel(370, 300)
      if (crate[0] === 242 && crate[1] === 106 && crate[2] === 141) break
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    const leftRail = pixel(10, 100)
    const rightRail = pixel(490, 100)
    let laneClosed = []
    let safeLane = []
    for (let attempt = 0; attempt < 20; attempt++) {
      drawCourse(ctx, { ...base, distance: 600, hazards: [] })
      laneClosed = pixel(390, 207)
      safeLane = pixel(40, 207)
      if (laneClosed[0] === 243 && safeLane[0] === 171) break
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    drawCourse(ctx, { ...base, distance: 600, hazards: [], role: 'cadence', beatStartsAt: 0, openBeat: 0 })
    const cadenceLane = pixel(40, 207)
    drawCourse(ctx, { ...base, distance: 600, hazards: [], gateKind: 'cycle', role: 'cadence', beatStartsAt: 0, openBeat: 0, serverNow: 1700 })
    const cycleClosed = pixel(100, 207)
    drawCourse(ctx, { ...base, distance: 600, hazards: [], gateKind: 'cycle', role: 'cadence', beatStartsAt: 0, openBeat: 0, serverNow: 0 })
    const cycleOpen = pixel(100, 207)
    return { crate, leftRail, rightRail, laneClosed, safeLane, cadenceLane, cycleClosed, cycleOpen }
  })()`)
  assert.deepEqual(colors.crate, [242, 106, 141])
  assert.deepEqual(colors.leftRail, [251, 243, 185])
  assert.deepEqual(colors.rightRail, [139, 92, 246])
  assert.deepEqual(colors.laneClosed, [243, 74, 108])
  assert.deepEqual(colors.safeLane, [171, 212, 194])
  assert.deepEqual(colors.cadenceLane, [243, 74, 108])
  assert.deepEqual(colors.cycleClosed, [242, 106, 141])
  assert.deepEqual(colors.cycleOpen, [130, 229, 233])
  console.log('Driving artwork emulator check passed.')
} finally {
  await browser.close()
}
