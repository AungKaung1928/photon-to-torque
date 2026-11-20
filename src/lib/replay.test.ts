import { describe, expect, it } from 'vitest'
import { extent, linePath, meanAbsErr } from './replay'
import { replay } from '../data/replay'

describe('replay helpers', () => {
  it('meanAbsErr', () => {
    expect(meanAbsErr([0, 1, 2], [1, 1, 0])).toBeCloseTo(1)
    expect(meanAbsErr([], [])).toBe(0)
  })
  it('linePath and extent', () => {
    expect(linePath([0, 2], (i) => i * 10, (v) => v)).toBe('M0.0 0.0L10.0 2.0')
    expect(extent([[3, -1], [7]])).toEqual([-1, 7])
  })
})

describe('replay data (so-arm100-sim export, episode 40)', () => {
  const T = replay.real[0].length
  it('every series has the same length', () => {
    for (const j of [0, 1]) {
      expect(replay.command[j]).toHaveLength(T)
      for (const d of replay.simByDelay) expect(d[j]).toHaveLength(T)
    }
  })
  it('adding command delay makes the sim worse, as the chapter says', () => {
    const e = replay.meanErrByDelay
    for (let d = 1; d < e.length; d++) expect(e[d]).toBeGreaterThan(e[d - 1])
    for (const j of [0, 1])
      expect(meanAbsErr(replay.simByDelay[3][j], replay.real[j])).toBeGreaterThan(
        meanAbsErr(replay.simByDelay[0][j], replay.real[j]),
      )
  })
})
