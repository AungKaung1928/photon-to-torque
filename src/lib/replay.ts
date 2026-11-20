// Pure helpers for the chapter 6 replay plot (kept out of the component so they can be tested).

export function meanAbsErr(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length)
  let s = 0
  for (let i = 0; i < n; i++) s += Math.abs(a[i] - b[i])
  return n ? s / n : 0
}

export function linePath(v: readonly number[], x: (i: number) => number, y: (v: number) => number): string {
  return v.map((u, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(u).toFixed(1)}`).join('')
}

export function extent(series: readonly (readonly number[])[]): [number, number] {
  let lo = Infinity
  let hi = -Infinity
  for (const s of series) for (const v of s) {
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  return [lo, hi]
}
