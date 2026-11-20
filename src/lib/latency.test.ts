import { describe, expect, it } from 'vitest'
import { latency } from '../data/latency'
import { logPos, periodShare } from './latency'

describe('latency rows', () => {
  it('every row has a source and p99 >= p50 where recorded', () => {
    for (const r of latency) {
      expect(r.source).toMatch(/README:\d+/)
      if (r.p99Ms !== null) expect(r.p99Ms).toBeGreaterThanOrEqual(r.p50Ms)
    }
  })
  it('spans more than five decades', () => {
    const ms = latency.map((r) => r.p50Ms)
    expect(Math.log10(Math.max(...ms) / Math.min(...ms))).toBeGreaterThan(5)
  })
})

describe('periodShare', () => {
  it('matches the microduck README: p99 0.033 ms is 0.2 % of 20 ms', () => {
    expect(periodShare(0.033, 20) * 100).toBeCloseTo(0.165, 3)
  })
  it('SmolVLA FP32 chunk is about 60 control periods', () => {
    expect(periodShare(3008, 50)).toBeCloseTo(60.16, 2)
  })
})

describe('logPos', () => {
  it('maps the ends to 0 and 1 and a decade midpoint to 0.5', () => {
    expect(logPos(0.001, 0.001, 1000)).toBe(0)
    expect(logPos(1000, 0.001, 1000)).toBe(1)
    expect(logPos(1, 0.001, 1000)).toBeCloseTo(0.5, 10)
  })
})
