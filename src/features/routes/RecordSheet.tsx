import { useState } from 'react'
import { formatInterval, secondsToT, SNAP_SECONDS, tToSeconds } from './interval'

export default function RecordSheet({
  state,
  mode: recMode,
  waypointCount,
  elapsedS,
  onStart,
  onDrop,
  onStop,
}: {
  state: 'idle' | 'recording' | 'finishing'
  mode?: 'manual' | 'auto' | null
  waypointCount: number
  elapsedS: number
  onStart: (mode: 'manual' | 'auto', intervalS: number | null) => void
  onDrop: () => void
  onStop: () => void
}) {
  const [mode, setMode] = useState<'manual' | 'auto'>('manual')
  const [t, setT] = useState(() => secondsToT(30))
  const secs = tToSeconds(t)

  if (state === 'idle') {
    return (
      <div className="sheet" role="dialog">
        <div className="segmented">
          {(['manual', 'auto'] as const).map((m) => (
            <button
              key={m}
              className={mode === m ? 'seg active' : 'seg'}
              onClick={() => setMode(m)}
            >
              {m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        {mode === 'auto' && (
          <div className="slider-wrap">
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={t}
              onChange={(e) => setT(parseFloat(e.target.value))}
            />
            <div className="slider-label">{formatInterval(secs)}</div>
            <div className="ticks">
              {SNAP_SECONDS.map((s) => (
                <button
                  key={s}
                  className="tick"
                  onClick={() => setT(secondsToT(s))}
                >
                  {formatInterval(s)}
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          className="primary big"
          onClick={() => onStart(mode, mode === 'auto' ? secs : null)}
        >
          Start route
        </button>
      </div>
    )
  }

  return (
    <div className="sheet" role="dialog">
      <div className="rec-stats">
        <span>{elapsedS}s</span>
        <span>{waypointCount} waypoints</span>
      </div>
      <div className="stack">
        {state === 'recording' && recMode !== 'auto' && (
          <button className="primary big" onClick={onDrop}>
            Drop waypoint
          </button>
        )}
        <button className="danger big" onClick={onStop}>
          Stop
        </button>
      </div>
    </div>
  )
}
