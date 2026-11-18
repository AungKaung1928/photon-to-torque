// Chapter 4: measuring a sim-to-real gap. Simulation only: both robots exist here as models.
// Numbers: so-arm100-rl README (held-out gap table, measured 2026-09-24) and microduck-rl README
// (step 4, measured 2026-09-23). Each claim keeps the caveats its README states.
import type { Source, Stage } from './tick'

const soArm: Source = { label: 'so-arm100-rl README, domain randomisation and the held-out gap', ref: 'so-arm100-rl/README.md' }
const duck: Source = { label: 'microduck-rl README, step 4', ref: 'microduck-rl/README.md' }
const tobin: Source = { label: 'Tobin et al. 2017, Domain Randomization', ref: 'arXiv:1703.06907' }
const hwangbo: Source = { label: 'Hwangbo et al. 2019, Science Robotics', ref: 'arXiv:1901.08652' }

export const sim2real = {
  example:
    'Two simulated robots: a 5-joint arm lifting a cube (so-arm100-rl) and a 14-joint biped keeping its balance (microduck-rl). Neither number here comes from hardware.',
}

export const steps: Stage[] = [
  {
    id: 'name',
    title: 'Name what differs',
    what: 'List the physics the simulator may get wrong: actuator dynamics, latency, friction, mass, sensor noise, contact geometry. Each item becomes a factor you can randomize or hold out.',
    budget: 'Biped: servo damping, friction loss, armature, gain and force limit; mass and inertia ×0.85–1.15; floor friction ×0.6–1.2; 0–2 steps (0–40 ms) of action latency; initial-state and sensor noise.',
    failure: 'An effect that is not modelled is in no column. For the arm that means backlash, cable friction and camera latency.',
    sources: [duck, soArm, hwangbo],
  },
  {
    id: 'ranges',
    title: 'Take ranges from evidence',
    what: 'Set each range from measured or fitted values, not from taste. The biped’s servo ranges span the minimum to maximum of four fitted actuator classes.',
    budget: 'Joint friction loss differs 6.7× across those fitted classes; the other servo parameters differ under 1.5×.',
    failure: 'A range picked by feel can miss the real value or be so wide that the task gets harder than it needs to be.',
    sources: [duck, tobin],
  },
  {
    id: 'holdout',
    title: 'Hold out physics',
    what: 'Evaluate on physics the policy never trained on. For the arm, every evaluation cell is outside the training range in at least one factor. The biped is tested on two other models of the same robot.',
    budget: 'Arm: 6 held-out cells plus 1 in-range cell. Biped: training model plus 2 held-out models (backlash, rollers).',
    failure: 'Testing only inside the training range measures fit, not transfer. A held-out cell can also be inert: the arm’s low-friction cell equals nominal by construction.',
    sources: [soArm, duck],
  },
  {
    id: 'control',
    title: 'Change one thing',
    what: 'Train the randomized and the nominal policy with the same config, seed and learning-rate schedule. Only the randomization flag should differ.',
    budget: 'Biped: both runs 25M of a 50M schedule, so the learning rate anneals the same way.',
    failure: 'The arm’s DR policy trained 10M steps longer (30M against 20M). The 30M nominal control has not been run, so part of its gain may be training length.',
    sources: [duck, soArm],
  },
  {
    id: 'evaluate',
    title: 'Evaluate on fixed seeds',
    what: 'Run every policy on every cell with the same evaluation seeds and deterministic actions.',
    budget: '100 episodes × 5 seeds per cell; ± is the standard deviation over the 5 evaluation seeds.',
    failure: 'The ± covers evaluation seeds only. With one training seed per policy, it says nothing about how a second training run would land.',
    sources: [soArm, duck],
  },
  {
    id: 'metric',
    title: 'Read the right metric',
    what: 'Pick the metric that matches the task before reading the table, and check it cannot be met by a behaviour you do not want.',
    budget: 'Biped on its training model: survival 1.00 for DR against 0.74 nominal, but upright time 0.28 against 0.47.',
    failure: 'Survival only asks whether the trunk stays above 4 cm. The DR biped learned to brace in a low, tilted crouch that never counts as a fall.',
    sources: [duck],
  },
  {
    id: 'report',
    title: 'Report what it does not settle',
    what: 'State the seed count, the training budget and the confounds next to the result, then design the next experiment from them.',
    budget: 'Both projects: one training seed per policy, simulation only.',
    failure: 'Reading a simulated held-out gain as a hardware result. A smaller simulated gap is evidence about these factors only.',
    sources: [soArm, duck],
  },
]

export interface ArmCell {
  name: string
  note?: string
  nominal: [number, number] // mean, sd over evaluation seeds
  dr: [number, number]
}

// so-arm100-rl README, held-out gap table (compare_gap.py). Lift task.
export const armGap = {
  cells: [
    { name: 'nominal', nominal: [0.998, 0.004], dr: [0.998, 0.004] },
    { name: 'heavy (mass 3×)', nominal: [0.998, 0.004], dr: [0.988, 0.008] },
    { name: 'slippery (friction 0.3×)', note: 'inert: equals nominal by construction', nominal: [0.998, 0.004], dr: [0.998, 0.004] },
    { name: 'weak (servo gain 0.45×)', nominal: [0.982, 0.013], dr: [1.0, 0.0] },
    { name: 'laggy (3 steps)', nominal: [0.458, 0.052], dr: [0.76, 0.03] },
    { name: 'noisy (3× obs noise)', nominal: [0.956, 0.017], dr: [0.948, 0.024] },
    { name: 'small cube (9 mm)', nominal: [0.878, 0.051], dr: [0.96, 0.02] },
    { name: 'dr (in-range)', note: 'inside the training range', nominal: [0.888, 0.038], dr: [0.958, 0.013] },
  ] as ArmCell[],
  meanDrop: { nominal: 0.12, dr: 0.056, cells: 6 },
  protocol:
    '100 episodes × 5 evaluation seeds per cell; ± is the standard deviation over seeds. Mean drop is over the 6 held-out cells, excluding nominal and the in-range dr cell.',
  caveat:
    'One training seed per policy, and the DR policy trained 10M steps longer (30M against 20M) without the matching nominal control. Training randomized 0 to 2 steps of latency, so the laggy cell is one step outside it.',
  sources: [soArm],
}

// microduck-rl README, step 4 table: both policies on the training model (groundcontact).
export const duckTrap = {
  metrics: [
    { name: 'Survival: trunk above 4 cm', nominal: 0.74, dr: 1.0 },
    { name: 'Upright: trunk tilt within about 26°', nominal: 0.47, dr: 0.28 },
  ],
  height: { nominal: 0.058, dr: 0.091, standing: 0.12 },
  // Held-out rollers model, return of 500: nominal 373.6 (+41.1 vs its training model), DR 147.3 (−164.9).
  rollers: { nominal: 373.6, dr: 147.3, max: 500 },
  caveat:
    'Both policies are 25M of 50M steps, one training seed each. Evaluation: 100 episodes × 5 seeds, the same seeds in every cell. Why the crouch fails on the rollers model is a hypothesis in the README, not a measurement.',
  sources: [duck],
}
