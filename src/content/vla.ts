// Chapter 5: one action chunk, from camera frame to joint targets. Simulation only.
// Numbers: so-arm100-il README (ACTLite against single-step cloning) and so-arm100-vla README (SmolVLA-base
// timed on CPU, measured 2026-09-24). Definitions: the ACT paper and LeRobot 0.6.1's ACT implementation.
import type { Source, Stage } from './tick'

const il: Source = { label: 'so-arm100-il README, ACTLite against single-step cloning', ref: 'so-arm100-il/README.md' }
const vlaReadme: Source = { label: 'so-arm100-vla README, SmolVLA-base timed on CPU', ref: 'so-arm100-vla/README.md' }
const vlaEdge: Source = { label: 'so-arm100-vla README, edge section: 1 camera, three backends interleaved', ref: 'so-arm100-vla/README.md' }
const act: Source = { label: 'Zhao et al. 2023, ACT, Algorithm 2', ref: 'arXiv:2304.13705' }
const lerobotAct: Source = {
  label: 'LeRobot 0.6.1, ACTTemporalEnsembler and ACT config defaults',
  ref: 'lerobot/policies/act/modeling_act.py',
}

export const vla = {
  example:
    'Running example: a simulated SO-ARM100 arm lifting a cube at 20 Hz, cloned from 200 demonstrations of a scripted expert. No number here comes from hardware.',
}

export const steps: Stage[] = [
  {
    id: 'observe',
    title: 'Observe',
    what: 'Each control step, the policy gets one camera image and the arm’s joint state.',
    budget: '20 Hz control: one step every 50 ms. A 15-d joint state plus one rendered image.',
    failure: 'Joint state alone cannot locate the cube. The state-only policy lifts 0.03 ± 0.01 at 200 demonstrations.',
    sources: [il],
  },
  {
    id: 'encode',
    title: 'Encode into tokens',
    what: 'A small CNN turns the image into spatial soft-argmax keypoints. The keypoints and the joint state become tokens for a transformer encoder.',
    budget: 'ACTLite: keypoint tokens plus one joint-state token, 2-layer encoder. ACT without its CVAE.',
    failure: 'Small objects are a perception problem. On a 9 mm cube ACTLite lifts 0.38 ± 0.05; the expert, which sees the true pose, lifts 0.73 ± 0.05.',
    sources: [il],
  },
  {
    id: 'decode',
    title: 'Decode a chunk',
    what: 'The decoder answers k learned queries at once, one per future step. The output is k joint-target vectors, not one.',
    budget: 'ACTLite: k = 20, which is 1 s of motion at 20 Hz. LeRobot’s ACT default: k = 100.',
    failure: 'A single-step policy decides again every 50 ms, so small errors compound. Its worst-joint error against the expert grows from 0.4–0.5 rad in the first 10 steps to 1.1–4.6 rad by step 60–150.',
    sources: [il, act, lerobotAct],
  },
  {
    id: 'loss',
    title: 'Train with L1',
    what: 'Training compares the whole predicted chunk with the next k demonstrated actions, using L1 on normalised actions. Entries past the end of an episode are masked.',
    budget: 'L1 fits the conditional median, which is one of the demonstrated modes. ACT trains with it too.',
    failure: 'MSE fits the mean. If the demonstrations grasp at two valid angles, the mean is a third angle that grasps nothing.',
    sources: [il, act],
  },
  {
    id: 'ensemble',
    title: 'Ensemble overlapping chunks',
    what: 'With temporal ensembling the policy runs every step, so up to k chunks hold a prediction for the current step. They are averaged with weights wᵢ = exp(−m·i), where i = 0 is the oldest prediction.',
    budget: 'm = 0.01, the value in the original ACT work: older predictions weigh slightly more.',
    failure: 'Ensembling needs one inference per control step. A model slower than 50 ms cannot ensemble at 20 Hz and has to run each chunk open loop.',
    sources: [lerobotAct, act],
  },
  {
    id: 'timing',
    title: 'Fit inference into the chunk',
    what: 'Without ensembling, the arm runs one chunk open loop and then needs the next. If inference takes longer than the chunk lasts, the arm stops and waits.',
    budget: 'SmolVLA-base: 3.16 s per 50-step chunk on 8 CPU threads (p50, n = 130). The chunk lasts 2.5 s at 20 Hz.',
    failure: 'Run one after the other, the arm would wait about 3 s for every 2.5 s of motion. On this CPU it is not a real-time controller, whatever its success rate. Measured fixes, 1 camera, one process: PyTorch 1,848 ms, OpenVINO FP32 1,398 ms, OpenVINO with INT8 weights 733 ms p50 (937 ms p99). Only INT8 leaves real margin, and its effect on success is not measured yet.',
    sources: [vlaReadme, vlaEdge],
  },
  {
    id: 'evaluate',
    title: 'Evaluate on the same bench',
    what: 'Compare the chunked and the single-step policy on the same demonstrations, encoder family, loss and evaluation seeds. Only the chunk differs.',
    budget: '200 demonstrations: ACTLite 0.77 ± 0.05, single step 0.05 ± 0.02, scripted expert 0.93 ± 0.02. 100 episodes × 5 evaluation seeds.',
    failure: 'The 0.77 is one training seed. Six training seeds at 200 demonstrations split into 0.92, 0.82, 0.76 and 0.24, 0.18, 0.12.',
    sources: [il],
  },
]

// so-arm100-il README, scaling table: lift success against demonstrations, 20 epochs.
// ± is the standard deviation over training seeds (3 for image, 6 for ACT), 50 evaluation episodes each.
export const scaling = {
  rows: [
    { demos: 10, image: [0.01, 0.01], act: [0.08, 0.1] },
    { demos: 25, image: [0.03, 0.01], act: [0.24, 0.19] },
    { demos: 50, image: [0.02, 0.03], act: [0.3, 0.28] },
    { demos: 100, image: [0.04, 0.02], act: [0.41, 0.29] },
    { demos: 200, image: [0.05, 0.06], act: [0.51, 0.36] },
  ] as { demos: number; image: [number, number]; act: [number, number] }[],
  protocol:
    'Lift success, 20 epochs, 50 evaluation episodes per training seed; ± is the standard deviation over training seeds (3 single-step, 6 chunked).',
  caveat:
    'The single-step policy’s validation L1 fell fivefold from 10 to 200 demonstrations (0.181 to 0.036) while its success stayed between 0.01 and 0.05. The chunked mean had not levelled off at 200.',
  sources: [il],
}

// so-arm100-vla README: SmolVLA-base, one 50-step chunk on 8 CPU threads.
export const smolvla = { inferenceS: 3.16, p90S: 3.3, n: 130, chunk: 50, controlHz: 20, sources: [vlaReadme] }
