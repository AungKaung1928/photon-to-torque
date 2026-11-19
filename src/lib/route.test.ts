import { describe, expect, it } from 'vitest'
import { parseRoute, wrapIndex } from './route'

const chapters = [
  { route: 'tick', stages: [1, 2, 3, 4, 5, 6, 7, 8] },
  { route: 'ppo', stages: [1, 2, 3, 4, 5, 6, 7] },
]

describe('parseRoute', () => {
  it('reads chapter and 1-based stage', () => {
    expect(parseRoute('#/ppo/3', chapters)).toEqual({ ch: chapters[1], index: 2 })
    expect(parseRoute('#/tick/8', chapters)).toEqual({ ch: chapters[0], index: 7 })
  })

  it('falls back to chapter 1, stage 1 for empty or malformed hashes', () => {
    for (const h of ['', '#', '#/', '#/tick', '#/tick/x', '#tick/2', '#/TICK/2', '#/tick/2/extra'])
      expect(parseRoute(h, chapters)).toEqual({ ch: chapters[0], index: 0 })
  })

  it('keeps a known chapter but resets an out-of-range stage', () => {
    expect(parseRoute('#/ppo/0', chapters)).toEqual({ ch: chapters[1], index: 0 })
    expect(parseRoute('#/ppo/8', chapters)).toEqual({ ch: chapters[1], index: 0 })
  })

  it('unknown chapter goes to chapter 1 and checks the stage against it', () => {
    expect(parseRoute('#/nope/4', chapters)).toEqual({ ch: chapters[0], index: 3 })
  })
})

describe('wrapIndex', () => {
  it('wraps both ends of the ring', () => {
    expect(wrapIndex(8, 8)).toBe(0)
    expect(wrapIndex(-1, 8)).toBe(7)
    expect(wrapIndex(3, 8)).toBe(3)
    expect(wrapIndex(-9, 8)).toBe(7)
  })
})
