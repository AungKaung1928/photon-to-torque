import * as tickEn from './tick'
import * as tickJa from './tick.ja'
import * as ppoEn from './ppo'
import * as ppoJa from './ppo.ja'
import * as ddsEn from './dds'
import * as ddsJa from './dds.ja'
import * as sim2realEn from './sim2real'
import * as sim2realJa from './sim2real.ja'
import * as vlaEn from './vla'
import * as vlaJa from './vla.ja'
import * as sysidEn from './sysid'
import * as sysidJa from './sysid.ja'
import { useLang } from '../i18n'
import type { Lang } from '../i18n'

const en = { tick: tickEn, ppo: ppoEn, dds: ddsEn, sim2real: sim2realEn, vla: vlaEn, sysid: sysidEn }

// Typed as the English bundle: a Japanese file that drops an export or changes a shape fails the build.
const ja: typeof en = { tick: tickJa, ppo: ppoJa, dds: ddsJa, sim2real: sim2realJa, vla: vlaJa, sysid: sysidJa }

export type Content = typeof en

export const CONTENT: Record<Lang, Content> = { en, ja }

export function useContent(): Content {
  return CONTENT[useLang()]
}
