import { latencyGap } from '../content/tick'
import { BarGroups } from './BarGroups'
import { SourceList } from './SourceList'

const SERIES = [
  { name: 'Trained on nominal physics', cls: 's1' },
  { name: 'Fine-tuned with domain randomization', cls: 's2' },
] as const

const ROWS = latencyGap.rows.map((row) => ({
  label: row.physics,
  values: [
    { v: row.nominalTrained.success, sd: row.nominalTrained.sd },
    { v: row.drFineTuned.success, sd: row.drFineTuned.sd },
  ],
}))

export function LatencyChart() {
  return (
    <BarGroups
      id="gap"
      series={[...SERIES]}
      rows={ROWS}
      unit="success rate"
      rowHeader="Physics"
      digits={3}
      caption={
        <>
          Simulated arm lifting a cube. {latencyGap.protocol} {latencyGap.drRange} {latencyGap.caveat}
          <SourceList sources={latencyGap.sources} />
        </>
      }
    />
  )
}
