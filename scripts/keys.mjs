// Presses real keys in headless Chrome (DevTools protocol) and exits non-zero when keyboard use is broken:
// arrow keys step through a chapter, arrows inside a slider stay in the slider, and every Tab stop looks
// different focused than blurred. Needs Node 22+ (built-in WebSocket) and a Chrome whose debug port this
// process can reach (Linux CI). Run after `npm run build`.
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 4181
const DEBUG = 9229
const BASE = `http://localhost:${PORT}/`
const CHROME = process.env.CHROME ?? 'google-chrome'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function until(what, probe) {
  for (let i = 0; i < 75; i++) {
    try {
      const v = await probe()
      if (v) return v
    } catch {
      // not up yet
    }
    await sleep(200)
  }
  throw new Error(`${what} did not start`)
}

if (typeof WebSocket === 'undefined') {
  console.error(`keys.mjs needs Node 22+ (built-in WebSocket); this is ${process.version}`)
  process.exit(2)
}

const profile = mkdtempSync(join(tmpdir(), 'keys-'))
const vite = spawn(join(ROOT, 'node_modules/.bin/vite'), ['preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' })
const chrome = spawn(
  CHROME,
  ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${DEBUG}`, `--user-data-dir=${profile}`, '--window-size=1280,1600', 'about:blank'],
  { stdio: 'ignore' },
)

let failed = 0
let checks = 0
const report = (name, bad) => {
  checks++
  if (bad.length) failed++
  console.log(`${bad.length ? 'FAIL' : 'ok  '} ${name}${bad.length ? '\n     ' + bad.join('\n     ') : ''}`)
}

try {
  await until('preview server', async () => (await fetch(BASE)).ok)
  const target = await until('Chrome debug port', async () => {
    const list = await (await fetch(`http://127.0.0.1:${DEBUG}/json/list`)).json()
    return list.find((t) => t.type === 'page')
  })
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.onopen = res
    ws.onerror = rej
  })
  let id = 0
  const pending = new Map()
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
  }
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const n = ++id
      pending.set(n, (msg) => (msg.error ? rej(new Error(`${method}: ${msg.error.message}`)) : res(msg.result)))
      ws.send(JSON.stringify({ id: n, method, params }))
    })
  const js = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value
  const KEYS = { ArrowRight: 39, ArrowLeft: 37, Tab: 9 }
  const press = async (key) => {
    for (const type of ['rawKeyDown', 'keyUp']) {
      await send('Input.dispatchKeyEvent', { type, key, code: key, windowsVirtualKeyCode: KEYS[key], nativeVirtualKeyCode: KEYS[key] })
    }
    await sleep(150)
  }
  const open = async (hash) => {
    // A hash change keeps the old document (and its focus position); pass through a blank page for a fresh one.
    await send('Page.navigate', { url: 'about:blank' })
    await until('blank page', () => js(`location.href === 'about:blank'`))
    await send('Page.navigate', { url: BASE + hash })
    await until(`page ${hash}`, () => js(`!!document.querySelector('h1') && location.hash === '${hash}'`))
    await sleep(300)
  }
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Accessibility.enable')

  // Arrow keys step through a chapter and wrap at both ends.
  await open('#/tick/1')
  const seen = []
  await press('ArrowRight')
  seen.push(await js('location.hash'))
  await press('ArrowLeft')
  seen.push(await js('location.hash'))
  await press('ArrowLeft')
  seen.push(await js('location.hash'))
  const want = ['#/tick/2', '#/tick/1', '#/tick/8']
  report('arrow keys: right, left, left from step 1', seen.join() === want.join() ? [] : [`went ${seen.join(' → ')}, expected ${want.join(' → ')}`])

  // Play walks one step per 2.4 s, lights the next step's node in the diagram, and stops on the last step.
  await open('#/tick/7')
  await js(`document.getElementById('tick-play').click()`)
  await sleep(2800)
  const played = await js(`location.hash + ' ' + document.querySelector('.sd-node[aria-current="step"]')?.id`)
  await sleep(2800)
  const stopped = await js(`location.hash + ' ' + document.getElementById('tick-play').getAttribute('aria-pressed')`)
  report('Play: step 7 → 8, lights the physics node, stops on the last step', [
    ...(played === '#/tick/8 node-tick-physics' ? [] : [`after one beat: ${played}, expected #/tick/8 node-tick-physics`]),
    ...(stopped === '#/tick/8 false' ? [] : [`after two beats: ${stopped}, expected #/tick/8 false`]),
  ])

  // Arrows inside a slider move the slider, not the step, and the readout follows to the sourced number:
  // three steps of command delay must show the exported mean error for delay 3 (src/data/replay.ts).
  const errByDelay = JSON.parse(readFileSync(join(ROOT, 'src/data/replay.ts'), 'utf8').match(/"meanErrByDelay":(\[[^\]]*\])/)[1])
  await open('#/sysid/3')
  const SLIDER = `document.querySelector('[aria-labelledby=replay-h] input[type=range]')`
  const before = await js(`(() => { const r = ${SLIDER}; r.focus(); return r.value })()`)
  for (let i = 0; i < 3; i++) await press('ArrowRight')
  const after = await js(`[location.hash, ${SLIDER}.value, document.querySelector('[aria-labelledby=replay-h] .clip-read b:last-of-type').textContent, document.querySelector('#tag-sysid text')?.textContent]`)
  const bad = []
  if (after[0] !== '#/sysid/3') bad.push(`step changed to ${after[0]}`)
  if (Number(after[1]) !== Number(before) + 3) bad.push(`slider at ${after[1]}, expected ${Number(before) + 3}`)
  const want3 = `${errByDelay[Number(before) + 3].toFixed(2)}°`
  if (after[2] !== want3) bad.push(`readout shows ${after[2]}, expected ${want3}`)
  if (!after[3]?.endsWith(want3)) bad.push(`diagram tag on the sim node shows ${after[3]}, expected … ${want3}`)
  report('arrow keys inside a slider move it, its readout and the diagram tag', bad)

  // A pointer drag to the slider's right end sets the largest delay and its exported error.
  await open('#/sysid/3')
  await js(`${SLIDER}.scrollIntoView({ block: 'center' })`)
  const [left, right, y] = await js(`(() => { const r = ${SLIDER}.getBoundingClientRect(); return [r.left, r.right, r.top + r.height / 2] })()`)
  const mouse = (type, x) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 })
  await mouse('mousePressed', left + 4)
  for (let x = left + 4; x <= right + 20; x += 20) await mouse('mouseMoved', x)
  await mouse('mouseReleased', right + 20)
  await sleep(150)
  const dragged = await js(`[${SLIDER}.value, ${SLIDER}.max, document.querySelector('[aria-labelledby=replay-h] .clip-read b:last-of-type').textContent]`)
  const top = Number(dragged[1])
  const dragBad = []
  if (Number(dragged[0]) !== top) dragBad.push(`slider at ${dragged[0]} after a drag to the end, expected ${top}`)
  if (dragged[2] !== `${errByDelay[top].toFixed(2)}°`) dragBad.push(`readout shows ${dragged[2]}, expected ${errByDelay[top].toFixed(2)}°`)
  report('dragging the slider to its end', dragBad)

  // Every Tab stop must change how something looks: its outline, a ring, a border, or a tooltip.
  const LOOK = `(() => {
    const el = document.activeElement
    const props = ['outline-style', 'outline-width', 'outline-color', 'box-shadow', 'stroke', 'border-color', 'background-color', 'color']
    const nodes = [el, ...el.querySelectorAll('*')]
    const look = nodes.map((n) => {
      const s = getComputedStyle(n)
      const a = getComputedStyle(n, '::after')
      return props.map((p) => s.getPropertyValue(p)).join('|') + '#' + a.content + a.opacity + a.visibility
    })
    return JSON.stringify(look)
  })()`
  const NAME = "el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/ +/).join('.') : '')"
  for (const hash of ['', '#/tick/3', '#/ppo/1', '#/dds/1', '#/sim2real/1', '#/vla/1', '#/sysid/3']) {
    await open(hash || '#/')
    // What a screen reader gets: every control in Chrome's accessibility tree needs a non-empty name.
    const { nodes } = await send('Accessibility.getFullAXTree')
    const CONTROLS = new Set(['link', 'button', 'slider', 'radio', 'checkbox', 'textbox', 'combobox'])
    const nameless = nodes
      .filter((n) => !n.ignored && CONTROLS.has(n.role?.value) && !String(n.name?.value ?? '').trim())
      .map((n) => n.role.value)
    const controls = nodes.filter((n) => !n.ignored && CONTROLS.has(n.role?.value)).length
    report(`accessible names on ${hash || 'the overview'}: ${controls} controls`, [
      ...(controls < 3 ? [`only ${controls} controls in the accessibility tree`] : []),
      ...nameless.map((r) => `a ${r} has no accessible name`),
    ])
    const invisible = []
    let stops = 0
    for (let i = 0; i < 80; i++) {
      await press('Tab')
      // Mark each stop so a repeat ends the walk and focus can be put back after the blurred measurement.
      const name = await js(`(() => { const el = document.activeElement; if (el === document.body || el.dataset.k) return null; el.dataset.k = '${i}'; return ${NAME} })()`)
      if (!name) break
      stops++
      const focused = await js(LOOK)
      await js('document.activeElement.blur()')
      await sleep(50)
      const blurred = await js(LOOK.replace('document.activeElement', `document.querySelector('[data-k="${i}"]')`))
      await js(`document.querySelector('[data-k="${i}"]').focus()`)
      if (focused === blurred) invisible.push(name)
    }
    report(`Tab through ${hash || 'the overview'}: ${stops} stops`, [
      ...(stops < 3 ? [`only ${stops} tab stops`] : []),
      ...invisible.map((n) => `no visible focus on ${n}`),
    ])
  }
  ws.close()
} catch (e) {
  report('keyboard check ran', [String(e.message ?? e)])
} finally {
  chrome.kill()
  vite.kill()
  await sleep(300)
  rmSync(profile, { recursive: true, force: true })
}

console.log(`${checks - failed}/${checks} keyboard checks passed`)
process.exit(failed ? 1 : 0)
