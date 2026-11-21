import { describe, expect, it } from 'vitest'
import { NOMINAL, spread } from '../data/spread'
import { covered } from './coverage'

// Ranges from so-arm100-sim so_arm100_sim/dr.py (commit f0e0fda); same check as its tests/test_dr.py.
const KP: [number, number] = [0.6, 1.4]

describe('DR range coverage of the real per-episode fits', () => {
  it('has 20 episodes', () => {
    expect(spread).toHaveLength(20)
  })

  it('default DRConfig (frictionloss 0.5-2.0x) covers none', () => {
    expect(covered(spread, NOMINAL, KP, [0.5, 2.0])).toBe(0)
  })

  it('DRConfig.real_informed (frictionloss 0.5-3.5x) covers all', () => {
    expect(covered(spread, NOMINAL, KP, [0.5, 3.5])).toBe(20)
  })

  it('a top of 2.5x covers only part of the spread', () => {
    const n = covered(spread, NOMINAL, KP, [0.5, 2.5])
    expect(n).toBeGreaterThan(0)
    expect(n).toBeLessThan(20)
  })

  it('a fit exactly on a range edge counts as covered (both ends inclusive)', () => {
    const edge = { kp: NOMINAL.kp * 0.5, frictionloss: NOMINAL.frictionloss * 2.0 }
    expect(covered([edge], NOMINAL, [0.5, 1.4], [0.5, 2.0])).toBe(1)
    expect(covered([edge], NOMINAL, [0.6, 1.4], [0.5, 2.0])).toBe(0)
  })
})
