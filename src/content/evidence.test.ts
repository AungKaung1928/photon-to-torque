import { describe, expect, it } from 'vitest'
import { CONTENT } from './index'
import { STEP_PANEL, panelForStep } from './evidence'

const stepIds: Record<keyof typeof STEP_PANEL, string[]> = {
  tick: CONTENT.en.tick.stages.map((s) => s.id),
  ppo: CONTENT.en.ppo.steps.map((s) => s.id),
  dds: CONTENT.en.dds.steps.map((s) => s.id),
  sim2real: CONTENT.en.sim2real.steps.map((s) => s.id),
  vla: CONTENT.en.vla.steps.map((s) => s.id),
  sysid: CONTENT.en.sysid.steps.map((s) => s.id),
}

describe('STEP_PANEL', () => {
  it('names only steps that exist', () => {
    for (const [route, map] of Object.entries(STEP_PANEL)) {
      for (const id of Object.keys(map)) expect(stepIds[route as keyof typeof STEP_PANEL], `${route}.${id}`).toContain(id)
    }
  })
})

describe('panelForStep', () => {
  it('returns the panel of a mapped step and nothing otherwise', () => {
    expect(panelForStep('sysid', 'replay')).toBe('replay-h')
    expect(panelForStep('sysid', 'data')).toBeUndefined()
    expect(panelForStep('nope', 'replay')).toBeUndefined()
  })
})
