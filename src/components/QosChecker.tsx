import { useState } from 'react'
import { checkQos } from '../content/dds'
import type { QosSide, Reliability, Durability, Liveliness } from '../content/dds'
import { useContent } from '../content'
import { useLang } from '../i18n'
import { SourceList } from './SourceList'

const SENSOR: QosSide = { reliability: 'best_effort', durability: 'volatile', liveliness: 'automatic', deadlineMs: null, leaseMs: null }
const DEFAULT: QosSide = { reliability: 'reliable', durability: 'volatile', liveliness: 'automatic', deadlineMs: null, leaseMs: null }

const PRESETS = [
  { id: 'sensor-vs-default', pub: SENSOR, sub: DEFAULT },
  { id: 'both-default', pub: DEFAULT, sub: DEFAULT },
  {
    id: 'latched',
    pub: { ...DEFAULT, durability: 'transient_local' as Durability },
    sub: { ...DEFAULT, durability: 'transient_local' as Durability },
  },
  {
    id: 'deadline',
    pub: { ...DEFAULT, deadlineMs: 50 },
    sub: { ...DEFAULT, deadlineMs: 20 },
  },
]

const DURATIONS = [null, 20, 50, 100, 500, 1000]

const UI = {
  en: {
    presets: {
      'sensor-vs-default': 'Sensor-data publisher, default subscription',
      'both-default': 'Both default',
      latched: 'Map topic, both transient local',
      deadline: 'Subscription wants a message every 20 ms, publisher promises 50 ms',
    } as Record<string, string>,
    pubOffers: 'Publisher offers',
    subRequests: 'Subscription requests',
    reliability: 'Reliability',
    durability: 'Durability',
    deadline: 'Deadline',
    liveliness: 'Liveliness',
    lease: 'Lease duration',
    bestEffort: 'best effort',
    reliable: 'reliable',
    volatile: 'volatile',
    transientLocal: 'transient local',
    automatic: 'automatic',
    manualByTopic: 'manual by topic',
    durDefault: 'default',
    loadExample: 'Load an example pair',
    result: 'Result',
    connected: 'Connected: messages flow',
    blocked: 'No connection: no messages, no error',
    ok: 'OK',
    blocks: 'Blocks',
    note: 'Opens on an example pair. Lifespan, history and depth do not affect matching, so they are not here.',
    colPolicy: 'Policy',
    colDefault: 'Default profile',
    colSensor: 'Sensor data profile',
    caption:
      'A default subscription asks for reliable, so it never connects to a sensor-data publisher. The reverse pair works: a best-effort subscription accepts a reliable publisher.',
  },
  ja: {
    presets: {
      'sensor-vs-default': 'センサーデータのパブリッシャ、デフォルトのサブスクリプション',
      'both-default': '両方デフォルト',
      latched: '地図トピック、両方 transient local',
      deadline: 'サブスクリプションは 20 ms ごとのメッセージを要求、パブリッシャは 50 ms を保証',
    } as Record<string, string>,
    pubOffers: 'パブリッシャの提示',
    subRequests: 'サブスクリプションの要求',
    reliability: '信頼性 (Reliability)',
    durability: '耐久性 (Durability)',
    deadline: 'デッドライン',
    liveliness: 'ライブネス',
    lease: 'リース期間',
    bestEffort: 'best effort',
    reliable: 'reliable',
    volatile: 'volatile',
    transientLocal: 'transient local',
    automatic: 'automatic',
    manualByTopic: 'manual by topic',
    durDefault: 'デフォルト',
    loadExample: '例のペアを読み込む',
    result: '結果',
    connected: '接続あり: メッセージが流れます',
    blocked: '接続なし: メッセージもエラーもありません',
    ok: 'OK',
    blocks: 'NG',
    note: '例のペアで開きます。lifespan、history、depth はマッチングに影響しないため、ここにはありません。',
    colPolicy: 'QoS ポリシー',
    colDefault: 'デフォルトプロファイル',
    colSensor: 'センサーデータプロファイル',
    caption:
      'デフォルトのサブスクリプションは reliable を要求するため、センサーデータのパブリッシャには決して接続しません。逆の組み合わせなら接続できます。best effort のサブスクリプションは reliable のパブリッシャを受け入れます。',
  },
}

function Side({ who, side, onChange }: { who: 'pub' | 'sub'; side: QosSide; onChange: (s: QosSide) => void }) {
  const id = (k: string) => `qos-${who}-${k}`
  const ms = (v: string) => (v === 'default' ? null : Number(v))
  const t = UI[useLang()]
  return (
    <fieldset className="qos-side">
      <legend>{who === 'pub' ? t.pubOffers : t.subRequests}</legend>
      <label htmlFor={id('reliability')}>{t.reliability}</label>
      <select id={id('reliability')} value={side.reliability} onChange={(e) => onChange({ ...side, reliability: e.target.value as Reliability })}>
        <option value="best_effort">{t.bestEffort}</option>
        <option value="reliable">{t.reliable}</option>
      </select>
      <label htmlFor={id('durability')}>{t.durability}</label>
      <select id={id('durability')} value={side.durability} onChange={(e) => onChange({ ...side, durability: e.target.value as Durability })}>
        <option value="volatile">{t.volatile}</option>
        <option value="transient_local">{t.transientLocal}</option>
      </select>
      <label htmlFor={id('deadline')}>{t.deadline}</label>
      <select id={id('deadline')} value={side.deadlineMs ?? 'default'} onChange={(e) => onChange({ ...side, deadlineMs: ms(e.target.value) })}>
        {DURATIONS.map((d) => (
          <option key={String(d)} value={d ?? 'default'}>
            {d === null ? t.durDefault : `${d} ms`}
          </option>
        ))}
      </select>
      <label htmlFor={id('liveliness')}>{t.liveliness}</label>
      <select id={id('liveliness')} value={side.liveliness} onChange={(e) => onChange({ ...side, liveliness: e.target.value as Liveliness })}>
        <option value="automatic">{t.automatic}</option>
        <option value="manual_by_topic">{t.manualByTopic}</option>
      </select>
      <label htmlFor={id('lease')}>{t.lease}</label>
      <select id={id('lease')} value={side.leaseMs ?? 'default'} onChange={(e) => onChange({ ...side, leaseMs: ms(e.target.value) })}>
        {DURATIONS.map((d) => (
          <option key={String(d)} value={d ?? 'default'}>
            {d === null ? t.durDefault : `${d} ms`}
          </option>
        ))}
      </select>
    </fieldset>
  )
}

export function QosChecker() {
  const [pub, setPub] = useState<QosSide>(PRESETS[0].pub)
  const [sub, setSub] = useState<QosSide>(PRESETS[0].sub)
  const { dds } = useContent()
  const t = UI[useLang()]
  const results = checkQos(pub, sub, dds.qosText)
  const ok = results.every((r) => r.ok)
  return (
    <div className="qos">
      <div className="presets" role="group" aria-label={t.loadExample}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            id={`qos-preset-${p.id}`}
            type="button"
            className="btn small"
            onClick={() => {
              setPub(p.pub)
              setSub(p.sub)
            }}
          >
            {t.presets[p.id]}
          </button>
        ))}
      </div>
      <div className="qos-grid">
        <Side who="pub" side={pub} onChange={setPub} />
        <Side who="sub" side={sub} onChange={setSub} />
        <section className="qos-result" aria-live="polite" aria-label={t.result}>
          <p className={ok ? 'status good' : 'status bad'}>
            <span className="status-mark" aria-hidden="true" />
            {ok ? t.connected : t.blocked}
          </p>
          <ul>
            {results.map((r) => (
              <li key={r.policy} className={r.ok ? 'good' : 'bad'}>
                <span className="r-tag">{r.ok ? t.ok : t.blocks}</span>
                <span className="r-policy">{r.policy}</span>
                <span className="r-why">{r.why}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <p className="muted small-note">{t.note}</p>
      <SourceList sources={[{ ...dds.qosDocs, label: `${dds.qosDocs.label}, compatibility tables` }]} />
    </div>
  )
}

export function ProfilesTable() {
  const { dds } = useContent()
  const t = UI[useLang()]
  return (
    <figure className="diag">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">{t.colPolicy}</th>
              <th scope="col">{t.colDefault}</th>
              <th scope="col">{t.colSensor}</th>
            </tr>
          </thead>
          <tbody>
            {dds.profiles.map((p) => (
              <tr key={p.policy}>
                <th scope="row">{p.policy}</th>
                <td>{p.defaults}</td>
                <td>{p.sensor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption>
        {t.caption}
        <SourceList sources={[dds.rmwProfiles]} />
      </figcaption>
    </figure>
  )
}
