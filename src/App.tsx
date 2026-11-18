import { useEffect, useState } from 'react'
import { stages, tick, timing, latencyGap } from './content/tick'
import { TickRing } from './components/TickRing'
import { StageCard } from './components/StageCard'
import { TickTimeline } from './components/TickTimeline'
import { LatencyChart } from './components/LatencyChart'

const CHAPTERS = [
  { n: 1, title: 'One control tick', ready: true },
  { n: 2, title: 'One PPO update', ready: false },
  { n: 3, title: 'DDS and QoS', ready: false },
  { n: 4, title: 'The sim-to-real gap', ready: false },
  { n: 5, title: 'VLA action chunking', ready: false },
]

function stageFromHash(): number {
  const m = window.location.hash.match(/^#\/tick\/(\d+)$/)
  const n = m ? Number(m[1]) : 1
  return n >= 1 && n <= stages.length ? n - 1 : 0
}

function go(index: number) {
  const n = ((index % stages.length) + stages.length) % stages.length
  window.location.hash = `#/tick/${n + 1}`
}

export default function App() {
  const [current, setCurrent] = useState(stageFromHash)

  useEffect(() => {
    const onHash = () => setCurrent(stageFromHash())
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (e.key === 'ArrowRight') go(stageFromHash() + 1)
      if (e.key === 'ArrowLeft') go(stageFromHash() - 1)
    }
    window.addEventListener('hashchange', onHash)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const p99Pct = ((timing.policyP99Ms / timing.tickMs) * 100).toFixed(2)
  const [nominal, laggy] = latencyGap.rows

  return (
    <div className="page">
      <header className="masthead">
        <p className="brand">Photon to Torque</p>
        <nav aria-label="Chapters">
          <ol className="chapters">
            {CHAPTERS.map((c) => (
              <li key={c.n} className={c.ready ? 'ready' : 'planned'} aria-current={c.n === 1 ? 'page' : undefined}>
                <span className="ch-n">{c.n}</span>
                <span className="ch-title">{c.title}</span>
                {!c.ready && <span className="ch-state">planned</span>}
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <main>
        <section className="intro">
          <h1>One control tick</h1>
          <p>
            Follow one decision of a walking robot from sensor to motor torque. Each stage shows what happens, its
            time budget, how it fails, and where the number comes from. {tick.example}
          </p>
        </section>

        <section className="bench" aria-label="Step through the tick">
          <TickRing stages={stages} current={current} />
          <StageCard stage={stages[current]} index={current} total={stages.length} />
        </section>

        <section className="panel" aria-labelledby="budget-h">
          <h2 id="budget-h">The 20 ms budget, to scale</h2>
          <TickTimeline />
        </section>

        <section className="panel" aria-labelledby="latency-h">
          <h2 id="latency-h">The network is the cheap part</h2>
          <p className="panel-lede">
            The policy pass uses {p99Pct}% of the tick, so a faster network buys almost nothing here. Delay in the
            loop costs far more. In a second project, 3 steps of action latency cut a nominal-trained policy from{' '}
            {nominal.nominalTrained.success.toFixed(3)} to {laggy.nominalTrained.success.toFixed(3)} success. The
            same policy, fine-tuned with domain randomization that includes 0 to 2 steps of latency, held{' '}
            {laggy.drFineTuned.success.toFixed(3)}.
          </p>
          <LatencyChart />
        </section>
      </main>

      <footer className="foot">
        <p>Every number on this page has a source. A stage without one says not measured.</p>
        <p>Chapter 1 of 5. Chapters 2 to 5 are planned.</p>
      </footer>
    </div>
  )
}
