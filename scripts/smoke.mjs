// Production smoke test. Usage:
//   SMOKE_EMAIL=you@example.com SMOKE_PASSWORD=... npm run smoke            # against the live site
//   SMOKE_BASE=http://localhost:5173/linkup/ SMOKE_EMAIL=… SMOKE_PASSWORD=… npm run smoke
// Needs an existing account that belongs to a crew. Read-only apart from a ghost-mode round trip.
import { chromium } from 'playwright'

const BASE = process.env.SMOKE_BASE || 'https://rudrakshsinghtomar7-lab.github.io/linkup/'
const EMAIL = process.env.SMOKE_EMAIL, PASS = process.env.SMOKE_PASSWORD
if (!EMAIL || !PASS) { console.error('Set SMOKE_EMAIL and SMOKE_PASSWORD'); process.exit(1) }

const browser = await chromium.launch()
const errs = []
const results = []
const check = (name, ok, detail = '') => { results.push([ok, name, detail]); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`) }

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error' && !/status of 404/.test(m.text())) errs.push(m.text().slice(0, 200)) })
page.on('pageerror', (e) => errs.push('pageerror ' + e.message))

// Deep link on a cold load must land on the app (GitHub Pages SPA fallback)
await page.goto(BASE + 'trips', { waitUntil: 'networkidle' })
check('deep link resolves under /linkup/', page.url().endsWith('/linkup/trips'), page.url())
check('login screen renders', (await page.locator('h1:has-text("Sign in")').count()) === 1)

await page.fill('input[type=email]', EMAIL); await page.fill('input[type=password]', PASS)
await page.click('button:has-text("Sign in")')
await page.waitForSelector('.hero, .seg, .gate', { timeout: 30000 })
check('login succeeds', !(await page.locator('h1:has-text("Sign in")').count()))

await page.waitForSelector('.hero', { timeout: 30000 }).catch(() => {})
check('TRIPS renders', (await page.locator('.hero').count()) === 1)
await page.click('.word'); await page.waitForSelector('.seg', { timeout: 30000 }); await page.waitForTimeout(2000)
check('NOW renders', page.url().endsWith('/now'))
check('map present', (await page.locator('.map .mapboxgl-canvas').count()) === 1, (await page.locator('.nomap').count()) ? 'no Mapbox token in this build' : '')
const ghostBefore = await page.locator('.ghostbar.show').count()
await page.click('.top button:has-text("Ghost")'); await page.waitForTimeout(1500)
check('ghost toggles', ghostBefore !== await page.locator('.ghostbar.show').count())
await page.click('.top button:has-text("Ghost")'); await page.waitForTimeout(1500)
await page.reload({ waitUntil: 'networkidle' }); await page.waitForSelector('.seg', { timeout: 30000 })
check('refresh keeps session + route', page.url().endsWith('/now'))

const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() })).newPage()
for (const r of ['now', 'trips']) {
  await m.goto(BASE + r, { waitUntil: 'networkidle' }); await m.waitForSelector('.seg, .hero', { timeout: 30000 }); await m.waitForTimeout(1000)
  check(`390px ${r}: no horizontal scroll`, await m.evaluate(() => document.documentElement.scrollWidth <= 390))
}
const manifest = await (await ctx.request.get(BASE + 'manifest.json')).json()
check('PWA manifest', manifest.start_url === '/linkup/' && manifest.display === 'standalone')
check('no console errors', errs.length === 0, errs.join(' | '))

await browser.close()
const failed = results.filter(([ok]) => !ok).length
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed')
process.exit(failed ? 1 : 0)
