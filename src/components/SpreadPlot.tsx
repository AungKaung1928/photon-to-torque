import { useState } from 'react'
import { NOMINAL, spread } from '../data/spread'
import { covered } from '../lib/coverage'
import { SourceList } from './SourceList'
import { useLang } from '../i18n'

const W = 640
const H = 316
const M = { l: 44, r: 12, t: 12, b: 56 }
const X: [number, number] = [0.5, 1.5] // gain, x nominal
const Y: [number, number] = [0, 4] // joint friction, x nominal
const KP: [number, number] = [0.6, 1.4] // so-arm100-sim DRConfig gain range
const FL_LO = 0.5
const REAL_FIT = { kp: 0.78, frictionloss: 2.5 } // so-arm100-sim EVAL_PHYSICS["real_fit"]

const TEXT = {
  en: {
    top: 'Top of the joint-friction training range:',
    plot: (k: number) =>
      `Scatter of 20 per-episode servo fits, gain against joint friction as multiples of the model default, with the training box; ${k} of 20 inside`,
    xAxis: 'gain, × default 50',
    yAxis: 'friction, × default 0.1',
    fits: 'One real episode, refitted alone',
    box: 'Training range (randomisation)',
    cell: 'real_fit test cell',
    inside: 'Episodes inside the training range:',
    cellIn: 'real_fit is inside: a policy trained on this range is interpolating there, not transferring.',
    cellOut: 'real_fit is outside: success there is a transfer result.',
    note: 'At 2.0× (the old default) no episode is inside. At 3.5× (DRConfig.real_informed) all 20 are, and the real_fit cell stops being a held-out test.',
    source: 'so-arm100-sim runs/real2sim_spread.json and so_arm100_sim/dr.py',
  },
  ja: {
    top: '関節摩擦の学習範囲の上限:',
    plot: (k: number) =>
      `エピソードごとにフィットした 20 個のサーボ (ゲインと関節摩擦、モデル既定値に対する倍率) と学習範囲の箱の散布図。内側は 20 個中 ${k} 個`,
    xAxis: 'ゲイン (既定値 50 の倍率)',
    yAxis: '摩擦 (既定値 0.1 の倍率)',
    fits: '実機の 1 エピソードを単独でフィット',
    box: '学習範囲 (ランダム化)',
    cell: 'real_fit テストセル',
    inside: '学習範囲の内側にあるエピソード:',
    cellIn: 'real_fit は内側です。この範囲で学習した方策にとって、そこは転移ではなく内挿です。',
    cellOut: 'real_fit は外側です。そこでの成功は転移の結果です。',
    note: '2.0 倍 (以前の既定値) では内側のエピソードは 0 個です。3.5 倍 (DRConfig.real_informed) では 20 個すべてが内側になり、real_fit セルはホールドアウトのテストではなくなります。',
    source: 'so-arm100-sim runs/real2sim_spread.json と so_arm100_sim/dr.py',
  },
}

export function SpreadPlot() {
  const T = TEXT[useLang()]
  const [top, setTop] = useState(2.0)
  const x = (v: number) => M.l + ((v - X[0]) / (X[1] - X[0])) * (W - M.l - M.r)
  const y = (v: number) => M.t + ((Y[1] - v) / (Y[1] - Y[0])) * (H - M.t - M.b)
  const inBox = (kp: number, fl: number) => KP[0] <= kp && kp <= KP[1] && FL_LO <= fl && fl <= top
  const k = covered(spread, NOMINAL, KP, [FL_LO, top])
  const cellIn = inBox(REAL_FIT.kp, REAL_FIT.frictionloss)
  const cx = x(REAL_FIT.kp)
  const cy = y(REAL_FIT.frictionloss)
  return (
    <div className="clip replay spread">
      <div className="clip-control">
        <label htmlFor="spread-top">
          {T.top} <b className="num">{top.toFixed(1)}×</b>
        </label>
        <input
          id="spread-top"
          type="range"
          min={2.0}
          max={3.5}
          step={0.1}
          value={top}
          onChange={(e) => setTop(Number(e.target.value))}
        />
      </div>
      <div className="clip-svg">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={T.plot(k)}>
          {[0, 1, 2, 3, 4].map((t) => (
            <g key={`y${t}`}>
              <line className="grid" x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} />
              <text className="axis" x={M.l - 6} y={y(t)} dy="0.35em" textAnchor="end">
                {t}×
              </text>
            </g>
          ))}
          {[0.5, 0.75, 1, 1.25, 1.5].map((t) => (
            <text key={`x${t}`} className="axis" x={x(t)} y={H - 32} textAnchor={t === X[0] ? 'start' : t === X[1] ? 'end' : 'middle'}>
              {t}×
            </text>
          ))}
          <text className="axis" x={W - M.r} y={H - 4} textAnchor="end">
            {T.xAxis}
          </text>
          <text className="axis" x={M.l} y={M.t + 4} dy="0.7em" dx="6">
            {T.yAxis}
          </text>
          <rect className="sp-box" x={x(KP[0])} y={y(top)} width={x(KP[1]) - x(KP[0])} height={y(FL_LO) - y(top)} />
          {spread.map((e, i) => {
            const kp = e.kp / NOMINAL.kp
            const fl = e.frictionloss / NOMINAL.frictionloss
            return <circle key={i} className={inBox(kp, fl) ? 'sp-pt in' : 'sp-pt'} cx={x(kp)} cy={y(fl)} r={5} />
          })}
          <path className="sp-cell" d={`M${cx - 7} ${cy - 7}L${cx + 7} ${cy + 7}M${cx - 7} ${cy + 7}L${cx + 7} ${cy - 7}`} />
        </svg>
      </div>
      <ul className="replay-legend">
        <li className="sp-key-pt">{T.fits}</li>
        <li className="sp-key-box">{T.box}</li>
        <li className="sp-key-cell">{T.cell}</li>
      </ul>
      <p className="clip-read">
        {T.inside} <b className="num">{k} / {spread.length}</b>
      </p>
      <p className="clip-read">{cellIn ? T.cellIn : T.cellOut}</p>
      <p className="panel-note">{T.note}</p>
      <SourceList sources={[{ label: T.source, ref: 'so-arm100-sim/runs/real2sim_spread.json' }]} />
    </div>
  )
}
