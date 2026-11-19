import { describe, expect, it } from 'vitest'
import { CONTENT } from './index'

// The Japanese bundle may change words only. Numbers, null budgets, ids, refs, booleans and shapes must match.
function skeleton(v: unknown, key = ''): unknown {
  if (typeof v === 'string') return key === 'id' || key === 'ref' ? v : 'text'
  if (typeof v === 'function') return 'fn'
  if (Array.isArray(v)) return v.map((x) => skeleton(x))
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, skeleton(x, k)]))
  return v
}

describe('EN/JA content parity', () => {
  for (const name of Object.keys(CONTENT.en) as (keyof typeof CONTENT.en)[]) {
    it(`${name}: same numbers, ids, refs and shapes`, () => {
      expect(skeleton(CONTENT.ja[name])).toEqual(skeleton(CONTENT.en[name]))
    })
  }
})
