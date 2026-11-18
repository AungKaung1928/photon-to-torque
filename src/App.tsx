import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { stages, tick, timing, latencyGap } from './content/tick'
import type { Stage } from './content/tick'
import { steps as ppoSteps, ppo } from './content/ppo'
import { StageRing } from './components/StageRing'
import { StageCard } from './components/StageCard'
import { TickTimeline } from './components/TickTimeline'
import { LatencyChart } from './components/LatencyChart'
import { ClipPlot } from './components/ClipPlot'
import { DiagTable } from './components/DiagTable'

interface Chapter {
  n: number
  route: string
  title: string
  stages: Stage[]
  unit: string
  budgetLabel: string
  restartLabel: string
  ringLabel: string
  loopNote: string
  intro: ReactNode
  panels: () => ReactNode
}

function TickPanels() {
  const p99Pct = ((timing.policyP99Ms / timing.tickMs) * 100).toFixed(2)
  const [nominal, laggy] = latencyGap.rows
  return (
    <>
      <section className="panel" aria-labelledby="budget-h">
        <h2 id="budget-h">The 20 ms budget, to scale</h2>
        <TickTimeline />
      </section>
      <section className="panel" aria-labelledby="latency-h">
        <h2 id="latency-h">The network is the cheap part</h2>
        <p className="panel-lede">
          The policy pass uses {p99Pct}% of the tick, so a faster network buys almost nothing here. Delay in the loop
          costs far more. In a second project, 3 steps of action latency cut a nominal-trained policy from{' '}
          {nominal.nominalTrained.success.toFixed(3)} to {laggy.nominalTrained.success.toFixed(3)} success. The same
          policy, fine-tuned with domain randomization that includes 0 to 2 steps of latency, held{' '}
          {laggy.drFineTuned.success.toFixed(3)}.
        </p>
        <LatencyChart />
      </section>
    </>
  )
}

function PpoPanels() {
  return (
    <>
      <section className="panel" aria-labelledby="clip-h">
        <h2 id="clip-h">What the clip does to one sample</h2>
        <ClipPlot />
      </section>
      <section className="panel" aria-labelledby="diag-h">
        <h2 id="diag-h">What the diagnostics caught</h2>
        <p className="panel-lede">
          The first 25M steps ran without a KL stop. Every update moved the policy further than the clip is meant to
          allow, and the return did not improve. The second 25M steps added a target KL of 0.02.
        </p>
        <DiagTable />
      </section>
    </>
  )
}

const CHAPTERS: Chapter[] = [
  {
    n: 1,
    route: 'tick',
    title: 'One control tick',
    stages,
    unit: 'Stage',
    budgetLabel: 'Budget',
    restartLabel: 'Start next tick',
    ringLabel: 'Stages of one control tick, in order',
    loopNote: 'Stage 8 feeds stage 1 of the next tick.',
    intro: (
      <>
        Follow one decision of a walking robot from sensor to motor torque. Each stage shows what happens, its time
        budget, how it fails, and where the number comes from. {tick.example}
      </>
    ),
    panels: TickPanels,
  },
  {
    n: 2,
    route: 'ppo',
    title: 'One PPO update',
    stages: ppoSteps,
    unit: 'Step',
    budgetLabel: 'Setting',
    restartLabel: 'Start next update',
    ringLabel: 'Steps of one PPO update, in order',
    loopNote: 'Step 7 hands the new policy to step 1 of the next update.',
    intro: (
      <>
        Follow one training update of the same robot&apos;s policy, from collecting data to the gradient step. Each
        step shows the setting used, how it fails, and the source. {ppo.example}
      </>
    ),
    panels: PpoPanels,
  },
]

const PLANNED = [
  { n: 3, title: 'DDS and QoS' },
  { n: 4, title: 'The sim-to-real gap' },
  { n: 5, title: 'VLA action chunking' },
]

function parseHash(): { ch: Chapter; index: number } {
  const m = window.location.hash.match(/^#\/([a-z]+)\/(\d+)$/)
  const ch = CHAPTERS.find((c) => c.route === m?.[1]) ?? CHAPTERS[0]
  const n = m ? Number(m[2]) : 1
  return { ch, index: n >= 1 && n <= ch.stages.length ? n - 1 : 0 }
}

function go(ch: Chapter, index: number) {
  const len = ch.stages.length
  const n = ((index % len) + len) % len
  window.location.hash = `#/${ch.route}/${n + 1}`
}

export default function App() {
  const [{ ch, index }, setPos] = useState(parseHash)

  useEffect(() => {
    const onHash = () => setPos(parseHash())
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      const now = parseHash()
      if (e.key === 'ArrowRight') go(now.ch, now.index + 1)
      if (e.key === 'ArrowLeft') go(now.ch, now.index - 1)
    }
    window.addEventListener('hashchange', onHash)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    document.title = `${ch.title} · Photon to Torque`
  }, [ch])

  const Panels = ch.panels

  return (
    <div className="page">
      <header className="masthead">
        <p className="brand">Photon to Torque</p>
        <nav aria-label="Chapters">
          <ol className="chapters">
            {CHAPTERS.map((c) => (
              <li key={c.n} className="ready">
                <a
                  id={`chapter-${c.n}`}
                  href={`#/${c.route}/1`}
                  aria-current={c.n === ch.n ? 'page' : undefined}
                >
                  <span className="ch-n">{c.n}</span> <span className="ch-title">{c.title}</span>
                </a>
              </li>
            ))}
            {PLANNED.map((c) => (
              <li key={c.n} className="planned">
                <span className="ch-n">{c.n}</span>
                <span className="ch-title">{c.title}</span>
                <span className="ch-state">planned</span>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <main>
        <section className="intro">
          <p className="eyebrow">Chapter {ch.n}</p>
          <h1>{ch.title}</h1>
          <p>{ch.intro}</p>
        </section>

        <section className="bench" aria-label={ch.ringLabel}>
          <StageRing
            stages={ch.stages}
            current={index}
            route={ch.route}
            unit={ch.unit}
            label={ch.ringLabel}
            loopNote={ch.loopNote}
          />
          <StageCard
            stage={ch.stages[index]}
            index={index}
            total={ch.stages.length}
            route={ch.route}
            unit={ch.unit}
            budgetLabel={ch.budgetLabel}
            restartLabel={ch.restartLabel}
          />
        </section>

        <Panels />
      </main>

      <footer className="foot">
        <p>Every number on this page has a source. A stage without one says not measured.</p>
        <p>
          {CHAPTERS.length} of {CHAPTERS.length + PLANNED.length} chapters written.
        </p>
      </footer>
    </div>
  )
}
