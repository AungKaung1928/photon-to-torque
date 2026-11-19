import type { Source } from '../content/tick'
import { useLang } from '../i18n'

function href(ref: string): string | null {
  if (ref.startsWith('http')) return ref
  const arxiv = ref.match(/^arXiv:(\d{4}\.\d{4,5})$/)
  if (arxiv) return `https://arxiv.org/abs/${arxiv[1]}`
  return null
}

const NO_SOURCE = {
  en: 'No source yet, so this stage shows no number.',
  ja: 'まだ出典がないため、このステージには数値を表示しません。',
}

export function SourceList({ sources }: { sources: Source[] }) {
  const lang = useLang()
  if (sources.length === 0) {
    return <p className="muted">{NO_SOURCE[lang]}</p>
  }
  return (
    <ul className="sources">
      {sources.map((s) => {
        const url = href(s.ref)
        return (
          <li key={s.label + s.ref}>
            {url ? (
              <a href={url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            ) : (
              <span>{s.label}</span>
            )}
            {!url && <code className="ref">{s.ref}</code>}
            {url && s.ref.startsWith('arXiv') && <code className="ref">{s.ref}</code>}
          </li>
        )
      })}
    </ul>
  )
}
