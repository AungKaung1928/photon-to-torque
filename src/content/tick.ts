// Chapter 1: one control tick. Every number must carry a source; otherwise budget is null ("not measured").

export interface Source {
  label: string
  ref: string // URL, arXiv ID, or repo + README section
}

export interface Stage {
  id: string
  title: string
  what: string
  budget: string | null
  failure: string
  sources: Source[]
}

const microduckReadme: Source = { label: 'microduck-rl README', ref: 'microduck-rl/README.md' }
const soArmReadme: Source = { label: 'so-arm100-rl README, held-out gap table', ref: 'so-arm100-rl/README.md' }

export const tick = {
  example: 'Microduck walking policy: 50 Hz policy over 500 Hz physics, so one tick is 20 ms and 10 physics steps.',
  sources: [microduckReadme],
}

// Measured timing for the running example (microduck-rl README: env step section, ONNX export table).
export const timing = {
  tickMs: 20,
  physicsStepMs: 2,
  policyP50Ms: 0.01,
  policyP99Ms: 0.033,
  policyNote: 'ONNX Runtime, 1 intra-op thread, batch 1, CPU.',
  sources: [microduckReadme],
}

export interface GapCell {
  success: number
  sd: number
}

export interface GapRow {
  physics: string
  nominalTrained: GapCell
  drFineTuned: GapCell
}

// so-arm100-rl, lift task, compare_gap.py. Measured 2026-09-24.
export const latencyGap = {
  rows: [
    { physics: 'Nominal physics', nominalTrained: { success: 0.998, sd: 0.004 }, drFineTuned: { success: 0.998, sd: 0.004 } },
    { physics: '3 steps of action latency', nominalTrained: { success: 0.458, sd: 0.052 }, drFineTuned: { success: 0.76, sd: 0.03 } },
  ] as GapRow[],
  protocol: '100 episodes × 5 evaluation seeds per cell; ± is the standard deviation over evaluation seeds.',
  caveat:
    'One training seed per policy. The DR policy also trained 10 M steps longer, and the matching longer nominal run has not been done. Simulation only; nothing here was measured on a physical arm.',
  drRange: 'Training randomised 0 to 2 steps of action latency, so 3 steps is one step outside what the DR policy saw.',
  sources: [soArmReadme],
}

export const stages: Stage[] = [
  {
    id: 'sensor',
    title: 'Photon to sensor',
    what: 'Exposure and readout. Rolling shutter reads rows at different times; global shutter reads all at once.',
    budget: null,
    failure: 'Motion blur and rolling-shutter skew when the robot moves fast.',
    sources: [], // TODO: cite one real camera datasheet
  },
  {
    id: 'preprocess',
    title: 'Preprocess',
    what: 'Turn raw readings into the observation the policy saw in training. Microduck uses a 48-dim proprioceptive observation, no camera.',
    budget: null,
    failure: 'Normalisation at deploy differs from training.',
    sources: [microduckReadme],
  },
  {
    id: 'policy',
    title: 'Policy forward pass',
    what: 'Small MLP maps the observation to 14 joint position residuals.',
    budget: 'ONNX Runtime p50 / p99 0.010 / 0.033 ms, 1 thread, batch 1: 0.2% of the 20 ms tick.',
    failure: 'Exported graph disagrees with the trained model (measured max diff 2.4e-06 over 1,000 observations).',
    sources: [microduckReadme],
  },
  {
    id: 'runtime',
    title: 'Runtime: ONNX / TensorRT',
    what: 'Export the graph, build an engine, choose precision.',
    budget: null,
    failure: 'FP16 / INT8 accuracy drop; a TensorRT engine is tied to the GPU and TensorRT version it was built for.',
    sources: [
      { label: 'ONNX', ref: 'https://onnx.ai' },
      { label: 'NVIDIA TensorRT Developer Guide', ref: 'https://docs.nvidia.com/deeplearning/tensorrt/' },
    ],
  },
  {
    id: 'middleware',
    title: 'Middleware: ROS 2 / DDS',
    what: 'Publish the action. QoS policies set reliability, history depth and deadline.',
    budget: null,
    failure: 'Stale or dropped messages; incompatible QoS between publisher and subscriber means no connection.',
    sources: [
      { label: 'ROS 2 docs: About Quality of Service settings', ref: 'https://docs.ros.org/en/jazzy/Concepts/Intermediate/About-Quality-of-Service-Settings.html' },
    ],
  },
  {
    id: 'controller',
    title: 'Controller',
    what: 'PD loop turns position targets into torque at the physics rate.',
    budget: '10 PD updates per policy tick (500 Hz under 50 Hz).',
    failure: 'Gains tuned in sim do not match the real servo.',
    sources: [microduckReadme, { label: 'ros2_control docs', ref: 'https://control.ros.org' }],
  },
  {
    id: 'actuator',
    title: 'Motor / actuator',
    what: 'The servo tracks the target with its own dynamics: delay, friction, torque limits.',
    budget: null,
    failure: 'Actuator dynamics differ from the sim model: a main sim-to-real gap.',
    sources: [{ label: 'Hwangbo et al. 2019, Science Robotics', ref: 'arXiv:1901.08652' }],
  },
  {
    id: 'physics',
    title: 'Physics to next observation',
    what: 'The world moves; sensors read the new state; the next tick starts.',
    budget: '2 ms physics step (500 Hz).',
    failure: 'Action applied late. In so-arm100-rl, 3 steps of action latency (1 past the DR range) cut success 0.998 → 0.458 nominal, 0.998 → 0.760 with DR.',
    sources: [microduckReadme, { label: 'so-arm100-rl README', ref: 'so-arm100-rl/README.md' }],
  },
]
