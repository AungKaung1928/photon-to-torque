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
