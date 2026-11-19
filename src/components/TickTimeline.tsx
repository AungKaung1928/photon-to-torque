import { useContent } from '../content'
import { useLang } from '../i18n'
import { SourceList } from './SourceList'

const AXIS_MS = [0, 5, 10, 15, 20]

const TEXT = {
  en: {
    callout: (p50: string, p99: string, p50Pct: string, p99Pct: string) => (
      <>
        Policy forward pass: p50 <b>{p50} ms</b>, p99 <b>{p99} ms</b>. That is {p50Pct}% and {p99Pct}% of the tick. The
        blue line at 0 ms is the p99 pass at true width, with a 1 px minimum so it stays visible.
      </>
    ),
    tip: (i: number, a: number, b: number) => `PD + physics update ${i}: ${a}–${b} ms`,
    aria: (i: number, n: number, a: number, b: number) => `PD and physics update ${i} of ${n}, ${a} to ${b} ms`,
    holds: (tick: number, steps: number, step: number) =>
      `One ${tick} ms tick (50 Hz) holds ${steps} PD and physics updates of ${step} ms each (500 Hz).`,
    where: 'Measured on a development CPU, not on robot hardware.',
  },
  ja: {
    callout: (p50: string, p99: string, p50Pct: string, p99Pct: string) => (
      <>
        ポリシーのフォワードパス: p50 <b>{p50} ms</b>、p99 <b>{p99} ms</b>。制御ティックの {p50Pct}% と {p99Pct}% にあたります。
        {'0 ms の位置にある青い線は p99 のパスを実際の幅で描いたもので、見えるように最小幅を 1 px にしています。'}
      </>
    ),
    tip: (i: number, a: number, b: number) => `PD + 物理更新 ${i}: ${a}–${b} ms`,
    aria: (i: number, n: number, a: number, b: number) => `PD と物理更新 ${i} / ${n}、${a}〜${b} ms`,
    holds: (tick: number, steps: number, step: number) =>
      `${tick} ms の制御ティック 1 回 (50 Hz) に、${step} ms の PD と物理更新が ${steps} 回入ります (500 Hz)。`,
    where: '開発用 CPU で計測しており、ロボット実機では計測していません。',
  },
}

export function TickTimeline() {
  const { timing } = useContent().tick
  const T = TEXT[useLang()]
  const { tickMs, physicsStepMs, policyP50Ms, policyP99Ms, policyNote } = timing
  const steps = Math.round(tickMs / physicsStepMs)
  const p99Pct = (policyP99Ms / tickMs) * 100
  const p50Pct = (policyP50Ms / tickMs) * 100

  return (
    <figure className="timeline">
      <p className="tl-callout">
        <span className="tl-swatch" aria-hidden="true" />
        {T.callout(policyP50Ms.toFixed(3), policyP99Ms.toFixed(3), p50Pct.toFixed(2), p99Pct.toFixed(2))}
      </p>
      <div className="tl-plot">
        <div className="tl-track">
          {Array.from({ length: steps }, (_, i) => (
            <span
              key={i}
              id={`tl-step-${i + 1}`}
              tabIndex={0}
              className={`tl-step tip${i < 2 ? ' tip-start' : ''}${i >= steps - 2 ? ' tip-end' : ''}`}
              data-tip={T.tip(i + 1, i * physicsStepMs, (i + 1) * physicsStepMs)}
              aria-label={T.aria(i + 1, steps, i * physicsStepMs, (i + 1) * physicsStepMs)}
            />
          ))}
          <span className="tl-policy" style={{ width: `${p99Pct}%` }} aria-hidden="true" />
        </div>
        <div className="tl-axis" aria-hidden="true">
          {AXIS_MS.map((ms) => (
            <span key={ms} style={{ left: `${(ms / tickMs) * 100}%` }}>
              {ms}
              {ms === tickMs ? ' ms' : ''}
            </span>
          ))}
        </div>
      </div>
      <figcaption>
        {T.holds(tickMs, steps, physicsStepMs)} {policyNote} {T.where}
        <SourceList sources={timing.sources} />
      </figcaption>
    </figure>
  )
}
