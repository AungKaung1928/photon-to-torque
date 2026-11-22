# Design note

## Job
Follow one robot control tick from camera photon to motor torque. One tick, end to end, with the latency budget and the main failure mode at each stage. Study tool, not a product.

## Structure (borrowed patterns, no copied text or branding)
- **Step-through flow** (chapter 1): one stage per step, Next / Back and arrow keys, the tick diagram stays on screen and highlights the current stage. Hash route per step (`#/tick/3`) so a step can be linked.
- **Component inspector**: click a stage in the diagram to open its card: what it does, input/output types and shapes, budget, failure mode, trade-offs, sources.
- **Message inspection** (chapter 3, DDS/QoS): show one sample as fields; toggle QoS policies and see what happens to delivery.
- **Learning path**: chapters numbered 1-5 because they are a real sequence. Progress stored in `localStorage`.

## Content rules
- Every number has a source: a paper, official docs, or a measured number from the author's own repos (repo + README section).
- No source: the field says "not measured" instead of a guess.
- Each stage card ends with "Sources".

## Stack
Vite + React + TypeScript, static build, hash routing (no router dependency yet), inline SVG diagrams. Content lives in typed data files (`src/content/*.ts`), so text can be checked without touching components.

## Visual design
Not started. Before styling: pick 1-2 study-tool references, define tokens (light + dark), flex/grid layout, no horizontal scroll at 390 px.

## Reference study
- system-design-explainer: Systems / Components / Concepts nav, search, numbered learning paths with saved progress, play-through request flows, component inspectors with pitfalls.
- designed-to-scale, protocol-explorer: client-rendered only; a plain fetch returned no content. Structure taken from the plan description, not from reading the sites.

## Sources (most cited)

Every step and panel in the app lists its own sources. The ones cited most:

- Measured results: the READMEs of `microduck-rl`, `so-arm100-rl`, `so-arm100-il`, `so-arm100-vla`, `so-arm100-sim`.
- PPO: Schulman et al. 2017 (arXiv:1707.06347); GAE: Schulman et al. 2015 (arXiv:1506.02438); time limits: Pardo et al. 2017 (arXiv:1712.00378); "The 37 Implementation Details of PPO" (ICLR Blog Track 2022).
- Sim-to-real: Tobin et al. 2017, domain randomization (arXiv:1703.06907); Hwangbo et al. 2019, learned actuator model (arXiv:1901.08652).
- Action chunking: Zhao et al. 2023, ACT (arXiv:2304.13705).
- ROS 2 Jazzy documentation: Quality of Service settings, executors; ros2_control; OMG DDSI-RTPS specification.
