import { useContent } from '../content'
import { useLang } from '../i18n'
import { SourceList } from './SourceList'

const TEXT = {
  en: {
    metric: 'Measured per update',
    evaluation: 'Evaluation: 100 episodes × 5 seeds, the same seeds for both chunks, deterministic actions.',
  },
  ja: {
    metric: '更新ごとの計測値',
    evaluation: '評価: 100 エピソード × 5 シード、両方のチャンクで同じシード、決定論的な行動。',
  },
}

export function DiagTable() {
  const { diagnostics } = useContent().ppo
  const T = TEXT[useLang()]
  return (
    <figure className="diag">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">{T.metric}</th>
              <th scope="col">{diagnostics.labels.chunk1}</th>
              <th scope="col">{diagnostics.labels.chunk2}</th>
            </tr>
          </thead>
          <tbody>
            {diagnostics.rows.map((row) => (
              <tr key={row.metric}>
                <th scope="row">{row.metric}</th>
                <td>{row.chunk1}</td>
                <td>{row.chunk2}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption>
        {T.evaluation} {diagnostics.caveat}
        <SourceList sources={diagnostics.sources} />
      </figcaption>
    </figure>
  )
}
