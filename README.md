# Photon to Torque

A study app that follows one robot control tick from the camera to the motor, stage by stage. For each stage it shows what happens, the time budget, the main failure mode, and the source of every number.

Status: complete at 6 chapters. The measured latency ladder that was planned as a seventh chapter is a panel of chapter 5. Content lives in `src/content/` (`tick.ts`, `ppo.ts`, `dds.ts`, `sim2real.ts`, `vla.ts`, `sysid.ts`); components only render it. The site opens on an overview with one card per chapter. Links: `#/tick/1`, `#/ppo/1`, `#/dds/1`, `#/sim2real/1`, `#/vla/1`, `#/sysid/1`, each with numbered steps. Arrow keys step through.

## Chapters

1. One control tick: sensor, preprocess, policy, runtime, middleware, controller, actuator, physics.
2. One PPO update, step by step.
3. One ROS 2 message and its QoS, with a compatibility checker.
4. The sim-to-real gap: held-out physics on a simulated arm, and a metric a simulated biped gamed.
5. VLA action chunking: chunked against single-step cloning, and whether a chunk covers its own inference time.
6. System ID on a real arm: a simulated servo fitted to a public recording of a real SO-100 arm, with an interactive replay of one real episode.

## Rules for content

- Every number has a source: a paper, official documentation, or a measured result from one of the author's repositories (`microduck-rl`, `so-arm100-rl`, `so-arm100-il`, `so-arm100-vla`, `so-arm100-sim`).
- A stage with no measurement says "not measured". No estimates.
- English and Japanese: each content file has a Japanese twin (`tick.ja.ts` …) with the same exports. The build fails if a twin drops an export or changes a shape, and `src/content/parity.test.ts` fails if a number, id or reference differs. The EN / 日本語 switch sits in the header; the choice is saved in the browser.

## Run locally

Needs Node.js 20.19+ or 22.12+ and npm.

```bash
git clone <this repo URL>
cd photon-to-torque
npm ci          # first time only
npm run dev     # then open http://localhost:5173
```

Only when changing the code:

```bash
npm run lint
npm test        # unit tests: QoS checker, PPO clip math, routing, EN/JA parity
npm run build   # type check + static build into dist/
./scripts/verify.sh   # builds, then loads every page in headless Chrome (needs Chrome)
```

CI (`.github/workflows/ci.yml`) runs lint, tests and the build on every push to `main`.

Stack: Vite, React, TypeScript. Static site, hash routing, inline SVG.

## Docs

- `docs/FEATURES.md`: what the site must do and how `scripts/verify.sh` checks each feature.
- `docs/DESIGN.md`: structure and content rules.
- `docs/CH1_OUTLINE.md`: chapter 1 stages with budgets and sources.
