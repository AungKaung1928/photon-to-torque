import { describe, expect, it } from 'vitest'
import css from './index.css?raw'

// WCAG 2.x contrast ratio between two #rrggbb colours (https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio).
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// The custom properties set in the first CSS block whose selector matches exactly.
function tokens(css: string, selector: string): Record<string, string> {
  const at = css.indexOf(`${selector} {`)
  if (at < 0) return {}
  const body = css.slice(at, css.indexOf('}', at))
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]))
}

describe('contrast', () => {
  it('matches the WCAG extremes', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21)
    expect(contrast('#777777', '#777777')).toBeCloseTo(1)
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21)
  })
})

describe('tokens', () => {
  it('reads hex custom properties of one block', () => {
    expect(tokens(':root {\n  --a: #010203;\n  --b: 1px;\n}', ':root')).toEqual({ a: '#010203' })
    expect(tokens(':root {}', '.x')).toEqual({})
  })
})

// Text colours against every background they sit on must reach WCAG AA for body text (4.5:1), in both themes.
describe.each([':root', ":root[data-theme='dark']"])('theme %s', (selector) => {
  const t = { ...tokens(css, ':root'), ...tokens(css, selector) }
  it.each(['ink', 'ink-2', 'ink-3', 'accent'])('%s reaches 4.5:1 on bg, ground and surface', (fg) => {
    for (const bg of ['bg', 'ground', 'surface']) expect(contrast(t[fg], t[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
  })
  it('the focus ring reaches 3:1 on bg, ground and surface (WCAG 1.4.11)', () => {
    for (const bg of ['bg', 'ground', 'surface']) expect(contrast(t.focus, t[bg]), `focus on ${bg}`).toBeGreaterThanOrEqual(3)
  })
  it('on-accent text reaches 4.5:1 on the accent', () => {
    expect(contrast(t['on-accent'], t.accent)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('dark theme', () => {
  it('the system-dark block and the data-theme dark block set the same colours', () => {
    expect(tokens(css, ":root:not([data-theme='light'])")).toEqual(tokens(css, ":root[data-theme='dark']"))
  })
})

// All motion in the app is CSS (no JS animation, no smooth scrolling), so one rule can switch it off.
describe('reduced motion', () => {
  it('turns off every transition and animation', () => {
    const at = css.indexOf('@media (prefers-reduced-motion: reduce)')
    expect(at).toBeGreaterThan(-1)
    const block = css.slice(at, css.indexOf('}', at))
    expect(block).toMatch(/\*,\s*\*::before,\s*\*::after\s*\{/)
    expect(block).toContain('transition: none !important')
    expect(block).toContain('animation: none !important')
  })
  it('no smooth scrolling or JS animation that would ignore it', () => {
    expect(css).not.toMatch(/scroll-behavior:\s*smooth/)
    const code = import.meta.glob<string>(['./**/*.tsx', './**/*.ts', '!./**/*.test.ts'], { query: '?raw', import: 'default', eager: true })
    expect(Object.keys(code).length).toBeGreaterThan(10)
    for (const [file, text] of Object.entries(code)) expect(text, file).not.toMatch(/behavior:\s*'smooth'|requestAnimationFrame|\.animate\(/)
  })
})

// System diagram: node label (--k-<kind>) on its tint, and the lit node's label (--k-on-ink) on the solid hue.
describe('diagram node colours', () => {
  const kinds = ['sense', 'compute', 'bus', 'act', 'world', 'check']
  for (const [theme, sel] of [
    ['light', ':root'],
    ['dark', ":root[data-theme='dark']"],
  ]) {
    const t = tokens(css, sel)
    for (const k of kinds) {
      it(`${theme} ${k}: label on tint and lit label on hue reach 4.5:1`, () => {
        expect(contrast(t[`k-${k}`], t[`k-${k}-bg`])).toBeGreaterThanOrEqual(4.5)
        expect(contrast(t['k-on-ink'], t[`k-${k}`])).toBeGreaterThanOrEqual(4.5)
      })
    }
  }
})
