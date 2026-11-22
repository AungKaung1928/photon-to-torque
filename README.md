# Photon to Torque

A study app that follows one robot control tick from the camera to the motor in 6 chapters. Each stage shows what happens, its time budget, the main failure mode and the source of every number; a stage with no measurement says "not measured".

<img src="docs/media/tick-1.webp" width="720" alt="Chapter 1: the control-tick diagram with the camera stage lit, stage 1 of 8, Back / Play / Next">

## Chapters

1. One control tick: sensor, preprocess, policy, runtime, middleware, controller, actuator, physics.
2. One PPO update, step by step.
3. One ROS 2 message and its QoS, with a compatibility checker.
4. The sim-to-real gap: held-out physics on a simulated arm, and a metric a simulated biped gamed.
5. VLA action chunking: chunked against single-step cloning, and whether a chunk covers its own inference time.
6. System ID on a real arm: a simulated servo fitted to a public recording of a real SO-100 arm, with a replay of one real episode.

English and Japanese: each content file in `src/content/` has a Japanese twin; `src/content/parity.test.ts` fails if a number, id or reference differs.

## Run locally

Needs Node.js 22.12+ and npm (the tests need it; the dev server alone also runs on 20.19+).

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
node scripts/keys.mjs # presses real keys: arrows, Tab focus (Linux Chrome)
```

CI (`.github/workflows/ci.yml`) runs lint, tests, the build, the verify script and the keyboard check on every push to `main`.

Stack: Vite, React, TypeScript. Static site, hash routing, inline SVG.

## Docs

- `docs/FEATURES.md`: what the site must do and how `scripts/verify.sh` checks each feature.
- `docs/DESIGN.md`: structure, content rules, the most-cited sources.
- `docs/CH1_OUTLINE.md`: chapter 1 stages with budgets and sources.

## License

MIT, see LICENSE.
