import { describe, expect, it } from 'vitest'
import { clipGradient, clipObjective } from './clip'

const EPS = 0.2 // microduck-rl ppo.py Config.clip

describe('PPO clipped objective (arXiv 1707.06347 eq. 7)', () => {
  it('positive advantage: capped above 1 + eps, unclipped below', () => {
    expect(clipObjective(1.5, 1, EPS)).toBeCloseTo(1.2)
    expect(clipGradient(1.5, 1, EPS)).toBe(0)
    expect(clipObjective(0.5, 1, EPS)).toBeCloseTo(0.5)
    expect(clipGradient(0.5, 1, EPS)).toBe(1)
  })

  it('negative advantage: capped below 1 - eps, unclipped above', () => {
    expect(clipObjective(0.5, -1, EPS)).toBeCloseTo(-0.8)
    expect(clipGradient(0.5, -1, EPS)).toBe(0)
    expect(clipObjective(1.5, -1, EPS)).toBeCloseTo(-1.5)
    expect(clipGradient(1.5, -1, EPS)).toBe(-1)
  })

  it('inside the band the objective is r * A', () => {
    for (const r of [0.85, 1, 1.15]) for (const a of [-2, 0.5, 3]) expect(clipObjective(r, a, EPS)).toBeCloseTo(r * a)
  })

  it('gradient matches a finite difference away from the kinks', () => {
    const h = 1e-6
    for (const a of [-1.5, -0.3, 0.4, 2])
      for (let r = 0.05; r < 2; r += 0.1) {
        if (Math.abs(r - (1 - EPS)) < 1e-3 || Math.abs(r - (1 + EPS)) < 1e-3) continue
        const fd = (clipObjective(r + h, a, EPS) - clipObjective(r - h, a, EPS)) / (2 * h)
        expect(clipGradient(r, a, EPS)).toBeCloseTo(fd, 5)
      }
  })
})
