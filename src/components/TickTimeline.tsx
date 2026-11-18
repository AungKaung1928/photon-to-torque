import { timing } from '../content/tick'
import { SourceList } from './SourceList'

const AXIS_MS = [0, 5, 10, 15, 20]

export function TickTimeline() {
  const { tickMs, physicsStepMs, policyP50Ms, policyP99Ms, policyNote } = timing
  const steps = Math.round(tickMs / physicsStepMs)
  const p99Pct = (policyP99Ms / tickMs) * 100
  const p50Pct = (policyP50Ms / tickMs) * 100

  return (
    <figure className="timeline">
      <p className="tl-callout">
        <span className="tl-swatch" aria-hidden="true" />
        Policy forward pass: p50 <b>{policyP50Ms.toFixed(3)} ms</b>, p99 <b>{policyP99Ms.toFixed(3)} ms</b>. That
        is {p50Pct.toFixed(2)}% and {p99Pct.toFixed(2)}% of the tick. The blue line at 0 ms is the p99 pass at true width, with a 1 px minimum so it stays visible.
      </p>
      <div className="tl-plot">
        <div className="tl-track">
          {Array.from({ length: steps }, (_, i) => (
            <span
              key={i}
              id={`tl-step-${i + 1}`}
              tabIndex={0}
              className={`tl-step tip${i < 2 ? ' tip-start' : ''}${i >= steps - 2 ? ' tip-end' : ''}`}
              data-tip={`PD + physics update ${i + 1}: ${i * physicsStepMs}–${(i + 1) * physicsStepMs} ms`}
              aria-label={`PD and physics update ${i + 1} of ${steps}, ${i * physicsStepMs} to ${(i + 1) * physicsStepMs} ms`}
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
        One {tickMs} ms tick (50 Hz) holds {steps} PD and physics updates of {physicsStepMs} ms each (500 Hz). {policyNote}{' '}
        Measured on a development CPU, not on robot hardware.
        <SourceList sources={timing.sources} />
      </figcaption>
    </figure>
  )
}
