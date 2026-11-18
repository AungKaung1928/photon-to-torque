import { useState } from 'react'
import type { PointerEvent } from 'react'
import { config } from '../content/ppo'
import { SourceList } from './SourceList'

const W = 300
const H = 190
const M = { l: 40, r: 12, t: 14, b: 30 }
const X_MAX = 2
const EPS = config.clip
const LO = 1 - EPS
const HI = 1 + EPS

// PPO clipped surrogate for one sample with advantage A (paper eq. 7).
function objective(r: number, a: number) {
  const clipped = Math.min(Math.max(r, LO), HI)
  return Math.min(r * a, clipped * a)
}

// d objective / d r: zero where the clipped branch is the active minimum.
function gradient(r: number, a: number) {
  if (a > 0) return r > HI ? 0 : a
  return r < LO ? 0 : a
}

interface PanelProps {
  a: number
  r: number
  yMin: number
  yMax: number
  yTicks: number[]
  title: string
  onPick: (r: number) => void
}

function Panel({ a, r, yMin, yMax, yTicks, title, onPick }: PanelProps) {
  const x = (v: number) => M.l + (v / X_MAX) * (W - M.l - M.r)
  const y = (v: number) => M.t + ((yMax - v) / (yMax - yMin)) * (H - M.t - M.b)
  const knots = [0, LO, HI, X_MAX]
  const path = knots.map((k, i) => `${i ? 'L' : 'M'} ${x(k).toFixed(1)} ${y(objective(k, a)).toFixed(1)}`).join(' ')
  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const vx = ((e.clientX - box.left) / box.width) * W
    const v = ((vx - M.l) / (W - M.l - M.r)) * X_MAX
    onPick(Math.round(Math.min(X_MAX, Math.max(0, v)) * 100) / 100)
  }
  const clipped = gradient(r, a) === 0
  return (
    <figure className="clip-panel">
      <figcaption className="clip-title">{title}</figcaption>
      <div className="clip-svg">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: objective against ratio r`} onPointerMove={pick} onPointerDown={pick}>
          <rect className="clip-band" x={x(LO)} y={M.t} width={x(HI) - x(LO)} height={H - M.t - M.b} />
          {yTicks.map((t) => (
            <g key={t}>
              <line className="grid" x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} />
              <text className="axis" x={M.l - 6} y={y(t)} dy="0.35em" textAnchor="end">
                {t}
              </text>
            </g>
          ))}
          {[0, LO, HI, X_MAX].map((t) => (
            <text key={t} className="axis" x={x(t)} y={H - 10} textAnchor={t === 0 ? 'start' : t === X_MAX ? 'end' : 'middle'}>
              {t}
            </text>
          ))}
          <path className="clip-line" d={path} />
          <line className="clip-cursor" x1={x(r)} x2={x(r)} y1={M.t} y2={H - M.b} />
          <circle className={clipped ? 'clip-dot flat' : 'clip-dot'} cx={x(r)} cy={y(objective(r, a))} r={5} />
        </svg>
      </div>
      <p className="clip-read">
        objective <b>{objective(r, a).toFixed(2)}</b>, gradient <b>{gradient(r, a)}</b>
        {clipped ? ' (clipped: this sample stops pushing)' : ''}
      </p>
    </figure>
  )
}

export function ClipPlot() {
  const [r, setR] = useState(1.3)
  return (
    <div className="clip">
      <div className="clip-control">
        <label htmlFor="clip-r">
          Ratio r = π_new / π_old: <b>{r.toFixed(2)}</b>
        </label>
        <input
          id="clip-r"
          type="range"
          min={0}
          max={X_MAX}
          step={0.01}
          value={r}
          onChange={(e) => setR(Number(e.target.value))}
        />
        <span className="muted">Shaded band: [{LO}, {HI}] for ε = {EPS}. Drag the slider or move over a plot.</span>
      </div>
      <div className="clip-panels">
        <Panel a={1} r={r} yMin={0} yMax={1.4} yTicks={[0, 0.4, 0.8, 1.2]} title="Good action (A = +1)" onPick={setR} />
        <Panel a={-1} r={r} yMin={-2} yMax={0} yTicks={[-2, -1.2, -0.8, 0]} title="Bad action (A = −1)" onPick={setR} />
      </div>
      <p className="panel-note">
        Read it this way. A good action stops earning credit once it is already 20% more likely than before. If an
        update made a bad action more likely (r above 1), the loss keeps its full gradient however large r gets, so
        that mistake is always pushed back.
      </p>
      <SourceList sources={[{ label: 'Schulman et al. 2017, eq. 7 and figure 1', ref: 'arXiv:1707.06347' }]} />
    </div>
  )
}
