import { useState } from 'react'
import { smolvla } from '../content/vla'
import { SourceList } from './SourceList'

// One cycle of chunked control with a measured inference time.
// One after the other: the arm moves for the chunk, then waits for the next inference.
// Overlapped: the next chunk is computed while this one runs, started just in time, so its observation is one inference old.
function Row({ id, label, move, wait, note }: { id: string; label: string; move: number; wait: number; note: string }) {
  const total = move + wait
  const pct = Math.round((move / total) * 100)
  return (
    <div className="chunk-row" id={id}>
      <p className="chunk-label">
        {label}: <b>moving {pct}% of the time</b>
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
  const [k, setK] = useState(smolvla.chunk)
  const periodS = 1 / smolvla.controlHz
  const moveS = k * periodS
  const inf = smolvla.inferenceS
  const overlapWait = Math.max(0, inf - moveS)
  return (
    <div className="chunk">
      <div className="clip-control">
        <label htmlFor="chunk-k">
          Chunk length k: <b>{k} steps</b> = {moveS.toFixed(2)} s of motion at {smolvla.controlHz} Hz
        </label>
        <input id="chunk-k" type="range" min={5} max={100} step={1} value={k} onChange={(e) => setK(Number(e.target.value))} />
        <span className="muted">
          Inference is fixed at the measured {inf.toFixed(2)} s per chunk. Opens on SmolVLA’s own chunk of {smolvla.chunk}.
        </span>
      </div>
      <div className="legend" aria-hidden="true">
        <span>
          <i className="key s1" /> arm moving
        </span>
        <span>
          <i className="key wait" /> arm waiting for the next chunk
        </span>
      </div>
      <Row
        id="chunk-serial"
        label="Infer, then move"
        move={moveS}
        wait={inf}
        note={`Each cycle: ${moveS.toFixed(2)} s moving, ${inf.toFixed(2)} s waiting. The arm holds still during inference, so each chunk starts from a current observation.`}
      />
      <Row
        id="chunk-overlap"
        label="Infer the next chunk while moving"
        move={moveS}
        wait={overlapWait}
        note={
          overlapWait > 0
            ? `Inference runs back to back: ${moveS.toFixed(2)} s moving, ${overlapWait.toFixed(2)} s waiting per cycle. Each chunk starts from an observation ${inf.toFixed(2)} s old.`
            : `Start each inference ${inf.toFixed(2)} s before the current chunk ends and the arm never waits (from k = ${Math.ceil(inf / periodS)}). Each chunk still starts from an observation ${inf.toFixed(2)} s old.`
        }
      />
      <p className="muted small-note">
        Timing only: p50 of {smolvla.n} runs on 8 CPU threads (p90 {smolvla.p90S.toFixed(2)} s). The same model scored 0
        of 40 episodes zero-shot on this bench, so no success rate goes with these bars.
      </p>
      <SourceList sources={smolvla.sources} />
    </div>
  )
}
