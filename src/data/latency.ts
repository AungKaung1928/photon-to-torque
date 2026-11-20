// Measured inference times on one laptop CPU (Intel Core Ultra 5 225H, WSL2), batch 1.
// Each row cites the README line it comes from; p99 is null where it was not recorded.
export type LatencyRow = {
  id: string
  model: string
  backend: string
  threads: number
  p50Ms: number
  p99Ms: number | null
  periodMs: number | null // control period the call must fit in; null = not a controller
  source: string
}

export const latency: LatencyRow[] = [
  { id: 'duck-cpp', model: 'microduck walking policy', backend: 'ONNX Runtime C++', threads: 1, p50Ms: 0.0063, p99Ms: null, periodMs: 20, source: 'microduck-rl README:44' },
  { id: 'duck-py', model: 'microduck walking policy', backend: 'ONNX Runtime Python', threads: 1, p50Ms: 0.01, p99Ms: 0.033, periodMs: 20, source: 'microduck-rl README:43' },
  { id: 'clutter-int8', model: 'clutter detector', backend: 'ONNX Runtime INT8', threads: 1, p50Ms: 1.38, p99Ms: null, periodMs: null, source: 'mujoco-clutter-detect README:39' },
  { id: 'act-ort', model: 'ACT lift policy (20-step chunk)', backend: 'ONNX Runtime', threads: 1, p50Ms: 0.62, p99Ms: 1.259, periodMs: 50, source: 'so-arm100-il README:222' },
  { id: 'act-torch', model: 'ACT lift policy (20-step chunk)', backend: 'PyTorch', threads: 1, p50Ms: 1.596, p99Ms: 3.259, periodMs: 50, source: 'so-arm100-il README:221' },
  { id: 'vla-ov-fp32', model: 'SmolVLA-base (50-step chunk, 3 cameras)', backend: 'OpenVINO FP32', threads: 4, p50Ms: 3008, p99Ms: 3221, periodMs: 50, source: 'so-arm100-vla README:282' },
  { id: 'vla-ov-int8', model: 'SmolVLA-base (50-step chunk, 3 cameras)', backend: 'OpenVINO INT8 weights', threads: 4, p50Ms: 1295, p99Ms: 1476, periodMs: 50, source: 'so-arm100-vla README:277' },
]
