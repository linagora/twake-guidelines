// Records one stageshow example as a WebM of any size (landscape or portrait).
// Run it from the stageshow workshop folder, Vite running on :5199 (PORT=<n> to change):
//   EX=<example> node rec.cjs <width> <height> <outDir> <durationMs>
// Landscape 1920 1200 then crop 1920:1080; portrait (mobile) 1080 1920, no crop.
// The window is recorded as asked; for landscape ask 120px more height than the
// frame so the frame never shows a grey band, and crop after.
const { chromium } = require(process.cwd() + '/node_modules/playwright-core')

;(async () => {
  const [w, h, out, dur] = [+process.argv[2], +process.argv[3], process.argv[4], +process.argv[5]]
  const example = process.env.EX
  if (!example || !(w > 0) || !(h > 0) || !out || !(dur > 0)) {
    console.error('usage: EX=<example> node rec.cjs <width> <height> <outDir> <durationMs>')
    process.exit(1)
  }
  const frameH = +process.env.FRAME_H || h // visible frame height (landscape: 1080 while h is 1200)
  const browser = await chromium.launch({ channel: 'chrome' })
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    recordVideo: { dir: out, size: { width: w, height: h } },
  })
  await ctx.addInitScript(([fw, fh]) => {
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style')
      s.textContent = `html,body{margin:0;padding:0;background:#fff;overflow:hidden} #root,#example{width:${fw}px;height:${fh}px;margin:0;padding:0;display:grid;place-items:center}`
      document.head.appendChild(s)
    })
  }, [w, frameH])
  const page = await ctx.newPage()
  await page.goto(`http://localhost:${process.env.PORT || 5199}/?capture=${example}`)
  await page.waitForSelector('#example')
  await page.evaluate(() => {
    document.querySelector('#example').setAttribute('data-ss-fill', '')
    // The stage is narrower than a portrait frame: paint the page with its own background, no white bands
    document.documentElement.style.background = document.body.style.background = getComputedStyle(document.querySelector('.ss-stage')).backgroundColor
  })
  await page.waitForTimeout(dur)
  console.log(JSON.stringify(await page.evaluate(() => document.querySelector('.ss-stage').getBoundingClientRect())))
  await ctx.close()
  await browser.close()
})()
