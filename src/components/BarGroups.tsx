import type { ReactNode } from 'react'
import { useLang } from '../i18n'

// Grouped horizontal bars on a 0–1 scale, two series per row, with a table view.
export interface BarSeries {
  name: string
  cls: 's1' | 's2'
}
export interface BarValue {
  v: number
  sd?: number
}
export interface BarRow {
  label: string
  note?: string
  values: BarValue[] // one per series, same order
}

const TICKS = [0, 0.25, 0.5, 0.75, 1]

function fmtBar(x: BarValue, digits: number) {
  return x.sd === undefined ? x.v.toFixed(digits) : `${x.v.toFixed(digits)} ± ${x.sd.toFixed(digits)}`
}

interface Props {
  id: string
  series: BarSeries[]
  rows: BarRow[]
  unit: string
  rowHeader: string
  digits: number
  caption: ReactNode
}

export function BarGroups({ id, series, rows, unit, rowHeader, digits, caption }: Props) {
  const lang = useLang()
  const T = { en: { showTable: 'Show as table' }, ja: { showTable: '表で見る' } }[lang]
  return (
    <figure className="gap">
      <div className="legend" aria-hidden="true">
        {series.map((s) => (
          <span key={s.cls}>
            <i className={`key ${s.cls}`} /> {s.name}
          </span>
        ))}
      </div>

      <div className="gap-grid">
        {rows.map((row, r) => (
          <div className="gap-group" key={row.label}>
            <p className="gap-label">
              {row.label}
              {row.note && <span className="gap-note"> {row.note}</span>}
            </p>
            {series.map((s, i) => {
              const x = row.values[i]
              return (
                <div
                  key={s.cls}
                  id={`${id}-${r}-${s.cls}`}
                  className="gap-row tip"
                  tabIndex={0}
                  data-tip={`${s.name}: ${fmtBar(x, digits)}`}
                  role="img"
                  aria-label={`${row.label}, ${s.name}: ${unit} ${fmtBar(x, digits)}`}
                >
                  <span className="gap-track">
                    <span className={`gap-bar ${s.cls}`} style={{ width: `${x.v * 100}%` }} />
                  </span>
                  <span className="gap-val">{x.v.toFixed(digits)}</span>
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
          <span className="gap-axis-unit">{unit}</span>
        </div>
      </div>

      <details className="table-view">
        <summary id={`${id}-table-toggle`}>{T.showTable}</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">{rowHeader}</th>
                {series.map((s) => (
                  <th scope="col" key={s.cls}>
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">
                    {row.label}
                    {row.note && <span className="gap-note"> {row.note}</span>}
                  </th>
                  {row.values.map((x, i) => (
                    <td key={series[i].cls}>{fmtBar(x, digits)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <figcaption>{caption}</figcaption>
    </figure>
  )
}
