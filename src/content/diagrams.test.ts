import { describe, expect, it } from 'vitest'
import { CONTENT } from './index'
import { DIAGRAMS } from './diagrams'

const stepIds: Record<string, string[]> = {
  tick: CONTENT.en.tick.stages.map((s) => s.id),
  ppo: CONTENT.en.ppo.steps.map((s) => s.id),
  dds: CONTENT.en.dds.steps.map((s) => s.id),
  sim2real: CONTENT.en.sim2real.steps.map((s) => s.id),
  vla: CONTENT.en.vla.steps.map((s) => s.id),
  sysid: CONTENT.en.sysid.steps.map((s) => s.id),
}

describe('DIAGRAMS', () => {
  it('has one diagram per chapter and nothing else', () => {
    expect(Object.keys(DIAGRAMS).sort()).toEqual(Object.keys(stepIds).sort())
  })

  for (const [route, d] of Object.entries(DIAGRAMS)) {
    const ids = d.nodes.map((x) => x.id)
    it(`${route}: every step marks a node that exists, and only real steps are mapped`, () => {
      expect(Object.keys(d.stepNode).sort()).toEqual([...stepIds[route]].sort())
      for (const node of Object.values(d.stepNode)) expect(ids).toContain(node)
    })
    it(`${route}: edges join existing nodes; node ids and grid cells are unique`, () => {
      for (const [a, b] of d.edges) expect(ids, `${a}->${b}`).toEqual(expect.arrayContaining([a, b]))
      expect(new Set(ids).size).toBe(ids.length)
      expect(new Set(d.nodes.map((x) => `${x.col},${x.row}`)).size).toBe(ids.length)
    })
    it(`${route}: every node is labelled in both languages`, () => {
      for (const x of d.nodes) expect(x.en && x.ja, x.id).toBeTruthy()
    })
  }
})
