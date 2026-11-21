// Which evidence panel shows the numbers a step talks about: chapter route → step id → panel heading id.
// A step without an entry has no panel of its own. Ids are the same in both languages.
export const STEP_PANEL = {
  tick: { policy: 'budget-h', controller: 'budget-h', physics: 'latency-h' },
  ppo: { ratio: 'clip-h', clip: 'clip-h', diagnose: 'diag-h' },
  dds: { match: 'qos-h', publish: 'profiles-h', wire: 'profiles-h' },
  sim2real: { holdout: 'holdout-h', metric: 'trap-h' },
  vla: { decode: 'scaling-h', timing: 'timing-h' },
  sysid: { replay: 'replay-h', fit: 'fit-h', spread: 'spread-h' },
} as const

export function panelForStep(route: string, stepId: string): string | undefined {
  const chapter: Record<string, string> | undefined = (STEP_PANEL as Record<string, Record<string, string>>)[route]
  return chapter?.[stepId]
}
