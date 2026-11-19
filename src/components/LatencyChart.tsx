import { useContent } from '../content'
import { useLang } from '../i18n'
import { BarGroups } from './BarGroups'
import type { BarSeries } from './BarGroups'
import { SourceList } from './SourceList'

const TEXT = {
  en: {
    nominal: 'Trained on nominal physics',
    dr: 'Fine-tuned with domain randomization',
    unit: 'success rate',
    rowHeader: 'Physics',
    task: 'Simulated arm lifting a cube.',
  },
  ja: {
    nominal: 'ノミナル物理で学習',
    dr: 'ドメインランダマイゼーションでファインチューニング',
    unit: '成功率',
    rowHeader: '物理条件',
    task: 'シミュレーション上のアームがキューブを持ち上げるタスクです。',
  },
}

export function LatencyChart() {
  const { latencyGap } = useContent().tick
  const T = TEXT[useLang()]
  const series: BarSeries[] = [
    { name: T.nominal, cls: 's1' },
    { name: T.dr, cls: 's2' },
  ]
  const rows = latencyGap.rows.map((row) => ({
    label: row.physics,
    values: [
      { v: row.nominalTrained.success, sd: row.nominalTrained.sd },
      { v: row.drFineTuned.success, sd: row.drFineTuned.sd },
    ],
  }))
  return (
    <BarGroups
      id="gap"
      series={series}
      rows={rows}
      unit={T.unit}
      rowHeader={T.rowHeader}
      digits={3}
      caption={
        <>
          {T.task} {latencyGap.protocol} {latencyGap.drRange} {latencyGap.caveat}
          <SourceList sources={latencyGap.sources} />
        </>
      }
    />
  )
}
