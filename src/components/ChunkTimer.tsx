import { useState } from 'react'
import { useContent } from '../content'
import { useLang } from '../i18n'
import { SourceList } from './SourceList'

const TEXT = {
  en: {
    moving: (pct: number) => `moving ${pct}% of the time`,
    chunkLabel: (k: number, moveS: string, hz: number) => (
      <>
        Chunk length k: <b>{k} steps</b> = {moveS} s of motion at {hz} Hz
      </>
    ),
    fixed: (inf: string, chunk: number) =>
      `Inference is fixed at the measured ${inf} s per chunk. Opens on SmolVLA’s own chunk of ${chunk}.`,
    armMoving: 'arm moving',
    armWaiting: 'arm waiting for the next chunk',
    serialLabel: 'Infer, then move',
    serialNote: (move: string, inf: string) =>
      `Each cycle: ${move} s moving, ${inf} s waiting. The arm holds still during inference, so each chunk starts from a current observation.`,
    overlapLabel: 'Infer the next chunk while moving',
    overlapWaitNote: (move: string, wait: string, inf: string) =>
      `Inference runs back to back: ${move} s moving, ${wait} s waiting per cycle. Each chunk starts from an observation ${inf} s old.`,
    overlapNoWaitNote: (inf: string, kMin: number) =>
      `Start each inference ${inf} s before the current chunk ends and the arm never waits (from k = ${kMin}). Each chunk still starts from an observation ${inf} s old.`,
    timingOnly: (n: number, p90: string) =>
      `Timing only: p50 of ${n} runs on 8 CPU threads (p90 ${p90} s). The same model scored 0 of 40 episodes zero-shot on this bench, so no success rate goes with these bars.`,
  },
  ja: {
    moving: (pct: number) => `動作している時間 ${pct}%`,
    chunkLabel: (k: number, moveS: string, hz: number) => (
      <>
        チャンク長 k: <b>{k} ステップ</b> = {hz} Hz で {moveS} s 分の動作
      </>
    ),
    fixed: (inf: string, chunk: number) =>
      `推論時間は実測値の 1 チャンクあたり ${inf} s に固定しています。初期値は SmolVLA 本来のチャンク長 ${chunk} です。`,
    armMoving: 'アームが動作中',
    armWaiting: 'アームが次のチャンクを待機中',
    serialLabel: '推論してから動作',
    serialNote: (move: string, inf: string) =>
      `各サイクルで動作 ${move} s、待ち時間 ${inf} s です。推論中はアームが静止するため、各チャンクは最新の観測から始まります。`,
    overlapLabel: '動作中に次のチャンクを推論',
    overlapWaitNote: (move: string, wait: string, inf: string) =>
      `推論を連続して実行します。1 サイクルあたり動作 ${move} s、待ち時間 ${wait} s です。各チャンクは ${inf} s 前の観測から始まります。`,
    overlapNoWaitNote: (inf: string, kMin: number) =>
      `現在のチャンクが終わる ${inf} s 前に次の推論を始めれば、アームは待ちません (k = ${kMin} から)。それでも各チャンクは ${inf} s 前の観測から始まります。`,
    timingOnly: (n: number, p90: string) =>
      `時間のみの計測です。8 CPU スレッドで ${n} 回実行した p50 です (p90 ${p90} s)。同じモデルはこのベンチでゼロショットで 40 エピソード中 0 回の成功だったため、このバーには成功率を付けていません。`,
  },
}

// One cycle of chunked control with a measured inference time.
// One after the other: the arm moves for the chunk, then waits for the next inference.
// Overlapped: the next chunk is computed while this one runs, started just in time, so its observation is one inference old.
function Row({ id, label, move, wait, note }: { id: string; label: string; move: number; wait: number; note: string }) {
  const T = TEXT[useLang()]
  const total = move + wait
  const pct = Math.round((move / total) * 100)
  return (
    <div className="chunk-row" id={id}>
      <p className="chunk-label">
        {label}: <b>{T.moving(pct)}</b>
      </p>
      <div className="chunk-track" aria-hidden="true">
        <span className="chunk-move" style={{ width: `${(move / total) * 100}%` }} />
        {wait > 0 && <span className="chunk-wait" style={{ width: `${(wait / total) * 100}%` }} />}
      </div>
      <p className="muted chunk-note">{note}</p>
    </div>
  )
}

export function ChunkTimer() {
  const { smolvla } = useContent().vla
  const T = TEXT[useLang()]
  const [k, setK] = useState(smolvla.chunk)
  const periodS = 1 / smolvla.controlHz
  const moveS = k * periodS
  const inf = smolvla.inferenceS
  const overlapWait = Math.max(0, inf - moveS)
  return (
    <div className="chunk">
      <div className="clip-control">
        <label htmlFor="chunk-k">{T.chunkLabel(k, moveS.toFixed(2), smolvla.controlHz)}</label>
        <input id="chunk-k" type="range" min={5} max={100} step={1} value={k} onChange={(e) => setK(Number(e.target.value))} />
        <span className="muted">{T.fixed(inf.toFixed(2), smolvla.chunk)}</span>
      </div>
      <div className="legend" aria-hidden="true">
        <span>
          <i className="key s1" /> {T.armMoving}
        </span>
        <span>
          <i className="key wait" /> {T.armWaiting}
        </span>
      </div>
      <Row
        id="chunk-serial"
        label={T.serialLabel}
        move={moveS}
        wait={inf}
        note={T.serialNote(moveS.toFixed(2), inf.toFixed(2))}
      />
      <Row
        id="chunk-overlap"
        label={T.overlapLabel}
        move={moveS}
        wait={overlapWait}
        note={
          overlapWait > 0
            ? T.overlapWaitNote(moveS.toFixed(2), overlapWait.toFixed(2), inf.toFixed(2))
            : T.overlapNoWaitNote(inf.toFixed(2), Math.ceil(inf / periodS))
        }
      />
      <p className="muted small-note">{T.timingOnly(smolvla.n, smolvla.p90S.toFixed(2))}</p>
      <SourceList sources={smolvla.sources} />
    </div>
  )
}
