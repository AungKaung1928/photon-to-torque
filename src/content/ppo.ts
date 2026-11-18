// Chapter 2: one PPO update. Settings and measurements come from the microduck-rl repo
// (ppo.py Config, README step 3). Every number carries a source; derived numbers show their arithmetic.
import type { Source, Stage } from './tick'

const ppoPy: Source = { label: 'microduck-rl ppo.py, Config', ref: 'microduck-rl/ppo.py' }
const step3: Source = { label: 'microduck-rl README, step 3 results', ref: 'microduck-rl/README.md' }
const ppoPaper: Source = { label: 'Schulman et al. 2017, Proximal Policy Optimization Algorithms', ref: 'arXiv:1707.06347' }
const gaePaper: Source = { label: 'Schulman et al. 2015, Generalized Advantage Estimation', ref: 'arXiv:1506.02438' }
const timeLimits: Source = { label: 'Pardo et al. 2018, Time Limits in Reinforcement Learning', ref: 'arXiv:1712.00378' }
const details37: Source = {
  label: 'Huang et al. 2022, The 37 Implementation Details of PPO (ICLR blog track)',
  ref: 'https://iclr-blog-track.github.io/2022/03/25/ppo-implementation-details/',
}
const klBlog: Source = { label: 'Schulman, Approximating KL Divergence', ref: 'http://joschu.net/blog/kl-approx.html' }

export const config = {
  numEnvs: 8,
  numSteps: 256,
  epochs: 5,
  minibatches: 8,
  clip: 0.2,
  gamma: 0.99,
  lambda: 0.95,
  controlHz: 50,
  totalSteps: 50_000_000,
}

const batch = config.numEnvs * config.numSteps
const minibatch = batch / config.minibatches
const horizonSteps = Math.round(1 / (1 - config.gamma))

export const ppo = {
  example: `Microduck balance policy: ${config.numEnvs} simulated robots, ${config.numSteps} steps each, so one update learns from ${batch.toLocaleString('en-US')} transitions. ${config.totalSteps / 1e6}M steps is ${Math.round(config.totalSteps / batch).toLocaleString('en-US')} updates.`,
  sources: [ppoPy],
}

export const steps: Stage[] = [
  {
    id: 'rollout',
    title: 'Collect a rollout',
    what: 'Run the current policy in every environment and store observation, action, log-probability of that action, reward, done flag and value estimate.',
    budget: `${config.numEnvs} envs × ${config.numSteps} steps = ${batch.toLocaleString('en-US')} transitions per update.`,
    failure: 'Stale or mixed data: the stored log-probabilities must come from the policy that acted, or the ratio in step 5 is wrong.',
    sources: [ppoPy, details37],
  },
  {
    id: 'bootstrap',
    title: 'Bootstrap at the time limit',
    what: 'Microduck episodes always end on the step limit, never on a real terminal state. So γ times the value of the final observation is added to the last reward, as if the episode went on.',
    budget: `γ = ${config.gamma} looks about 1 / (1 − γ) = ${horizonSteps} steps ahead, which is ${horizonSteps / config.controlHz} s at ${config.controlHz} Hz.`,
    failure: `Treating the time limit as a terminal state corrupts the value target about ${horizonSteps} steps back. A unit test in the repo shows it on a hand-computed 3-step case.`,
    sources: [step3, timeLimits],
  },
  {
    id: 'gae',
    title: 'Advantage with GAE',
    what: 'Per step, δ = r + γ·V(next) − V(now). The advantage sums the δ terms backwards, each weighted by γλ. The value target is advantage + value.',
    budget: `γ = ${config.gamma}, λ = ${config.lambda}.`,
    failure: 'λ near 1 gives low bias and high variance; λ near 0 trusts a value function that may still be wrong.',
    sources: [gaePaper, ppoPy],
  },
  {
    id: 'minibatch',
    title: 'Shuffle into minibatches',
    what: 'Flatten the rollout, shuffle it, and split it into minibatches. Repeat for several epochs over the same data.',
    budget: `${config.minibatches} minibatches of ${minibatch} × ${config.epochs} epochs = up to ${config.minibatches * config.epochs} gradient steps on one rollout.`,
    failure: 'Too many passes over one rollout push the policy far from the one that collected it. Step 7 is the guard.',
    sources: [ppoPy, details37],
  },
  {
    id: 'ratio',
    title: 'Probability ratio',
    what: 'r = exp(log π_new(a|s) − log π_old(a|s)). r = 1 means the new policy picks that action exactly as often as the old one. Advantages are normalised per minibatch.',
    budget: 'r = 1 exactly on the first minibatch of each update: no gradient step has happened yet, so old and new policy are the same network.',
    failure: 'A ratio far from 1 means the update has already moved a lot on this data.',
    sources: [ppoPaper],
  },
  {
    id: 'clip',
    title: 'Clipped objective',
    what: `Loss = −min(r·A, clip(r, 1 − ε, 1 + ε)·A) with ε = ${config.clip}, plus 0.5 × value loss. Entropy bonus is 0. Gradient norm clipped at 0.5, Adam learning rate 3e-4, annealed linearly to 0.`,
    budget: `ε = ${config.clip}: once r leaves [${1 - config.clip}, ${1 + config.clip}] in the direction that helps, the gradient for that sample is zero.`,
    failure: 'The clip zeroes the gradient only for samples already past the band. It does not cap how far the whole policy moves; many epochs can still drift.',
    sources: [ppoPaper, ppoPy],
  },
  {
    id: 'diagnose',
    title: 'Diagnose and stop early',
    what: 'Log clip fraction (share of samples outside the band), approximate KL between old and new policy, and the policy σ. With a KL target, the epoch loop stops when an epoch’s mean KL passes it.',
    budget: 'Target KL 0.02 in chunk 2. Chunk 1 ran without it.',
    failure: 'Without the stop, chunk 1’s median clip fraction rose from 0.48 (first 5M steps) to 0.73 (last 5M) and σ shrank from 0.61 to 0.08, while the return stayed flat.',
    sources: [step3, klBlog],
  },
]

export interface DiagRow {
  metric: string
  chunk1: string
  chunk2: string
}

// microduck-rl README, step 3 results, chunk 1 and chunk 2. Same 5 evaluation seeds, 100 episodes each.
export const diagnostics = {
  rows: [
    { metric: 'Mean approximate KL per update', chunk1: '0.53', chunk2: '0.032' },
    { metric: 'Largest approximate KL', chunk1: '173', chunk2: '0.24' },
    { metric: 'Mean clip fraction', chunk1: '0.66', chunk2: '0.28' },
    { metric: 'Policy σ at the end', chunk1: '0.08', chunk2: '0.08 to 0.09' },
    { metric: 'Evaluation return (± over 5 seeds)', chunk1: '332.6 ± 5.1', chunk2: '344.8 ± 2.9' },
  ] as DiagRow[],
  labels: { chunk1: 'Chunk 1: 0 to 25M steps, no KL stop', chunk2: 'Chunk 2: 25M to 50M steps, target KL 0.02' },
  caveat:
    'Chunk 2 has two confounds. The learning rate anneals from half to zero over the same steps, and there is no chunk 2 without the KL stop to compare against. The claim is that chunk 2 improved with the stop in place, not that the stop caused all of it.',
  sources: [step3],
}
