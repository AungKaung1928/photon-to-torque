import type { EpisodeFit } from '../data/spread'

export type Range = [number, number]

/** Episodes whose fit, as a factor of nominal, lies inside both DR ranges. */
export function covered(
  fits: EpisodeFit[],
  nominal: EpisodeFit,
  kp: Range,
  frictionloss: Range,
): number {
  const inside = (v: number, [lo, hi]: Range) => lo <= v && v <= hi
  return fits.filter(
    (e) => inside(e.kp / nominal.kp, kp) && inside(e.frictionloss / nominal.frictionloss, frictionloss),
  ).length
}
