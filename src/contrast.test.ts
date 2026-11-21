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
  it('on-accent text reaches 4.5:1 on the accent', () => {
    expect(contrast(t['on-accent'], t.accent)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('dark theme', () => {
  it('the system-dark block and the data-theme dark block set the same colours', () => {
    expect(tokens(css, ":root:not([data-theme='light'])")).toEqual(tokens(css, ":root[data-theme='dark']"))
  })
})
