import { describe, expect, it } from 'vitest'
import { checkQos } from './dds'
import type { QosSide } from './dds'

// Expected results follow the compatibility tables in the ROS 2 Jazzy QoS docs.
const base: QosSide = {
  reliability: 'reliable',
  durability: 'volatile',
  liveliness: 'automatic',
  deadlineMs: null,
  leaseMs: null,
}
const ok = (pub: Partial<QosSide>, sub: Partial<QosSide>) =>
  Object.fromEntries(checkQos({ ...base, ...pub }, { ...base, ...sub }).map((r) => [r.policy, r.ok]))

describe('checkQos', () => {
  it('identical defaults are compatible on every policy', () => {
    expect(Object.values(ok({}, {}))).toEqual([true, true, true, true, true])
  })

  it('reliability: best effort offer vs reliable request fails, the reverse connects', () => {
    expect(ok({ reliability: 'best_effort' }, {}).Reliability).toBe(false)
    expect(ok({}, { reliability: 'best_effort' }).Reliability).toBe(true)
  })

  it('durability: transient local request needs a transient local offer', () => {
    expect(ok({}, { durability: 'transient_local' }).Durability).toBe(false)
    expect(ok({ durability: 'transient_local' }, {}).Durability).toBe(true)
    expect(ok({ durability: 'transient_local' }, { durability: 'transient_local' }).Durability).toBe(true)
  })

  it('deadline: default request accepts anything, a set request needs an offer no longer than it', () => {
    expect(ok({ deadlineMs: 100 }, {}).Deadline).toBe(true)
    expect(ok({}, { deadlineMs: 100 }).Deadline).toBe(false)
    expect(ok({ deadlineMs: 50 }, { deadlineMs: 100 }).Deadline).toBe(true)
    expect(ok({ deadlineMs: 100 }, { deadlineMs: 100 }).Deadline).toBe(true)
    expect(ok({ deadlineMs: 100 }, { deadlineMs: 50 }).Deadline).toBe(false)
  })

  it('liveliness and lease duration follow the same request-vs-offer rule', () => {
    expect(ok({}, { liveliness: 'manual_by_topic' }).Liveliness).toBe(false)
    expect(ok({ liveliness: 'manual_by_topic' }, {}).Liveliness).toBe(true)
    expect(ok({ leaseMs: 1000 }, { leaseMs: 500 })['Lease duration']).toBe(false)
  })

  it('keeps the English explanation text for the two-argument call', () => {
    const [rel] = checkQos({ ...base, reliability: 'best_effort' }, base)
    expect(rel.why).toBe('The subscription asks for reliable; the publisher only offers best effort.')
    const dl = checkQos({ ...base, deadlineMs: 100 }, { ...base, deadlineMs: 50 })[2]
    expect(dl.why).toBe('Offered 100 ms is longer than the requested 50 ms.')
  })
})
