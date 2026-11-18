import type { Stage } from '../content/tick'

const SIZE = 320
const C = SIZE / 2
const R = 120
const NODE_R = 19

function point(i: number, n: number, r = R) {
  const a = -Math.PI / 2 + (2 * Math.PI * i) / n
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a), a }
}

interface Props {
  stages: Stage[]
  current: number
  route: string // e.g. 'tick' -> links to #/tick/N
  unit: string // 'Stage' or 'Step'
  label: string // figure label for screen readers
  loopNote: string // what the last node feeds
}

// Clockwise loop: the last node feeds the first node of the next cycle.
export function StageRing({ stages, current, route, unit, label, loopNote }: Props) {
  const n = stages.length
  const stage = stages[current]
  return (
    <figure className="ring" aria-label={label}>
      <div className="ring-box">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="presentation">
          <circle className="ring-track" cx={C} cy={C} r={R} />
          {stages.map((_, i) => {
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
                id={`ring-${route}-${i + 1}`}
                href={`#/${route}/${i + 1}`}
                className={`ring-node ${state}`}
                aria-label={`${unit} ${i + 1}: ${s.title}${s.budget ? '' : ', no number'}`}
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
            {unit} {current + 1} / {n}
          </span>
          <span className="ring-title">{stage.title}</span>
        </div>
      </div>
      <figcaption className="ring-legend">
        <span>
          <i className="key measured" /> has a number with a source
        </span>
        <span>
          <i className="key unmeasured" /> no number
        </span>
        <span>{loopNote}</span>
      </figcaption>
    </figure>
  )
}
