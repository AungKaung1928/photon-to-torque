import { useState } from 'react'
import { checkQos, qosDocs, profiles, rmwProfiles } from '../content/dds'
import type { QosSide, Reliability, Durability, Liveliness } from '../content/dds'
import { SourceList } from './SourceList'

const SENSOR: QosSide = { reliability: 'best_effort', durability: 'volatile', liveliness: 'automatic', deadlineMs: null, leaseMs: null }
const DEFAULT: QosSide = { reliability: 'reliable', durability: 'volatile', liveliness: 'automatic', deadlineMs: null, leaseMs: null }

const PRESETS = [
  { id: 'sensor-vs-default', label: 'Sensor-data publisher, default subscription', pub: SENSOR, sub: DEFAULT },
  { id: 'both-default', label: 'Both default', pub: DEFAULT, sub: DEFAULT },
  {
    id: 'latched',
    label: 'Map topic, both transient local',
    pub: { ...DEFAULT, durability: 'transient_local' as Durability },
    sub: { ...DEFAULT, durability: 'transient_local' as Durability },
  },
  {
    id: 'deadline',
    label: 'Subscription wants a message every 20 ms, publisher promises 50 ms',
    pub: { ...DEFAULT, deadlineMs: 50 },
    sub: { ...DEFAULT, deadlineMs: 20 },
  },
]

const DURATIONS = [null, 20, 50, 100, 500, 1000]

function Side({ who, side, onChange }: { who: 'pub' | 'sub'; side: QosSide; onChange: (s: QosSide) => void }) {
  const id = (k: string) => `qos-${who}-${k}`
  const ms = (v: string) => (v === 'default' ? null : Number(v))
  return (
    <fieldset className="qos-side">
      <legend>{who === 'pub' ? 'Publisher offers' : 'Subscription requests'}</legend>
      <label htmlFor={id('reliability')}>Reliability</label>
      <select id={id('reliability')} value={side.reliability} onChange={(e) => onChange({ ...side, reliability: e.target.value as Reliability })}>
        <option value="best_effort">best effort</option>
        <option value="reliable">reliable</option>
      </select>
      <label htmlFor={id('durability')}>Durability</label>
      <select id={id('durability')} value={side.durability} onChange={(e) => onChange({ ...side, durability: e.target.value as Durability })}>
        <option value="volatile">volatile</option>
        <option value="transient_local">transient local</option>
      </select>
      <label htmlFor={id('deadline')}>Deadline</label>
      <select id={id('deadline')} value={side.deadlineMs ?? 'default'} onChange={(e) => onChange({ ...side, deadlineMs: ms(e.target.value) })}>
        {DURATIONS.map((d) => (
          <option key={String(d)} value={d ?? 'default'}>
            {d === null ? 'default' : `${d} ms`}
          </option>
        ))}
      </select>
      <label htmlFor={id('liveliness')}>Liveliness</label>
      <select id={id('liveliness')} value={side.liveliness} onChange={(e) => onChange({ ...side, liveliness: e.target.value as Liveliness })}>
        <option value="automatic">automatic</option>
        <option value="manual_by_topic">manual by topic</option>
      </select>
      <label htmlFor={id('lease')}>Lease duration</label>
      <select id={id('lease')} value={side.leaseMs ?? 'default'} onChange={(e) => onChange({ ...side, leaseMs: ms(e.target.value) })}>
        {DURATIONS.map((d) => (
          <option key={String(d)} value={d ?? 'default'}>
            {d === null ? 'default' : `${d} ms`}
          </option>
        ))}
      </select>
    </fieldset>
  )
}

export function QosChecker() {
  const [pub, setPub] = useState<QosSide>(PRESETS[0].pub)
  const [sub, setSub] = useState<QosSide>(PRESETS[0].sub)
  const results = checkQos(pub, sub)
  const ok = results.every((r) => r.ok)
  return (
    <div className="qos">
      <div className="presets" role="group" aria-label="Load an example pair">
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
            {p.label}
          </button>
        ))}
      </div>
      <div className="qos-grid">
        <Side who="pub" side={pub} onChange={setPub} />
        <Side who="sub" side={sub} onChange={setSub} />
        <section className="qos-result" aria-live="polite" aria-label="Result">
          <p className={ok ? 'status good' : 'status bad'}>
            <span className="status-mark" aria-hidden="true" />
            {ok ? 'Connected: messages flow' : 'No connection: no messages, no error'}
          </p>
          <ul>
            {results.map((r) => (
              <li key={r.policy} className={r.ok ? 'good' : 'bad'}>
                <span className="r-tag">{r.ok ? 'OK' : 'Blocks'}</span>
                <span className="r-policy">{r.policy}</span>
                <span className="r-why">{r.why}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <p className="muted small-note">
        Opens on an example pair. Lifespan, history and depth do not affect matching, so they are not here.
      </p>
      <SourceList sources={[{ ...qosDocs, label: `${qosDocs.label}, compatibility tables` }]} />
    </div>
  )
}

export function ProfilesTable() {
  return (
    <figure className="diag">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Policy</th>
              <th scope="col">Default profile</th>
              <th scope="col">Sensor data profile</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
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
        A default subscription asks for reliable, so it never connects to a sensor-data publisher. The reverse pair
        works: a best-effort subscription accepts a reliable publisher.
        <SourceList sources={[rmwProfiles]} />
      </figcaption>
    </figure>
  )
}
