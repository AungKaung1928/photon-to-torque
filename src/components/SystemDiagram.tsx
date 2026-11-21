import { useEffect, useState } from 'react'
import { DIAGRAMS, KIND_LABEL, NODE_KINDS, type DiagramNode } from '../content/diagrams'
import { useLang } from '../i18n'

interface Props {
  route: string
  stepIds: string[]
  current: number
  label: string // accessible name of the figure, e.g. 'Stages of one control tick'
  position: string // e.g. 'Stage 1 of 8'
  title: string // title of the open step
  what: string // one or two lines: what happens in the open step
}

const W = 132 // node box
const H = 52
const DX = 146 // grid pitch
const DY = 92
const PAD = 12

const TEXT = {
  en: { play: 'Play', pause: 'Pause', back: 'Previous step', next: 'Next step', legend: 'Colour key', go: 'Go to' },
  ja: { play: '再生', pause: '一時停止', back: '前のステップ', next: '次のステップ', legend: '色の意味', go: '移動:' },
}

const box = (x: DiagramNode) => ({ x: PAD + x.col * DX, y: PAD + x.row * DY })

// Where the line from the centre of `from` towards the centre of `to` leaves the box of `from`.
function edgePoint(from: { x: number; y: number }, to: { x: number; y: number }, w = W, h = H) {
  const cx = from.x + w / 2
  const cy = from.y + h / 2
  const dx = to.x + w / 2 - cx
  const dy = to.y + h / 2 - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }
  const s = Math.min(dx === 0 ? Infinity : w / 2 / Math.abs(dx), dy === 0 ? Infinity : h / 2 / Math.abs(dy))
  return { x: cx + dx * s, y: cy + dy * s }
}

export function SystemDiagram({ route, stepIds, current, label, position, title, what }: Props) {
  const lang = useLang()
  const T = TEXT[lang]
  const d = DIAGRAMS[route]
  const [playing, setPlaying] = useState(false)
  const total = stepIds.length
  const href = (i: number) => `#/${route}/${((i % total) + total) % total + 1}`

  // Play walks forward one step every 2.4 s and stops on the last step (Play there restarts from step 1).
  useEffect(() => {
    if (!playing) return
    const t = window.setTimeout(() => {
      if (current >= total - 1) setPlaying(false)
      else window.location.hash = href(current + 1)
    }, 2400)
    return () => window.clearTimeout(t)
  })

  const active = d.stepNode[stepIds[current]]
  const byId = Object.fromEntries(d.nodes.map((x) => [x.id, x]))
  const cols = Math.max(...d.nodes.map((x) => x.col)) + 1
  const rows = Math.max(...d.nodes.map((x) => x.row)) + 1
  const vw = PAD * 2 + (cols - 1) * DX + W
  const vh = PAD * 2 + (rows - 1) * DY + H
  const kinds = NODE_KINDS.filter((k) => d.nodes.some((x) => x.kind === k))

  return (
    <figure className="sysdiag" aria-label={label}>
      <div className="sysdiag-scroll">
        <svg viewBox={`0 0 ${vw} ${vh}`} width={vw} height={vh} role="group" aria-label={label}>
          <defs>
            <marker id={`arrow-${route}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className="sd-arrowhead" />
            </marker>
          </defs>
          {d.edges.map(([a, b]) => {
            const p = edgePoint(box(byId[a]), box(byId[b]))
            const q = edgePoint(box(byId[b]), box(byId[a]))
            const on = b === active || a === active
            return (
              <line
                key={`${a}-${b}`}
                x1={p.x}
                y1={p.y}
                x2={q.x}
                y2={q.y}
                className={on ? 'sd-edge on' : 'sd-edge'}
                data-into={b === active ? 'true' : undefined}
                markerEnd={`url(#arrow-${route})`}
              />
            )
          })}
          {d.nodes.map((x) => {
            const { x: bx, y: by } = box(x)
            const first = stepIds.findIndex((s) => d.stepNode[s] === x.id)
            const on = x.id === active
            return (
              <a
                key={x.id}
                id={`node-${route}-${x.id}`}
                href={href(first)}
                className={`sd-node k-${x.kind}${on ? ' on' : ''}`}
                aria-label={`${T.go} ${x[lang]}`}
                aria-current={on ? 'step' : undefined}
              >
                <rect x={bx} y={by} width={W} height={H} rx={10} />
                <text x={bx + W / 2} y={by + H / 2} dominantBaseline="central" textAnchor="middle">
                  {x[lang]}
                </text>
              </a>
            )
          })}
        </svg>
      </div>
      <figcaption className="sd-caption" aria-live="polite">
        <span className="eyebrow">{position}</span>
        <strong>{title}</strong>
        <span>{what}</span>
      </figcaption>
      <div className="sd-bar">
        <a id={`${route}-diag-back`} className="btn small" href={href(current - 1)} aria-label={T.back}>
          ←
        </a>
        <button
          id={`${route}-play`}
          type="button"
          className="btn small primary"
          aria-pressed={playing}
          onClick={() => {
            if (!playing && current >= total - 1) window.location.hash = href(0)
            setPlaying(!playing)
          }}
        >
          {playing ? T.pause : T.play}
        </button>
        <a id={`${route}-diag-next`} className="btn small" href={href(current + 1)} aria-label={T.next}>
          →
        </a>
        <ul className="sd-legend" aria-label={T.legend}>
          {kinds.map((k) => (
            <li key={k} className={`k-${k}`}>
              {KIND_LABEL[k][lang]}
            </li>
          ))}
        </ul>
      </div>
    </figure>
  )
}
