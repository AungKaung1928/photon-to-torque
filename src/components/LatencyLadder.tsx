import { latency } from '../data/latency'
import { logPos, periodShare } from '../lib/latency'
import { SourceList } from './SourceList'
import { useLang } from '../i18n'

const W = 640
const BAR_H = 22
const M = { l: 8, r: 8 }
const MIN_MS = 0.001
const MAX_MS = 10000
const TICKS = [0.001, 0.01, 0.1, 1, 10, 100, 1000, 10000]
const PERIODS = [20, 50]

const TEXT = {
  en: {
    plot: 'Log-scale bars of median inference time for seven models on one laptop CPU, from 0.0063 ms to 3,008 ms, with the 20 ms and 50 ms control periods marked',
    threads: (n: number) => (n === 1 ? '1 thread' : `${n} threads`),
    axis: 'ms per call, log scale',
    periods: 'Control periods: 20 ms (walking policy), 50 ms (arm)',
    p50: 'Median (p50)',
    p99: 'p99, where recorded',
    share: (s: string) => `${s} of its control period`,
    note: 'Rows use different thread counts (1 or 4), so compare within a model, not across. All are CPU numbers; no GPU or Jetson here.',
  },
  ja: {
    plot: '1 台のノート PC の CPU で計測した 7 つのモデルの推論時間の中央値 (0.0063 ms から 3,008 ms) を対数軸の棒で示し、20 ms と 50 ms の制御周期に線を引いた図',
    threads: (n: number) => `${n} スレッド`,
    axis: '1 回あたりの ms (対数軸)',
    periods: '制御周期: 20 ms (歩行方策)、50 ms (アーム)',
    p50: '中央値 (p50)',
    p99: 'p99 (記録がある行のみ)',
    share: (s: string) => `制御周期の ${s}`,
    note: '行ごとにスレッド数 (1 または 4) が違うため、比べるのは同じモデルの中だけにしてください。すべて CPU の数値で、GPU や Jetson の数値は含みません。',
  },
}

const ms = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 4 })

function pct(share: number): string {
  if (share >= 10) return `${Math.round(share)}×`
  const p = share * 100
  return `${p < 1 ? p.toFixed(2) : p.toFixed(1)} %`
}

export function LatencyLadder() {
  const T = TEXT[useLang()]
  const x = (ms: number) => M.l + logPos(ms, MIN_MS, MAX_MS) * (W - M.l - M.r)
  const sources = latency.map((r) => ({ label: `${r.model}, ${r.backend}`, ref: r.source }))
  const guides = (
    <>
      {TICKS.map((t) => (
        <line key={t} className="grid" x1={x(t)} x2={x(t)} y1={0} y2={BAR_H} />
      ))}
      {PERIODS.map((p) => (
        <line key={p} className="ld-period" x1={x(p)} x2={x(p)} y1={0} y2={BAR_H} />
      ))}
    </>
  )
  return (
    <div className="clip ladder">
      <ol className="ld-rows" aria-label={T.plot}>
        {latency.map((r) => (
          <li key={r.id}>
            <p className="ld-label">
              {r.model} · {r.backend} · <span className="ld-nowrap">{T.threads(r.threads)}</span>
              {/* Each figure stays whole; the line may break between figures at phone width. */}
              <span className="num">
                {' '}
                <span className="ld-nowrap">{ms(r.p50Ms)} ms</span>
                {r.p99Ms !== null && <> <span className="ld-nowrap">(p99 {ms(r.p99Ms)})</span></>}
                {r.periodMs ? <> <span className="ld-nowrap">· {T.share(pct(periodShare(r.p50Ms, r.periodMs)))}</span></> : ''}
              </span>
            </p>
            <svg viewBox={`0 0 ${W} ${BAR_H}`} preserveAspectRatio="none" aria-hidden="true">
              {guides}
              <rect className="ld-bar" x={M.l} y={4} width={x(r.p50Ms) - M.l} height={BAR_H - 8} />
              {r.p99Ms !== null && <line className="ld-p99" x1={x(r.p50Ms)} x2={x(r.p99Ms)} y1={BAR_H / 2} y2={BAR_H / 2} />}
            </svg>
          </li>
        ))}
      </ol>
      <div className="ld-axis" aria-hidden="true">
        {TICKS.map((t) => (
          <span key={t} style={{ left: `${(x(t) / W) * 100}%` }}>
            {t >= 1 ? t.toLocaleString('en-US') : t}
          </span>
        ))}
      </div>
      <ul className="replay-legend">
        <li className="ld-key-bar">{T.p50}</li>
        <li className="ld-key-p99">{T.p99}</li>
        <li className="ld-key-period">{T.periods}</li>
      </ul>
      <p className="panel-note">
        {T.axis}. {T.note}
      </p>
      <SourceList sources={sources} />
    </div>
  )
}
