# Photon to Torque

A study app that follows one robot control tick from the camera to the motor, stage by stage. For each stage it shows what happens, the time budget, the main failure mode, and the source of every number.

Status: chapters 1 and 2 are written. Content lives in `src/content/tick.ts` and `src/content/ppo.ts`; components only render it. Links: `#/tick/1` to `#/tick/8`, `#/ppo/1` to `#/ppo/7`. Arrow keys step through.

## Chapters

1. One control tick: sensor, preprocess, policy, runtime, middleware, controller, actuator, physics.
2. One PPO update, step by step.
3. DDS / QoS explorer.
4. The sim-to-real gap, with measured numbers.
5. VLA action chunking.

## Rules for content

- Every number has a source: a paper, official documentation, or a measured result from one of the author's repositories (`microduck-rl`, `so-arm100-rl`).
- A stage with no measurement says "not measured". No estimates.

## Run

```bash
npm install
npm run dev     # local dev server
npm run build   # type check + static build into dist/
```

Stack: Vite, React, TypeScript. Static site, hash routing, inline SVG.

## Docs

- `docs/DESIGN.md`: structure and content rules.
- `docs/CH1_OUTLINE.md`: chapter 1 stages with budgets and sources.
