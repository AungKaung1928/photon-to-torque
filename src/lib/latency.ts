// Share of one control period a call uses (1 = the whole period).
export function periodShare(ms: number, periodMs: number): number {
  return ms / periodMs
}

// Position of ms on a log axis spanning [minMs, maxMs], 0..1.
export function logPos(ms: number, minMs: number, maxMs: number): number {
  return (Math.log10(ms) - Math.log10(minMs)) / (Math.log10(maxMs) - Math.log10(minMs))
}
