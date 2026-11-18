import type { Stage } from '../content/tick'
import { SourceList } from './SourceList'

interface Props {
  stage: Stage
  index: number
  total: number
  route: string
  unit: string // 'Stage' or 'Step'
  budgetLabel: string // 'Budget' or 'Setting'
  restartLabel: string // label of Next on the last step
}

export function StageCard({ stage, index, total, route, unit, budgetLabel, restartLabel }: Props) {
  const prev = index === 0 ? total : index
  const next = index === total - 1 ? 1 : index + 2
  return (
    <article className="stage" aria-labelledby="stage-title">
      <p className="eyebrow">
        {unit} {index + 1} of {total}
      </p>
      <h2 id="stage-title">{stage.title}</h2>
      <p className="lede">{stage.what}</p>

      <dl className="facts">
        <div>
          <dt>{budgetLabel}</dt>
          <dd>{stage.budget ?? <span className="chip">not measured</span>}</dd>
        </div>
        <div>
          <dt>Main failure mode</dt>
          <dd>{stage.failure}</dd>
        </div>
      </dl>

      <section className="stage-sources" aria-label="Sources">
        <h3>Sources</h3>
        <SourceList sources={stage.sources} />
      </section>

      <nav className="stepper" aria-label={`Step through the ${unit.toLowerCase()}s`}>
        <a id={`${route}-back`} className="btn" href={`#/${route}/${prev}`}>
          Back
        </a>
        <span className="hint">or use the arrow keys</span>
        <a id={`${route}-next`} className="btn primary" href={`#/${route}/${next}`}>
          {index === total - 1 ? restartLabel : `Next ${unit.toLowerCase()}`}
        </a>
      </nav>
    </article>
  )
}
