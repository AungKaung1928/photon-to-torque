# Chapter 1: one control tick

Running example: Microduck walking policy (`microduck-rl` repo). 50 Hz policy over 500 Hz physics, so one tick = 20 ms and 10 physics steps (microduck-rl README, "env step" section).

| # | Stage | What happens | Budget / number | Main failure mode | Sources |
|---|---|---|---|---|---|
| 1 | Photon → sensor | Exposure, readout, rolling vs global shutter | not measured | Motion blur, rolling-shutter skew at speed | Camera datasheet (TBD: pick one real camera) |
| 2 | Preprocess | Debayer, resize, normalise. Microduck obs is proprioceptive (48-dim), no camera | not measured | Train/deploy normalisation mismatch | microduck-rl README (48-dim obs, normaliser inside ONNX graph) |
| 3 | Policy forward pass | MLP on CPU | ONNX Runtime p50/p99 0.010/0.033 ms, 1 thread, batch 1 = 0.2% of 20 ms | Numerical mismatch after export | microduck-rl README (max torch-ONNX diff 2.4e-06 over 1,000 obs) |
| 4 | Runtime (ONNX / TensorRT) | Graph export, engine build, precision choice | TensorRT: not measured (no Jetson) | FP16/INT8 accuracy drop; engine tied to GPU + TRT version | onnx.ai docs; NVIDIA TensorRT Developer Guide |
| 5 | Middleware (ROS 2 / DDS) | Publish action; QoS sets reliability, history, deadline | not measured | Stale or dropped messages; incompatible QoS = no connection | ROS 2 docs "About Quality of Service settings"; OMG DDS spec |
| 6 | Controller | Position targets → PD → torque at physics rate | 10 PD updates per policy tick (500 Hz) | Sim-tuned gains do not match the servo | microduck-rl README; ros2_control docs (control.ros.org) |
| 7 | Motor / actuator | Servo tracks target with its own dynamics | not measured on hardware | Actuator dynamics: a main sim-to-real gap | Hwangbo et al. 2019, Science Robotics, arXiv:1901.08652 |
| 8 | Physics → next obs | World moves, sensors read new state | 2 ms physics step | Action applied late | so-arm100-rl README: 3 steps of action latency (1 past the DR range) took success 0.998 → 0.458 nominal, 0.998 → 0.760 with DR |

## Teaching point (draft)
- Stage 3 vs 8: the network costs 0.2% of the tick, but 3 steps of latency cut nominal success by more than half. Loop latency matters more than model speed here.
- Domain randomization background: Tobin et al. 2017, arXiv:1703.06907.

## Open before writing app text
- Stage 1: cite one real camera datasheet, or drop camera numbers.
- Stages 4-5: no Jetson or DDS measurement exists; app shows "not measured".
- Verify every arXiv ID above against the paper page before it goes into the app.
