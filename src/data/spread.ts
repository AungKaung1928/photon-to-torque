// Servo refitted on each real SO-100 episode alone (lerobot/svla_so100_pickplace eps 10-29).
// Copied from so-arm100-sim runs/real2sim_spread.json (scripts/real2sim_spread.py, commit d0c252d).
// Nominal values of the MuJoCo model: kp 50, joint frictionloss 0.1.
export const NOMINAL = { kp: 50, frictionloss: 0.1 }

export interface EpisodeFit {
  kp: number
  frictionloss: number
}

export const spread: EpisodeFit[] = [
  { kp: 33.2753, frictionloss: 0.222 },
  { kp: 34.9915, frictionloss: 0.2274 },
  { kp: 32.502, frictionloss: 0.2171 },
  { kp: 33.233, frictionloss: 0.2243 },
  { kp: 33.7701, frictionloss: 0.2128 },
  { kp: 34.8593, frictionloss: 0.2338 },
  { kp: 32.1715, frictionloss: 0.2323 },
  { kp: 34.1248, frictionloss: 0.2361 },
  { kp: 32.6538, frictionloss: 0.2402 },
  { kp: 35.8989, frictionloss: 0.2464 },
  { kp: 37.0466, frictionloss: 0.2697 },
  { kp: 38.5439, frictionloss: 0.2466 },
  { kp: 40.1441, frictionloss: 0.2957 },
  { kp: 35.5078, frictionloss: 0.2672 },
  { kp: 38.5053, frictionloss: 0.2733 },
  { kp: 36.3242, frictionloss: 0.2483 },
  { kp: 38.5379, frictionloss: 0.2617 },
  { kp: 37.2652, frictionloss: 0.2473 },
  { kp: 38.543, frictionloss: 0.2473 },
  { kp: 44.6435, frictionloss: 0.2941 },
]
