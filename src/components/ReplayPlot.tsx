import { useState } from 'react'
import { replay } from '../data/replay'
import { extent, linePath, meanAbsErr } from '../lib/replay'
import { SourceList } from './SourceList'
import { useLang } from '../i18n'

const W = 640
const H = 240
const M = { l: 44, r: 12, t: 12, b: 28 }
const T_LEN = replay.real[0].length
const MAX_DELAY = replay.simByDelay.length - 1

const TEXT = {
  en: {
    joint: 'Joint',
    joints: ['Shoulder lift (Pitch)', 'Elbow'],
    delay: 'Extra command delay in sim:',
    frames: (d: number) => `${d} frame${d === 1 ? '' : 's'} (${Math.round((d * 1000) / replay.fps)} ms)`,
    command: 'Command (leader arm)',
    real: 'Real follower',
    sim: 'Sim follower, fitted servo',
    plot: (j: string) => `${j}: command, real follower and sim follower over ${(T_LEN / replay.fps).toFixed(1)} s`,
    err: 'Mean |sim − real| for this joint:',
    all: 'all 5 arm joints:',
    seconds: 's',
    sep: ', ',
    note: 'Start at 0 extra frames: the sim already trails the command about as much as the real arm does. Each frame of delay added on top moves the sim further from the real follower.',
    source: 'so-arm100-sim scripts/export_replay_json.py, episode 40 of svla_so100_pickplace',
  },
  ja: {
    joint: '関節',
    joints: ['肩の上下 (Pitch)', '肘 (Elbow)'],
    delay: 'シミュレーションに加える指令遅延:',
    frames: (d: number) => `${d} フレーム (${Math.round((d * 1000) / replay.fps)} ms)`,
    command: '指令 (リーダーアーム)',
    real: '実機のフォロワー',
    sim: 'シミュレーションのフォロワー (フィット済みサーボ)',
    plot: (j: string) => `${j}: ${(T_LEN / replay.fps).toFixed(1)} 秒間の指令、実機フォロワー、シミュレーションのフォロワー`,
    err: 'この関節の平均 |シミュレーション − 実機|:',
    all: 'アーム 5 関節すべて:',
    seconds: '秒',
    sep: '、',
    note: '遅延 0 フレームから見てください。シミュレーションはすでに実機と同じくらい指令から遅れています。そこへ遅延を 1 フレーム足すごとに、シミュレーションは実機のフォロワーから離れていきます。',
    source: 'so-arm100-sim scripts/export_replay_json.py、svla_so100_pickplace のエピソード 40',
  },
}

export function ReplayPlot() {
  const T = TEXT[useLang()]
  const [joint, setJoint] = useState(0)
  const [delay, setDelay] = useState(0)
  const cmd = replay.command[joint]
  const real = replay.real[joint]
  const sim = replay.simByDelay[delay][joint]
  const [lo, hi] = extent([cmd, real, ...replay.simByDelay.map((d) => d[joint])])
  const pad = (hi - lo) * 0.05
  const x = (i: number) => M.l + (i / (T_LEN - 1)) * (W - M.l - M.r)
  const y = (v: number) => M.t + ((hi + pad - v) / (hi - lo + 2 * pad)) * (H - M.t - M.b)
  const yTicks = [lo, (lo + hi) / 2, hi].map((v) => Math.round(v))
  const xTicks = [0, 5, 10, 15].filter((s) => s * replay.fps < T_LEN)
  return (
    <div className="clip replay">
      <div className="replay-controls">
        <fieldset className="replay-joint">
          <legend>{T.joint}</legend>
          {T.joints.map((name, j) => (
            <label key={name}>
              <input
                type="radio"
                id={`replay-joint-${j}`}
                name="replay-joint"
                checked={joint === j}
                onChange={() => setJoint(j)}
              />{' '}
              {name}
            </label>
          ))}
        </fieldset>
        <div className="clip-control">
          <label htmlFor="replay-delay">
            {T.delay} <b>{T.frames(delay)}</b>
          </label>
          <input
            id="replay-delay"
            type="range"
            min={0}
            max={MAX_DELAY}
            step={1}
            value={delay}
            onChange={(e) => setDelay(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="clip-svg">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={T.plot(T.joints[joint])}>
          {yTicks.map((t) => (
            <g key={t}>
              <line className="grid" x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} />
              <text className="axis" x={M.l - 6} y={y(t)} dy="0.35em" textAnchor="end">
                {t}°
              </text>
            </g>
          ))}
          {xTicks.map((s) => (
            <text key={s} className="axis" x={x(s * replay.fps)} y={H - 8} textAnchor={s ? 'middle' : 'start'}>
              {s} {T.seconds}
            </text>
          ))}
          <path className="rp-cmd" d={linePath(cmd, x, y)} />
          <path className="rp-real" d={linePath(real, x, y)} />
          <path className="rp-sim" d={linePath(sim, x, y)} />
        </svg>
      </div>
      <ul className="replay-legend">
        <li className="rp-key-cmd">{T.command}</li>
        <li className="rp-key-real">{T.real}</li>
        <li className="rp-key-sim">{T.sim}</li>
      </ul>
      <p className="clip-read">
        {T.err} <b className="num">{meanAbsErr(sim, real).toFixed(2)}°</b>{T.sep}{T.all}{' '}
        <b className="num">{replay.meanErrByDelay[delay].toFixed(2)}°</b>
      </p>
      <p className="panel-note">{T.note}</p>
      <SourceList sources={[{ label: T.source, ref: 'so-arm100-sim/scripts/export_replay_json.py' }]} />
    </div>
  )
}
