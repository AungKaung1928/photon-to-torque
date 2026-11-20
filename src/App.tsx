import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Stage } from './content/tick'
import { StageRing } from './components/StageRing'
import { StageCard } from './components/StageCard'
import { TickTimeline } from './components/TickTimeline'
import { LatencyChart } from './components/LatencyChart'
import { ClipPlot } from './components/ClipPlot'
import { DiagTable } from './components/DiagTable'
import { QosChecker, ProfilesTable } from './components/QosChecker'
import { BarGroups } from './components/BarGroups'
import { SourceList } from './components/SourceList'
import { ChunkTimer } from './components/ChunkTimer'
import { ReplayPlot } from './components/ReplayPlot'
import { CONTENT, useContent } from './content'
import type { Content } from './content'
import { LangContext, initialLang, saveLang, useLang } from './i18n'
import type { Lang } from './i18n'
import { parseRoute, wrapIndex } from './lib/route'

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
  const lang = useLang()
  const { timing, latencyGap } = useContent().tick
  const p99Pct = ((timing.policyP99Ms / timing.tickMs) * 100).toFixed(2)
  const [nominal, laggy] = latencyGap.rows
  const a = nominal.nominalTrained.success.toFixed(3)
  const b = laggy.nominalTrained.success.toFixed(3)
  const c = laggy.drFineTuned.success.toFixed(3)
  return (
    <>
      <section className="panel" aria-labelledby="budget-h">
        <h2 id="budget-h">{lang === 'ja' ? '20 ms の時間予算(実寸比)' : 'The 20 ms budget, to scale'}</h2>
        <TickTimeline />
      </section>
      <section className="panel" aria-labelledby="latency-h">
        <h2 id="latency-h">{lang === 'ja' ? 'ニューラルネットはコストの小さい部分' : 'The network is the cheap part'}</h2>
        <p className="panel-lede">
          {lang === 'ja' ? (
            <>
              ポリシーの推論はティックの {p99Pct}% しか使わないので、ニューラルネットを速くしてもここではほとんど得になりません。ループ内の遅延のほうがはるかに高くつきます。別のプロジェクトでは、3
              ステップの行動レイテンシで、ノミナル物理で学習したポリシーの成功率が {a} から {b} に落ちました。0〜2
              ステップのレイテンシを含むドメインランダマイゼーションでファインチューニングした同じポリシーは {c} を保ちました。
            </>
          ) : (
            <>
              The policy pass uses {p99Pct}% of the tick, so a faster network buys almost nothing here. Delay in the
              loop costs far more. In a second project, 3 steps of action latency cut a nominal-trained policy from {a}{' '}
              to {b} success. The same policy, fine-tuned with domain randomization that includes 0 to 2 steps of
              latency, held {c}.
            </>
          )}
        </p>
        <LatencyChart />
      </section>
    </>
  )
}

function PpoPanels() {
  const lang = useLang()
  return (
    <>
      <section className="panel" aria-labelledby="clip-h">
        <h2 id="clip-h">{lang === 'ja' ? 'クリップが 1 サンプルに与える影響' : 'What the clip does to one sample'}</h2>
        <ClipPlot />
      </section>
      <section className="panel" aria-labelledby="diag-h">
        <h2 id="diag-h">{lang === 'ja' ? '診断指標が捉えたこと' : 'What the diagnostics caught'}</h2>
        <p className="panel-lede">
          {lang === 'ja'
            ? '前半 25M ステップは KL 停止なしで実行しました。毎回の更新でポリシーはクリップが許すはずの範囲を超えて動き、リターンは改善しませんでした。後半 25M ステップでは目標 KL 0.02 を追加しました。'
            : 'The first 25M steps ran without a KL stop. Every update moved the policy further than the clip is meant to allow, and the return did not improve. The second 25M steps added a target KL of 0.02.'}
        </p>
        <DiagTable />
      </section>
    </>
  )
}

function DdsPanels() {
  const lang = useLang()
  return (
    <>
      <section className="panel" aria-labelledby="qos-h">
        <h2 id="qos-h">{lang === 'ja' ? 'この 2 つはつながるか' : 'Will these two connect?'}</h2>
        <p className="panel-lede">
          {lang === 'ja'
            ? 'それぞれの側の要求を選んでください。ROS 2 は QoS ポリシーを 1 つずつ確認し、1 つでも不一致があればメッセージはすべて届きません。'
            : 'Pick what each side asks for. ROS 2 checks each policy separately, and one mismatch is enough to stop all messages.'}
        </p>
        <QosChecker />
      </section>
      <section className="panel" aria-labelledby="profiles-h">
        <h2 id="profiles-h">{lang === 'ja' ? '最初に出会う 2 つのプロファイル' : 'The two profiles you meet first'}</h2>
        <ProfilesTable />
      </section>
    </>
  )
}

const SERIES = {
  en: { nominal: 'Trained on nominal physics', drFine: 'Fine-tuned with domain randomization', dr: 'Trained with domain randomization' },
  ja: {
    nominal: 'ノミナル物理で学習',
    drFine: 'ドメインランダマイゼーションでファインチューニング',
    dr: 'ドメインランダマイゼーションで学習',
  },
}
const ARM_CAPTION = { en: 'Simulated arm lifting a cube.', ja: 'キューブを持ち上げるシミュレーション上のアーム。' }

function Sim2RealPanels() {
  const lang = useLang()
  const { armGap, duckTrap } = useContent().sim2real
  const { meanDrop } = armGap
  const { height, rollers } = duckTrap
  const cm = (m: number) => (m * 100).toFixed(1)
  const s = SERIES[lang]
  return (
    <>
      <section className="panel" aria-labelledby="holdout-h">
        <h2 id="holdout-h">{lang === 'ja' ? 'アームが一度も学習していない全セル' : 'Every cell the arm never trained on'}</h2>
        <p className="panel-lede">
          {lang === 'ja' ? (
            <>
              {meanDrop.cells} 個のホールドアウトセルで、各ポリシー自身のノミナルスコアからの平均低下量は、ノミナル物理で学習したポリシーで{' '}
              {meanDrop.nominal.toFixed(3)}、ドメインランダマイゼーションでファインチューニングした後で {meanDrop.dr.toFixed(3)}{' '}
              です。改善のほぼすべては 1 つのセル、3 ステップの行動レイテンシによるものです。
            </>
          ) : (
            <>
              Mean drop from each policy&apos;s own nominal score over the {meanDrop.cells} held-out cells:{' '}
              {meanDrop.nominal.toFixed(3)} for the nominal-trained policy, {meanDrop.dr.toFixed(3)} after the
              fine-tune with domain randomization. Almost all of the gain is on one cell, three steps of action latency.
            </>
          )}
        </p>
        <BarGroups
          id="arm"
          series={[
            { name: s.nominal, cls: 's1' },
            { name: s.drFine, cls: 's2' },
          ]}
          rows={armGap.cells.map((c) => ({
            label: c.name,
            note: c.note,
            values: [
              { v: c.nominal[0], sd: c.nominal[1] },
              { v: c.dr[0], sd: c.dr[1] },
            ],
          }))}
          unit={lang === 'ja' ? '成功率' : 'success rate'}
          rowHeader={lang === 'ja' ? '物理セル' : 'Physics cell'}
          digits={3}
          caption={
            <>
              {ARM_CAPTION[lang]} {armGap.protocol} {armGap.caveat}
              <SourceList sources={armGap.sources} />
            </>
          }
        />
      </section>
      <section className="panel" aria-labelledby="trap-h">
        <h2 id="trap-h">{lang === 'ja' ? 'ポリシーが抜け道を見つけた指標' : 'A metric the policy gamed'}</h2>
        <p className="panel-lede">
          {lang === 'ja' ? (
            <>
              ドメインランダマイゼーションで学習した二足ロボットは、自身の学習用モデル上では一度も転倒しませんが、直立している割合は低くなります。胴体高さの中央値は{' '}
              {cm(height.dr)} cm で、直立時は {cm(height.standing)} cm です。4 cm
              の生存判定は通り、傾き判定には落ちる、低く傾いたしゃがみ姿勢です。ホールドアウトの rollers モデルでは、リターン{' '}
              {rollers.max} 中 {rollers.dr} で、ノミナルポリシーは {rollers.nominal} でした。
            </>
          ) : (
            <>
              On its own training model, the biped trained with domain randomization never falls and is upright less
              often. Its median trunk height is {cm(height.dr)} cm against {cm(height.standing)} cm standing: a low,
              tilted crouch that passes the 4 cm survival check and fails the tilt check. On the held-out rollers model
              it scored {rollers.dr} return of {rollers.max}, against {rollers.nominal} for the nominal policy.
            </>
          )}
        </p>
        <BarGroups
          id="duck"
          series={[
            { name: s.nominal, cls: 's1' },
            { name: s.dr, cls: 's2' },
          ]}
          rows={duckTrap.metrics.map((m) => ({ label: m.name, values: [{ v: m.nominal }, { v: m.dr }] }))}
          unit={lang === 'ja' ? '割合' : 'fraction'}
          rowHeader={lang === 'ja' ? '指標' : 'Metric'}
          digits={2}
          caption={
            <>
              {lang === 'ja'
                ? '学習用モデル上の、シミュレーションの 14 関節二足ロボット。'
                : 'Simulated 14-joint biped on its training model.'}{' '}
              {duckTrap.caveat}
              <SourceList sources={duckTrap.sources} />
            </>
          }
        />
      </section>
    </>
  )
}

function VlaPanels() {
  const lang = useLang()
  const { scaling } = useContent().vla
  return (
    <>
      <section className="panel" aria-labelledby="scaling-h">
        <h2 id="scaling-h">
          {lang === 'ja'
            ? 'デモを増やしても 1 ステップずつの予測は救えない'
            : 'More demonstrations do not rescue one step at a time'}
        </h2>
        <p className="panel-lede">
          {lang === 'ja'
            ? 'デモも、画像エンコーダの系統も、L1 損失も同じです。違うのは出力だけで、1 ステップに 1 行動か、20 行動のチャンクかです。'
            : 'Same demonstrations, same image encoder family, same L1 loss. Only the output differs: one action per step, or a chunk of 20.'}
        </p>
        <BarGroups
          id="scaling"
          series={[
            { name: lang === 'ja' ? '1 ステップに 1 行動' : 'One action per step', cls: 's1' },
            { name: lang === 'ja' ? '20 行動のチャンク (ACTLite)' : 'Chunk of 20 actions (ACTLite)', cls: 's2' },
          ]}
          rows={scaling.rows.map((r) => ({
            label: lang === 'ja' ? `デモ ${r.demos} 件` : `${r.demos} demonstrations`,
            values: [
              { v: r.image[0], sd: r.image[1] },
              { v: r.act[0], sd: r.act[1] },
            ],
          }))}
          unit={lang === 'ja' ? '持ち上げ成功率' : 'lift success'}
          rowHeader={lang === 'ja' ? 'デモ数' : 'Demonstrations'}
          digits={2}
          caption={
            <>
              {ARM_CAPTION[lang]} {scaling.protocol} {scaling.caveat}
              <SourceList sources={scaling.sources} />
            </>
          }
        />
      </section>
      <section className="panel" aria-labelledby="timing-h">
        <h2 id="timing-h">
          {lang === 'ja' ? 'チャンクは自身の推論時間をカバーできるか' : 'Will the chunk cover its own inference?'}
        </h2>
        <p className="panel-lede">
          {lang === 'ja'
            ? '500M パラメータの VLA を、このプロジェクトの CPU で計測しました。チャンク長をドラッグして、アームがどれだけ待つかを見てください。'
            : 'A 500M-parameter VLA, timed on this project’s CPU. Drag the chunk length and watch how long the arm waits.'}
        </p>
        <ChunkTimer />
      </section>
    </>
  )
}

function SysidPanels() {
  const lang = useLang()
  const { fit } = useContent().sysid
  return (
    <>
      <section className="panel" aria-labelledby="replay-h">
        <h2 id="replay-h">{lang === 'ja' ? '実機の指令をシミュレーションで再生する' : 'Real commands, replayed in sim'}</h2>
        <p className="panel-lede">
          {lang === 'ja'
            ? '実機アームの 1 エピソードです。指令、実機のフォロワー、フィットしたサーボを持つシミュレーションのフォロワーを重ねています。遅延をドラッグして、誤差がどう動くかを見てください。'
            : 'One episode of the real arm: the command, the real follower, and the sim follower with the fitted servo. Drag the delay and watch the error.'}
        </p>
        <ReplayPlot />
      </section>
      <section className="panel" aria-labelledby="fit-h">
        <h2 id="fit-h">{lang === 'ja' ? 'ホールドアウトのエピソードでの誤差' : 'Error on held-out episodes'}</h2>
        <figure className="diag">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">{lang === 'ja' ? 'シミュレーションの設定' : 'Sim setting'}</th>
                  <th scope="col" className="num">{lang === 'ja' ? '平均誤差 (度)' : 'Mean error (deg)'}</th>
                </tr>
              </thead>
              <tbody>
                {fit.rows.map((r) => (
                  <tr key={r.err}>
                    <th scope="row">{r.label}</th>
                    <td className="num">{r.err.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <figcaption>
            {fit.caveat}
            <SourceList sources={fit.sources} />
          </figcaption>
        </figure>
      </section>
    </>
  )
}

const UI = {
  en: {
    chapters: 'Chapters',
    chapter: (n: number) => `Chapter ${n}`,
    language: 'Language',
    foot: 'Every number on this page has a source. A stage without one says not measured.',
  },
  ja: {
    chapters: '章',
    chapter: (n: number) => `第 ${n} 章`,
    language: '表示言語',
    foot: 'このページの数値にはすべて出典があります。出典のないステージは「未計測」と表示します。',
  },
}

function chapters(lang: Lang, c: Content): Chapter[] {
  const ja = lang === 'ja'
  return [
    {
      n: 1,
      route: 'tick',
      title: ja ? '1 回の制御ティック' : 'One control tick',
      stages: c.tick.stages,
      unit: ja ? 'ステージ' : 'Stage',
      budgetLabel: ja ? '時間予算' : 'Budget',
      restartLabel: ja ? '次のティックへ' : 'Start next tick',
      ringLabel: ja ? '1 回の制御ティックのステージ(順番)' : 'Stages of one control tick, in order',
      loopNote: ja ? 'ステージ 8 は次のティックのステージ 1 につながります。' : 'Stage 8 feeds stage 1 of the next tick.',
      intro: ja ? (
        <>
          歩行ロボットの 1 回の判断を、センサからモータトルクまで追います。各ステージで、何が起きるか、時間予算、失敗の仕方、数値の出典を示します。
          {c.tick.tick.example}
        </>
      ) : (
        <>
          Follow one decision of a walking robot from sensor to motor torque. Each stage shows what happens, its time
          budget, how it fails, and where the number comes from. {c.tick.tick.example}
        </>
      ),
      panels: TickPanels,
    },
    {
      n: 2,
      route: 'ppo',
      title: ja ? '1 回の PPO 更新' : 'One PPO update',
      stages: c.ppo.steps,
      unit: ja ? 'ステップ' : 'Step',
      budgetLabel: ja ? '設定' : 'Setting',
      restartLabel: ja ? '次の更新へ' : 'Start next update',
      ringLabel: ja ? '1 回の PPO 更新のステップ(順番)' : 'Steps of one PPO update, in order',
      loopNote: ja
        ? 'ステップ 7 は新しいポリシーを次の更新のステップ 1 に渡します。'
        : 'Step 7 hands the new policy to step 1 of the next update.',
      intro: ja ? (
        <>
          同じロボットのポリシーの学習更新 1 回分を、データ収集から勾配ステップまで追います。各ステップで、使った設定、失敗の仕方、出典を示します。
          {c.ppo.ppo.example}
        </>
      ) : (
        <>
          Follow one training update of the same robot&apos;s policy, from collecting data to the gradient step. Each
          step shows the setting used, how it fails, and the source. {c.ppo.ppo.example}
        </>
      ),
      panels: PpoPanels,
    },
    {
      n: 3,
      route: 'dds',
      title: ja ? 'DDS と QoS' : 'DDS and QoS',
      stages: c.dds.steps,
      unit: ja ? 'ステップ' : 'Step',
      budgetLabel: ja ? '設定' : 'Setting',
      restartLabel: ja ? '次のメッセージへ' : 'Next message',
      ringLabel: ja ? '1 つの ROS 2 メッセージのステップ(順番)' : 'Steps of one ROS 2 message, in order',
      loopNote: ja
        ? 'ステップ 7 で 1 つのメッセージが終わり、次のサンプルはステップ 2 から始まります。'
        : 'Step 7 finishes one message; the next sample starts at step 2.',
      intro: ja ? (
        <>
          1 つの ROS 2 メッセージを publish() からサブスクリプションのコールバックまで追い、各ステップでどの QoS
          ポリシーが効くかを見ます。{c.dds.dds.example}
        </>
      ) : (
        <>
          Follow one ROS 2 message from publish() to the subscription callback, and see which QoS policy acts at each
          step. {c.dds.dds.example}
        </>
      ),
      panels: DdsPanels,
    },
    {
      n: 4,
      route: 'sim2real',
      title: ja ? 'sim-to-real ギャップ' : 'The sim-to-real gap',
      stages: c.sim2real.steps,
      unit: ja ? 'ステップ' : 'Step',
      budgetLabel: ja ? 'この例での値' : 'Used here',
      restartLabel: ja ? '次の実験へ' : 'Next experiment',
      ringLabel: ja ? 'sim-to-real ギャップ計測 1 回のステップ(順番)' : 'Steps of one sim-to-real gap measurement, in order',
      loopNote: ja
        ? 'ステップ 7 で次の実験を設計し、再びステップ 1 から始めます。'
        : 'Step 7 designs the next experiment, which starts again at step 1.',
      intro: ja ? (
        <>
          実機なしで、物理が変わったときにポリシーがどれだけ性能を失うかを測ります。各ステップで、2
          つのシミュレーションプロジェクトが何をしたか、計測の失敗の仕方、出典を示します。{c.sim2real.sim2real.example}
        </>
      ) : (
        <>
          Measure how much a policy loses when the physics changes, without a real robot. Each step shows what two
          simulated projects did, how the measurement fails, and the source. {c.sim2real.sim2real.example}
        </>
      ),
      panels: Sim2RealPanels,
    },
    {
      n: 5,
      route: 'vla',
      title: ja ? 'VLA の行動チャンク' : 'VLA action chunking',
      stages: c.vla.steps,
      unit: ja ? 'ステップ' : 'Step',
      budgetLabel: ja ? 'この例での値' : 'Used here',
      restartLabel: ja ? '次のチャンクへ' : 'Next chunk',
      ringLabel: ja ? '1 つの行動チャンクのステップ(順番)' : 'Steps of one action chunk, in order',
      loopNote: ja
        ? 'ステップ 4 と 7 は学習時と評価時にオフラインで行います。それ以外はチャンクごとに実行します。'
        : 'Steps 4 and 7 happen offline, in training and evaluation. The others run for every chunk.',
      intro: ja ? (
        <>
          1
          つの行動チャンクをカメラフレームから関節目標値まで追います。多くのステップを一度に予測すると 1
          ステップずつより強い理由と、モデルが大きいときのコストを見ます。{c.vla.vla.example}
        </>
      ) : (
        <>
          Follow one action chunk from camera frame to joint targets: why predicting many steps at once beats one, and
          what it costs when the model is large. {c.vla.vla.example}
        </>
      ),
      panels: VlaPanels,
    },
    {
      n: 6,
      route: 'sysid',
      title: ja ? '実機に合わせるシステム同定' : 'System ID on a real arm',
      stages: c.sysid.steps,
      unit: ja ? 'ステップ' : 'Step',
      budgetLabel: ja ? '計測値' : 'Measured',
      restartLabel: ja ? '最初のステップへ' : 'Back to the first step',
      ringLabel: ja ? 'システム同定のステップ(順番)' : 'Steps of system identification, in order',
      loopNote: ja
        ? 'ステップ 6 の結果が悪ければ、ステップ 2 から別のパラメータでやり直します。'
        : 'If step 6 shows a gap that matters, go back to step 2 with the parameter it points at.',
      intro: ja ? (
        <>
          公開されている実機アームの記録に、シミュレーションのサーボを合わせます。どのパラメータが決まり、どれが決まらないか、そしてそれが方策に効くかを見ます。{c.sysid.sysid.example}
        </>
      ) : (
        <>
          Fit the simulated servo to a public recording of a real arm: which parameters the data pins down, which it does not, and whether the fit changes how a policy does. {c.sysid.sysid.example}
        </>
      ),
      panels: SysidPanels,
    },
  ]
}

// Routes and stage counts are the same in both languages, so routing reads the English list.
const ROUTES = chapters('en', CONTENT.en)

function parseHash() {
  const { ch, index } = parseRoute(window.location.hash, ROUTES)
  return { n: ch.n, index }
}

function go(n: number, index: number) {
  const ch = ROUTES[n - 1]
  window.location.hash = `#/${ch.route}/${wrapIndex(index, ch.stages.length) + 1}`
}

export default function App() {
  const [{ n, index }, setPos] = useState(parseHash)
  const [lang, setLang] = useState<Lang>(initialLang)
  const list = chapters(lang, CONTENT[lang])
  const ch = list[n - 1]
  const ui = UI[lang]

  useEffect(() => {
    const onHash = () => setPos(parseHash())
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      const now = parseHash()
      if (e.key === 'ArrowRight') go(now.n, now.index + 1)
      if (e.key === 'ArrowLeft') go(now.n, now.index - 1)
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
    document.documentElement.lang = lang
  }, [ch.title, lang])

  const pick = (l: Lang) => {
    setLang(l)
    saveLang(l)
  }

  const Panels = ch.panels

  return (
    <LangContext.Provider value={lang}>
      <div className="page">
        <header className="masthead">
          <p className="brand">Photon to Torque</p>
          <nav aria-label={ui.chapters}>
            <ol className="chapters">
              {list.map((c) => (
                <li key={c.n} className="ready">
                  <a id={`chapter-${c.n}`} href={`#/${c.route}/1`} aria-current={c.n === ch.n ? 'page' : undefined}>
                    <span className="ch-n">{c.n}</span> <span className="ch-title">{c.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="lang-switch" role="group" aria-label={ui.language}>
            <button id="lang-en" type="button" lang="en" aria-pressed={lang === 'en'} onClick={() => pick('en')}>
              EN
            </button>
            <button id="lang-ja" type="button" lang="ja" aria-pressed={lang === 'ja'} onClick={() => pick('ja')}>
              日本語
            </button>
          </div>
        </header>

        <main>
          <section className="intro">
            <p className="eyebrow">{ui.chapter(ch.n)}</p>
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
          <p>{ui.foot}</p>
        </footer>
      </div>
    </LangContext.Provider>
  )
}
