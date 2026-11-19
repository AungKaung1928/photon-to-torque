// Chapter 3: one ROS 2 message, from publish() to the subscription callback.
// No latency numbers here: nothing in this chain has been measured for this app, so settings come from
// the ROS 2 docs and the rmw defaults header, and every budget without a number says so.
import type { Source, Stage } from './tick'

export const qosDocs: Source = {
  label: 'ROS 2 docs (Jazzy): About Quality of Service settings',
  ref: 'https://docs.ros.org/en/jazzy/Concepts/Intermediate/About-Quality-of-Service-Settings.html',
}
export const rmwProfiles: Source = {
  label: 'ros2/rmw qos_profiles.h (Jazzy)',
  ref: 'https://github.com/ros2/rmw/blob/jazzy/rmw/include/rmw/qos_profiles.h',
}
const rtps: Source = { label: 'OMG DDSI-RTPS specification', ref: 'https://www.omg.org/spec/DDSI-RTPS/' }
const executors: Source = {
  label: 'ROS 2 docs (Jazzy): Executors',
  ref: 'https://docs.ros.org/en/jazzy/Concepts/Intermediate/About-Executors.html',
}

export const dds = {
  example:
    'Running example: the action topic from chapter 1, published at 50 Hz by the policy node and read by the controller node.',
  sources: [qosDocs],
}

export const steps: Stage[] = [
  {
    id: 'match',
    title: 'Discovery and QoS matching',
    what: 'Before any data flows, the two nodes discover each other and compare QoS. The subscription requests a minimum quality; the publisher offers a maximum. Every requested policy must be no stricter than the offered one.',
    budget: 'Request vs offered, checked per policy: reliability, durability, deadline, liveliness, lease duration.',
    failure: 'One incompatible policy means no connection and no messages. ROS 2 reports it only through the "incompatible QoS" event, so it looks like silence.',
    sources: [qosDocs, rtps],
  },
  {
    id: 'publish',
    title: 'Publish into the writer history',
    what: 'publish() hands the message to the middleware, which serializes it and stores it in the writer history.',
    budget: 'Default profile: keep last, depth 10. Sensor data profile: keep last, depth 5.',
    failure: 'With keep last, a full queue drops the oldest sample without an error.',
    sources: [rmwProfiles, qosDocs],
  },
  {
    id: 'wire',
    title: 'On the wire',
    what: 'The middleware sends the sample with RTPS. Best effort sends it once. Reliable tracks which samples each reader has acknowledged and resends the missing ones. Both run over UDP.',
    budget: 'Default profile: reliable. Sensor data profile: best effort.',
    failure: 'On a lossy link, best effort loses samples and reliable trades the loss for delay while it resends.',
    sources: [qosDocs, rtps],
  },
  {
    id: 'lifespan',
    title: 'Lifespan check',
    what: 'A sample older than its lifespan is treated as expired and silently dropped, so it is never received.',
    budget: 'Default: unspecified, which the middleware usually treats as infinite.',
    failure: 'With the default, a command that arrives late is still delivered and still acted on.',
    sources: [qosDocs],
  },
  {
    id: 'reader',
    title: 'Reader history',
    what: 'The subscription keeps its own queue of received samples until the executor takes them.',
    budget: 'Same history and depth rules as the writer: keep last N, or keep all within resource limits.',
    failure: 'A deep queue behind a slow callback means the controller works through old commands in order.',
    sources: [qosDocs],
  },
  {
    id: 'watch',
    title: 'Deadline and liveliness',
    what: 'Deadline sets the longest expected gap between messages. Liveliness and its lease duration say how long a publisher may stay quiet before it counts as lost. Both raise events the node can handle.',
    budget: 'Default: unspecified for deadline and lease duration.',
    failure: 'Without a deadline, a crashed policy node looks the same as a quiet one. The controller keeps the last command unless it has its own watchdog.',
    sources: [qosDocs],
  },
  {
    id: 'callback',
    title: 'Executor runs the callback',
    what: 'The executor takes the sample and calls the subscription callback. A single-threaded executor runs callbacks one at a time on one thread.',
    budget: null,
    failure: 'A slow callback in the same single-threaded executor delays this one. Callback groups and a multi-threaded executor separate them.',
    sources: [executors],
  },
]

export type Reliability = 'best_effort' | 'reliable'
export type Durability = 'volatile' | 'transient_local'
export type Liveliness = 'automatic' | 'manual_by_topic'

export interface QosSide {
  reliability: Reliability
  durability: Durability
  liveliness: Liveliness
  deadlineMs: number | null // null = default (unspecified)
  leaseMs: number | null
}

export interface PolicyResult {
  policy: string
  ok: boolean
  why: string
}

const RANK_REL: Record<Reliability, number> = { best_effort: 0, reliable: 1 }
const RANK_DUR: Record<Durability, number> = { volatile: 0, transient_local: 1 }
const RANK_LIV: Record<Liveliness, number> = { automatic: 0, manual_by_topic: 1 }

// Every user-visible string checkQos returns. English below; dds.ja.ts supplies the Japanese twin.
export interface QosText {
  reliability: string
  durability: string
  deadline: string
  liveliness: string
  lease: string
  noLimit: string
  requestedNothing: (req: number) => string
  withinRequest: (offered: number, req: number) => string
  longerThanRequest: (offered: number, req: number) => string
  relOk: string
  relBlocked: string
  durStored: string
  durNewOnly: string
  durBlocked: string
  livOk: string
  livBlocked: string
}

export const qosText: QosText = {
  reliability: 'Reliability',
  durability: 'Durability',
  deadline: 'Deadline',
  liveliness: 'Liveliness',
  lease: 'Lease duration',
  noLimit: 'The subscription requests no limit.',
  requestedNothing: (req) => `The subscription requests ${req} ms, the publisher promises nothing.`,
  withinRequest: (offered, req) => `Offered ${offered} ms is within the requested ${req} ms.`,
  longerThanRequest: (offered, req) => `Offered ${offered} ms is longer than the requested ${req} ms.`,
  relOk: 'The publisher offers at least what the subscription asks for.',
  relBlocked: 'The subscription asks for reliable; the publisher only offers best effort.',
  durStored: 'Late joiners also get stored messages.',
  durNewOnly: 'New messages only.',
  durBlocked: 'The subscription asks for stored messages; the publisher keeps none.',
  livOk: 'Compatible kinds.',
  livBlocked: 'The subscription asks for manual by topic; the publisher is automatic.',
}

function duration(name: string, offered: number | null, requested: number | null, t: QosText): PolicyResult {
  // Table in the QoS docs: default/default yes, default/x no, x/default yes, x/y yes when y >= x.
  if (requested === null) return { policy: name, ok: true, why: t.noLimit }
  if (offered === null) return { policy: name, ok: false, why: t.requestedNothing(requested) }
  return requested >= offered
    ? { policy: name, ok: true, why: t.withinRequest(offered, requested) }
    : { policy: name, ok: false, why: t.longerThanRequest(offered, requested) }
}

// Request vs offered: a policy is compatible when the request is no stricter than the offer.
export function checkQos(pub: QosSide, sub: QosSide, t: QosText = qosText): PolicyResult[] {
  return [
    RANK_REL[sub.reliability] <= RANK_REL[pub.reliability]
      ? { policy: t.reliability, ok: true, why: t.relOk }
      : { policy: t.reliability, ok: false, why: t.relBlocked },
    RANK_DUR[sub.durability] <= RANK_DUR[pub.durability]
      ? {
          policy: t.durability,
          ok: true,
          why: pub.durability === 'transient_local' && sub.durability === 'transient_local' ? t.durStored : t.durNewOnly,
        }
      : { policy: t.durability, ok: false, why: t.durBlocked },
    duration(t.deadline, pub.deadlineMs, sub.deadlineMs, t),
    RANK_LIV[sub.liveliness] <= RANK_LIV[pub.liveliness]
      ? { policy: t.liveliness, ok: true, why: t.livOk }
      : { policy: t.liveliness, ok: false, why: t.livBlocked },
    duration(t.lease, pub.leaseMs, sub.leaseMs, t),
  ]
}

// rmw_qos_profile_default and rmw_qos_profile_sensor_data, rmw Jazzy.
export const profiles = [
  { policy: 'History', defaults: 'keep last', sensor: 'keep last' },
  { policy: 'Depth', defaults: '10', sensor: '5' },
  { policy: 'Reliability', defaults: 'reliable', sensor: 'best effort' },
  { policy: 'Durability', defaults: 'volatile', sensor: 'volatile' },
  { policy: 'Deadline, lifespan, lease duration', defaults: 'default (unspecified)', sensor: 'default (unspecified)' },
  { policy: 'Liveliness', defaults: 'system default', sensor: 'system default' },
]
