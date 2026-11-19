// PPO clipped surrogate for one sample with probability ratio r, advantage a, clip range eps (arXiv 1707.06347, eq. 7).
export function clipObjective(r: number, a: number, eps: number): number {
  const clipped = Math.min(Math.max(r, 1 - eps), 1 + eps)
  return Math.min(r * a, clipped * a)
}

// d objective / d r: zero where the clipped branch is the active minimum.
export function clipGradient(r: number, a: number, eps: number): number {
  if (a > 0) return r > 1 + eps ? 0 : a
  return r < 1 - eps ? 0 : a
}
