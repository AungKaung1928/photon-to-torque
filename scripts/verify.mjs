// Drives the built site in headless Chrome and exits non-zero when a route is broken.
// Feature map: docs/FEATURES.md. Run through scripts/verify.sh (it builds first).
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env.VERIFY_PORT ?? 4179)
const BASE = `http://localhost:${PORT}/`
const OUT = join(ROOT, 'verify-out')

// One row per chapter: its route and the panel headings a visitor must see below the step card.
const CHAPTERS = [
  { route: 'tick', panels: ['budget-h', 'latency-h'] },
  { route: 'ppo', panels: ['clip-h', 'diag-h'] },
  { route: 'dds', panels: ['qos-h', 'profiles-h'] },
  { route: 'sim2real', panels: ['holdout-h', 'trap-h'] },
  { route: 'vla', panels: ['scaling-h', 'timing-h', 'ladder-h'] },
  { route: 'sysid', panels: ['replay-h', 'fit-h', 'spread-h'] },
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
  if (!dom.includes(`id="${ch.route}-next"`)) bad.push('no Next button')
  for (const id of ch.panels) if (!dom.includes(`id="${id}"`)) bad.push(`panel ${id} missing`)
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
  // An unknown route falls back to chapter 1, step 1 instead of a blank page.
  const lost = load('#/nope/99')
  report('#/nope/99 falls back', check(lost.dom, lost.consoleErrors, CHAPTERS[0], 1).bad)
} finally {
  server.kill()
}

console.log(`${pages - failed}/${pages} checks passed, screenshots in verify-out/`)
process.exit(failed ? 1 : 0)
