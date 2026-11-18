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
import { steps as ddsSteps, dds } from './content/dds'
import { QosChecker, ProfilesTable } from './components/QosChecker'
import { steps as gapSteps, sim2real, armGap, duckTrap } from './content/sim2real'
import { BarGroups } from './components/BarGroups'
import { SourceList } from './components/SourceList'
import { steps as vlaSteps, vla, scaling } from './content/vla'
import { ChunkTimer } from './components/ChunkTimer'

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

function DdsPanels() {
  return (
    <>
      <section className="panel" aria-labelledby="qos-h">
        <h2 id="qos-h">Will these two connect?</h2>
        <p className="panel-lede">
          Pick what each side asks for. ROS 2 checks each policy separately, and one mismatch is enough to stop all
          messages.
        </p>
        <QosChecker />
      </section>
      <section className="panel" aria-labelledby="profiles-h">
        <h2 id="profiles-h">The two profiles you meet first</h2>
        <ProfilesTable />
      </section>
    </>
  )
}

const ARM_SERIES = [
  { name: 'Trained on nominal physics', cls: 's1' },
  { name: 'Fine-tuned with domain randomization', cls: 's2' },
] as const
const DUCK_SERIES = [
  { name: 'Trained on nominal physics', cls: 's1' },
  { name: 'Trained with domain randomization', cls: 's2' },
] as const

function Sim2RealPanels() {
  const { meanDrop } = armGap
  const { height, rollers } = duckTrap
  const cm = (m: number) => (m * 100).toFixed(1)
  return (
    <>
      <section className="panel" aria-labelledby="holdout-h">
        <h2 id="holdout-h">Every cell the arm never trained on</h2>
        <p className="panel-lede">
          Mean drop from each policy&apos;s own nominal score over the {meanDrop.cells} held-out cells:{' '}
          {meanDrop.nominal.toFixed(3)} for the nominal-trained policy, {meanDrop.dr.toFixed(3)} after the fine-tune
          with domain randomization. Almost all of the gain is on one cell, three steps of action latency.
        </p>
        <BarGroups
          id="arm"
          series={[...ARM_SERIES]}
          rows={armGap.cells.map((c) => ({
            label: c.name,
            note: c.note,
            values: [
              { v: c.nominal[0], sd: c.nominal[1] },
              { v: c.dr[0], sd: c.dr[1] },
            ],
          }))}
          unit="success rate"
          rowHeader="Physics cell"
          digits={3}
          caption={
            <>
              Simulated arm lifting a cube. {armGap.protocol} {armGap.caveat}
              <SourceList sources={armGap.sources} />
            </>
          }
        />
      </section>
      <section className="panel" aria-labelledby="trap-h">
        <h2 id="trap-h">A metric the policy gamed</h2>
        <p className="panel-lede">
          On its own training model, the biped trained with domain randomization never falls and is upright less
          often. Its median trunk height is {cm(height.dr)} cm against {cm(height.standing)} cm standing: a low, tilted
          crouch that passes the 4 cm survival check and fails the tilt check. On the held-out rollers model it scored{' '}
          {rollers.dr} return of {rollers.max}, against {rollers.nominal} for the nominal policy.
        </p>
        <BarGroups
          id="duck"
          series={[...DUCK_SERIES]}
          rows={duckTrap.metrics.map((m) => ({ label: m.name, values: [{ v: m.nominal }, { v: m.dr }] }))}
          unit="fraction"
          rowHeader="Metric"
          digits={2}
          caption={
            <>
              Simulated 14-joint biped on its training model. {duckTrap.caveat}
              <SourceList sources={duckTrap.sources} />
            </>
          }
        />
      </section>
    </>
  )
}

const IL_SERIES = [
  { name: 'One action per step', cls: 's1' },
  { name: 'Chunk of 20 actions (ACTLite)', cls: 's2' },
] as const

function VlaPanels() {
  return (
    <>
      <section className="panel" aria-labelledby="scaling-h">
        <h2 id="scaling-h">More demonstrations do not rescue one step at a time</h2>
        <p className="panel-lede">
          Same demonstrations, same image encoder family, same L1 loss. Only the output differs: one action per step,
          or a chunk of 20.
        </p>
        <BarGroups
          id="scaling"
          series={[...IL_SERIES]}
          rows={scaling.rows.map((r) => ({
            label: `${r.demos} demonstrations`,
            values: [
              { v: r.image[0], sd: r.image[1] },
              { v: r.act[0], sd: r.act[1] },
            ],
          }))}
          unit="lift success"
          rowHeader="Demonstrations"
          digits={2}
          caption={
            <>
              Simulated arm lifting a cube. {scaling.protocol} {scaling.caveat}
              <SourceList sources={scaling.sources} />
            </>
          }
        />
      </section>
      <section className="panel" aria-labelledby="timing-h">
        <h2 id="timing-h">Will the chunk cover its own inference?</h2>
        <p className="panel-lede">
          A 500M-parameter VLA, timed on this project&apos;s CPU. Drag the chunk length and watch how long the arm waits.
        </p>
        <ChunkTimer />
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
  {
    n: 3,
    route: 'dds',
    title: 'DDS and QoS',
    stages: ddsSteps,
    unit: 'Step',
    budgetLabel: 'Setting',
    restartLabel: 'Next message',
    ringLabel: 'Steps of one ROS 2 message, in order',
    loopNote: 'Step 7 finishes one message; the next sample starts at step 2.',
    intro: (
      <>
        Follow one ROS 2 message from publish() to the subscription callback, and see which QoS policy acts at each
        step. {dds.example}
      </>
    ),
    panels: DdsPanels,
  },
  {
    n: 4,
    route: 'sim2real',
    title: 'The sim-to-real gap',
    stages: gapSteps,
    unit: 'Step',
    budgetLabel: 'Used here',
    restartLabel: 'Next experiment',
    ringLabel: 'Steps of one sim-to-real gap measurement, in order',
    loopNote: 'Step 7 designs the next experiment, which starts again at step 1.',
    intro: (
      <>
        Measure how much a policy loses when the physics changes, without a real robot. Each step shows what two
        simulated projects did, how the measurement fails, and the source. {sim2real.example}
      </>
    ),
    panels: Sim2RealPanels,
  },
  {
    n: 5,
    route: 'vla',
    title: 'VLA action chunking',
    stages: vlaSteps,
    unit: 'Step',
    budgetLabel: 'Used here',
    restartLabel: 'Next chunk',
    ringLabel: 'Steps of one action chunk, in order',
    loopNote: 'Steps 4 and 7 happen offline, in training and evaluation. The others run for every chunk.',
    intro: (
      <>
        Follow one action chunk from camera frame to joint targets: why predicting many steps at once beats one, and
        what it costs when the model is large. {vla.example}
      </>
    ),
    panels: VlaPanels,
  },
]


function parseHash(): { ch: Chapter; index: number } {
  const m = window.location.hash.match(/^#\/([a-z0-9]+)\/(\d+)$/)
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
      </footer>
    </div>
  )
}
