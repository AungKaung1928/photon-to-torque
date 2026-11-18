import type { Source } from '../content/tick'

function href(ref: string): string | null {
  if (ref.startsWith('http')) return ref
  const arxiv = ref.match(/^arXiv:(\d{4}\.\d{4,5})$/)
  if (arxiv) return `https://arxiv.org/abs/${arxiv[1]}`
  return null
}

export function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) {
    return <p className="muted">No source yet, so this stage shows no number.</p>
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
