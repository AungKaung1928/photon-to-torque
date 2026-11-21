import type { Stage } from '../content/tick'
import { useLang } from '../i18n'
import { SourceList } from './SourceList'

interface Props {
  stage: Stage
  index: number
  total: number
  route: string
  unit: string // 'Stage' or 'Step'
  budgetLabel: string // 'Budget' or 'Setting'
  restartLabel: string // label of Next on the last step
  nextTitle?: string // title of the following step; absent on the last step
}

const TEXT = {
  en: {
    position: (unit: string, i: number, total: number) => `${unit} ${i} of ${total}`,
    notMeasured: 'not measured',
    failure: 'Main failure mode',
    sources: 'Sources',
    stepThrough: (unit: string) => `Step through the ${unit.toLowerCase()}s`,
    back: 'Back',
    hint: 'or use the arrow keys',
    next: (title: string) => `Next: ${title}`,
  },
  ja: {
    position: (unit: string, i: number, total: number) => `${unit} ${i} / ${total}`,
    notMeasured: '未計測',
    failure: '主な失敗モード',
    sources: '出典',
    stepThrough: (unit: string) => `${unit}を順に見る`,
    back: '前へ',
    hint: '矢印キーでも移動できます',
    next: (title: string) => `次へ：${title}`,
  },
}

export function StageCard({ stage, index, total, route, unit, budgetLabel, restartLabel, nextTitle }: Props) {
  const T = TEXT[useLang()]
  const prev = index === 0 ? total : index
  const next = index === total - 1 ? 1 : index + 2
  return (
    <article className="stage" aria-labelledby="stage-title">
      <p className="eyebrow">{T.position(unit, index + 1, total)}</p>
      <h2 id="stage-title">{stage.title}</h2>
      <p className="lede">{stage.what}</p>

      <dl className="facts">
        <div>
          <dt>{budgetLabel}</dt>
          <dd>{stage.budget ?? <span className="chip">{T.notMeasured}</span>}</dd>
        </div>
        <div>
          <dt>{T.failure}</dt>
          <dd>{stage.failure}</dd>
        </div>
      </dl>

      <section className="stage-sources" aria-label={T.sources}>
        <h3>{T.sources}</h3>
        <SourceList sources={stage.sources} />
      </section>

      <nav className="stepper" aria-label={T.stepThrough(unit)}>
        <a id={`${route}-back`} className="btn" href={`#/${route}/${prev}`}>
          {T.back}
        </a>
        <span className="hint">{T.hint}</span>
        <a id={`${route}-next`} className="btn primary" href={`#/${route}/${next}`}>
          {nextTitle === undefined ? restartLabel : T.next(nextTitle)}
        </a>
      </nav>
    </article>
  )
}
