import { diagnostics } from '../content/ppo'
import { SourceList } from './SourceList'

export function DiagTable() {
  return (
    <figure className="diag">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Measured per update</th>
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
        Evaluation: 100 episodes × 5 seeds, the same seeds for both chunks, deterministic actions. {diagnostics.caveat}
        <SourceList sources={diagnostics.sources} />
      </figcaption>
    </figure>
  )
}
