import { latencyGap } from '../content/tick'
import type { GapCell } from '../content/tick'
import { SourceList } from './SourceList'

const SERIES = [
  { key: 'nominalTrained', name: 'Trained on nominal physics', cls: 's1' },
  { key: 'drFineTuned', name: 'Fine-tuned with domain randomization', cls: 's2' },
] as const

const TICKS = [0, 0.25, 0.5, 0.75, 1]

function fmt(c: GapCell) {
  return `${c.success.toFixed(3)} ± ${c.sd.toFixed(3)}`
}

export function LatencyChart() {
  return (
    <figure className="gap">
      <div className="legend" aria-hidden="true">
        {SERIES.map((s) => (
          <span key={s.key}>
            <i className={`key ${s.cls}`} /> {s.name}
          </span>
        ))}
      </div>

      <div className="gap-grid">
        {latencyGap.rows.map((row, r) => (
          <div className="gap-group" key={row.physics}>
            <p className="gap-label">{row.physics}</p>
            {SERIES.map((s) => {
              const cell = row[s.key]
              return (
                <div
                  key={s.key}
                  id={`gap-${r}-${s.cls}`}
                  className="gap-row tip"
                  tabIndex={0}
                  data-tip={`${s.name}: ${fmt(cell)}`}
                  aria-label={`${row.physics}, ${s.name}: success ${fmt(cell)}`}
                >
                  <span className="gap-track">
                    <span className={`gap-bar ${s.cls}`} style={{ width: `${cell.success * 100}%` }} />
                  </span>
                  <span className="gap-val">{cell.success.toFixed(3)}</span>
                </div>
              )
            })}
          </div>
        ))}
        <div className="gap-axis" aria-hidden="true">
          <span className="gap-axis-track">
            {TICKS.map((t) => (
              <span key={t} style={{ left: `${t * 100}%` }}>
                {t}
              </span>
            ))}
          </span>
          <span className="gap-axis-unit">success rate</span>
        </div>
      </div>

      <details className="table-view">
        <summary id="gap-table-toggle">Show as table</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Physics</th>
                {SERIES.map((s) => (
                  <th scope="col" key={s.key}>
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {latencyGap.rows.map((row) => (
                <tr key={row.physics}>
                  <th scope="row">{row.physics}</th>
                  {SERIES.map((s) => (
                    <td key={s.key}>{fmt(row[s.key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <figcaption>
        Simulated arm lifting a cube. {latencyGap.protocol} {latencyGap.drRange} {latencyGap.caveat}
        <SourceList sources={latencyGap.sources} />
      </figcaption>
    </figure>
  )
}
