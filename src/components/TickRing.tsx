import type { Stage } from '../content/tick'

const SIZE = 320
const C = SIZE / 2
const R = 120
const NODE_R = 19

function point(i: number, n: number, r = R) {
  const a = -Math.PI / 2 + (2 * Math.PI * i) / n
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a), a }
}

// Clockwise loop of stages; stage n feeds stage 1 of the next tick.
export function TickRing({ stages, current }: { stages: Stage[]; current: number }) {
  const n = stages.length
  const stage = stages[current]
  return (
    <figure className="ring" aria-label="Stages of one control tick, in order">
      <div className="ring-box">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="presentation">
          <circle className="ring-track" cx={C} cy={C} r={R} />
          {stages.map((_, i) => {
            // direction chevron halfway between node i and i+1
            const p = point(i + 0.5, n)
            const deg = (p.a * 180) / Math.PI + 90
            return (
              <path
                key={`chev-${i}`}
                className={i === n - 1 ? 'ring-chev wrap' : 'ring-chev'}
                d="M -4 -5 L 3 0 L -4 5"
                transform={`translate(${p.x} ${p.y}) rotate(${deg})`}
              />
            )
          })}
          {stages.map((s, i) => {
            const p = point(i, n)
            const state = i === current ? 'current' : s.budget ? 'measured' : 'unmeasured'
            return (
              <a
                key={s.id}
                id={`ring-stage-${i + 1}`}
                href={`#/tick/${i + 1}`}
                className={`ring-node ${state}`}
                aria-label={`Stage ${i + 1}: ${s.title}${s.budget ? '' : ', not measured'}`}
                aria-current={i === current ? 'step' : undefined}
              >
                <circle cx={p.x} cy={p.y} r={NODE_R} />
                <text x={p.x} y={p.y} dy="0.35em" textAnchor="middle">
                  {i + 1}
                </text>
              </a>
            )
          })}
        </svg>
        <div className="ring-center" aria-hidden="true">
          <span className="eyebrow">
            Stage {current + 1} / {n}
          </span>
          <span className="ring-title">{stage.title}</span>
        </div>
      </div>
      <figcaption className="ring-legend">
        <span>
          <i className="key measured" /> has a measured number
        </span>
        <span>
          <i className="key unmeasured" /> not measured
        </span>
        <span>Stage {n} feeds stage 1 of the next tick.</span>
      </figcaption>
    </figure>
  )
}
