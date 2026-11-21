export interface RouteChapter {
  route: string
  stages: readonly unknown[]
}

// "#/<route>/<n>" with n 1-based. Unknown route or out-of-range n falls back to the first chapter / first stage.
export function parseRoute<C extends RouteChapter>(hash: string, chapters: readonly C[]): { ch: C; index: number } {
  const m = hash.match(/^#\/([a-z0-9]+)\/(\d+)$/)
  const ch = chapters.find((c) => c.route === m?.[1]) ?? chapters[0]
  const n = m ? Number(m[2]) : 1
  return { ch, index: n >= 1 && n <= ch.stages.length ? n - 1 : 0 }
}

// An empty hash is the overview page; every other hash is a chapter step.
export function isHome(hash: string): boolean {
  return hash === '' || hash === '#' || hash === '#/'
}

// Stepping past either end wraps around the ring.
export function wrapIndex(index: number, len: number): number {
  return ((index % len) + len) % len
}
