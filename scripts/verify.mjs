// Drives the built site in headless Chrome and exits non-zero when a route is broken.
// Feature map: docs/FEATURES.md. Run through scripts/verify.sh (it builds first).
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env.VERIFY_PORT ?? 4179)
const BASE = `http://localhost:${PORT}/`
const OUT = join(ROOT, 'verify-out')

// One row per chapter: its route, the panel headings a visitor must see, and one [step, panel] pair where the
// step marks that panel as its evidence.
const CHAPTERS = [
  { route: 'tick', mark: [3, 'budget-h'], panels: ['budget-h', 'latency-h'] },
  { route: 'ppo', mark: [7, 'diag-h'], panels: ['clip-h', 'diag-h'] },
  { route: 'dds', mark: [1, 'qos-h'], panels: ['qos-h', 'profiles-h'] },
  { route: 'sim2real', mark: [3, 'holdout-h'], panels: ['holdout-h', 'trap-h'] },
  { route: 'vla', mark: [6, 'timing-h'], panels: ['scaling-h', 'timing-h', 'ladder-h'] },
  { route: 'sysid', mark: [3, 'replay-h'], panels: ['replay-h', 'fit-h', 'spread-h'] },
]

function findChrome() {
  const candidates = [
    process.env.CHROME,
    'google-chrome',
    'chromium',
    'chromium-browser',
    '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
  ].filter(Boolean)
  for (const c of candidates) {
    if (c.includes('/') ? existsSync(c) : spawnSync('which', [c]).status === 0) return c
  }
  throw new Error('no Chrome found: set CHROME=/path/to/chrome')
}

const CHROME = findChrome()
// A Windows Chrome started from WSL needs a Windows path for the screenshot file.
const chromePath = (p) =>
  CHROME.endsWith('.exe') ? spawnSync('wslpath', ['-w', p], { encoding: 'utf8' }).stdout.trim() : p

function load(hash, { lang = 'en', shot } = {}) {
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    `--lang=${lang}`,
    '--virtual-time-budget=4000',
    '--enable-logging=stderr',
    '--window-size=1280,1600',
  ]
  // --dump-dom and --screenshot do not combine: a screenshot is a second, separate load.
  const run = (extra) => spawnSync(CHROME, [...args, ...extra, BASE + hash], { encoding: 'utf8', timeout: 60_000 })
  // Chrome's first start can return no DOM at all; a broken page still returns one, so this retry hides no failure.
  let r = run(['--dump-dom'])
  if (!r.stdout) r = run(['--dump-dom'])
  if (shot) run([`--screenshot=${chromePath(join(OUT, shot))}`])
  const consoleErrors = r.stderr
    .split('\n')
    .filter((l) => /CONSOLE/.test(l) && /ERROR:CONSOLE|Uncaught|Error:/.test(l))
  return { dom: r.stdout ?? '', consoleErrors }
}

const text = (dom, re) => dom.match(re)?.[1]?.trim() ?? ''

// Returns the list of problems on one loaded page (empty = the page works).
function check(dom, consoleErrors, ch, step) {
  const bad = [...consoleErrors.map((e) => `console: ${e.slice(-160)}`)]
  if (!text(dom, /<h1>([^<]+)<\/h1>/)) bad.push('no chapter title (h1)')
  if (!text(dom, /id="stage-title">([^<]+)</)) bad.push('no step title')
  const pos = dom.match(/class="eyebrow">[^<]*?(\d+) \/ (\d+)</)
  if (!pos) bad.push('no step position')
  else if (Number(pos[1]) !== step) bad.push(`step position shows ${pos[1]}, expected ${step}`)
  if (!/aria-current="step"/.test(dom)) bad.push('ring has no current step')
  if (!/<dd id="readout-step"><span class="chip( solid)?">[^<]+<\/span>/.test(dom)) bad.push('readout row has no chip for this step')
  const sourced = dom.match(/<dd>(\d+) \/ (\d+)<\/dd>/)
  if (!sourced) bad.push('readout row has no sourced-step count')
  else if (pos && sourced[2] !== pos[2]) bad.push(`readout counts ${sourced[2]} steps, ring has ${pos[2]}`)
  if (!dom.includes(`id="${ch.route}-next"`)) bad.push('no Next button')
  for (const id of ch.panels) if (!dom.includes(`id="${id}"`)) bad.push(`panel ${id} missing`)
  for (const id of ch.panels) if (!dom.includes(`id="evidence-${id}"`)) bad.push(`no jump button to ${id}`)
  if (step === ch.mark[0]) {
    if (!new RegExp(`id="evidence-${ch.mark[1]}"[^>]*aria-current="true"`).test(dom)) bad.push(`step does not mark ${ch.mark[1]}`)
    if (!new RegExp(`<h2 id="${ch.mark[1]}">[^<]*<span class="chip here"`).test(dom)) bad.push(`panel ${ch.mark[1]} is not marked`)
  }
  // ARIA 1.2 prohibits aria-label on a generic div/span: screen readers may skip the name.
  const unnamed = dom.match(/<(?:div|span|dl)\b(?![^>]*\brole=)[^>]*\baria-label=/)
  if (unnamed) bad.push(`aria-label on an element with no role: ${unnamed[0].slice(0, 80)}`)
  if (/<svg[^>]*>\s*<\/svg>/.test(dom)) bad.push('empty svg')
  if (!/<svg/.test(dom)) bad.push('no svg drawn')
  return { bad, total: pos ? Number(pos[2]) : 0, h1: text(dom, /<h1>([^<]+)<\/h1>/) }
}

async function startServer() {
  const vite = spawn(join(ROOT, 'node_modules/.bin/vite'), ['preview', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
  })
  for (let i = 0; i < 50; i++) {
    if (vite.exitCode !== null) break
    try {
      if ((await fetch(BASE)).ok) return vite
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  vite.kill()
  throw new Error(`preview server did not start on port ${PORT} (run npm run build first; is the port taken?)`)
}

mkdirSync(OUT, { recursive: true })

// Phone width: headless Chrome cannot open a 390 px window on every platform, so a same-origin page holds the
// site in a 390 px frame and prints the frame's scroll width next to its own width.
const FRAME = join(ROOT, 'dist', '_frame.html')
writeFileSync(
  FRAME,
  `<!doctype html><body style="margin:0"><iframe id="f" style="width:390px;height:844px;border:0"></iframe><script>
const f = document.getElementById('f')
f.onload = () => setTimeout(() => {
  const d = f.contentDocument.documentElement
  document.body.append('PHONE ' + d.scrollWidth + ' ' + d.clientWidth)
}, 1500)
f.src = '/' + location.hash
</script>`,
)
const server = await startServer()
let failed = 0
let pages = 0
const report = (name, bad) => {
  pages++
  if (bad.length) failed++
  console.log(`${bad.length ? 'FAIL' : 'ok  '} ${name}${bad.length ? '\n     ' + bad.join('\n     ') : ''}`)
}

try {
  for (const ch of CHAPTERS) {
    const first = load(`#/${ch.route}/1`, { shot: `${ch.route}-1.png` })
    const c1 = check(first.dom, first.consoleErrors, ch, 1)
    report(`#/${ch.route}/1`, c1.bad)
    for (let step = 2; step <= c1.total; step++) {
      const p = load(`#/${ch.route}/${step}`)
      report(`#/${ch.route}/${step}`, check(p.dom, p.consoleErrors, ch, step).bad)
    }
    // Wrap-around: Next on the last step leads back to step 1.
    const last = load(`#/${ch.route}/${c1.total}`)
    report(
      `#/${ch.route} last step links to step 1`,
      last.dom.includes(`id="${ch.route}-next" class="btn primary" href="#/${ch.route}/1"`) ? [] : ['Next does not wrap'],
    )
    const ja = load(`#/${ch.route}/1`, { lang: 'ja' })
    const cj = check(ja.dom, ja.consoleErrors, ch, 1)
    if (!/<html lang="ja"/.test(ja.dom)) cj.bad.push('html lang is not ja')
    if (cj.h1 === c1.h1) cj.bad.push('chapter title is not translated')
    report(`#/${ch.route}/1 (ja)`, cj.bad)
  }
  // Overview: one card per chapter, each with a number and a link to step 1.
  for (const lang of ['en', 'ja']) {
    const home = load('', { lang, shot: lang === 'en' ? 'overview.png' : undefined })
    const bad = home.consoleErrors.map((e) => `console: ${e.slice(-160)}`)
    for (const ch of CHAPTERS) {
      const card = home.dom.match(new RegExp(`id="card-${ch.route}" href="#/${ch.route}/1">(.*?)</a>`, 's'))?.[1]
      if (!card) bad.push(`no card for ${ch.route}`)
      else if (!/class="ov-value">[^<]*\d/.test(card)) bad.push(`card ${ch.route} has no number`)
    }
    if (lang === 'ja' && !/<html lang="ja"/.test(home.dom)) bad.push('html lang is not ja')
    report(`overview (${lang})`, bad)
  }
  // No sideways page scroll at 390 px, in both languages (Japanese lines break differently).
  for (const ch of CHAPTERS) {
    for (const lang of ['en', 'ja']) {
      const p = load(`_frame.html#/${ch.route}/1`, { lang, shot: lang === 'en' ? `${ch.route}-1-phone.png` : undefined })
      const m = p.dom.match(/PHONE (\d+) (\d+)/)
      const bad = !m ? ['no width reading'] : Number(m[1]) > Number(m[2]) ? [`page is ${m[1]} px wide in a ${m[2]} px frame`] : []
      report(`#/${ch.route}/1 at 390 px (${lang})`, bad)
    }
  }
  // An unknown route falls back to chapter 1, step 1 instead of a blank page.
  const lost = load('#/nope/99')
  report('#/nope/99 falls back', check(lost.dom, lost.consoleErrors, CHAPTERS[0], 1).bad)
} finally {
  server.kill()
  rmSync(FRAME, { force: true })
}

console.log(`${pages - failed}/${pages} checks passed, screenshots in verify-out/`)
process.exit(failed ? 1 : 0)
