import { useState } from "react";
import {
  formatInterval,
  secondsToT,
  SNAP_SECONDS,
  tToSeconds,
} from "./interval";

const MODE_KEY = "rp.rec.mode";
const INTERVAL_KEY = "rp.rec.interval_s";
const COLLAPSED_KEY = "rp.rec.collapsed";

export default function RecordSheet({
  state,
  waypointCount,
  elapsedS,
  onStart,
  onDrop,
  onStop,
}: {
  state: "idle" | "recording" | "finishing";
  mode?: "manual" | "auto" | null;
  waypointCount: number;
  elapsedS: number;
  onStart: (mode: "manual" | "auto", intervalS: number | null) => void;
  onDrop: () => void;
  onStop: () => void;
}) {
  const [mode, setMode] = useState<"manual" | "auto">(
    () => (localStorage.getItem(MODE_KEY) as "manual" | "auto") ?? "auto",
  );
  const [t, setT] = useState(() =>
    secondsToT(Number(localStorage.getItem(INTERVAL_KEY)) || 10),
  );
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_KEY) === "1",
  );
  const toggle = (c: boolean) => {
    setCollapsed(c);
    localStorage.setItem(COLLAPSED_KEY, c ? "1" : "0");
  };
  const secs = tToSeconds(t);

  const start = () => {
    localStorage.setItem(MODE_KEY, mode);
    if (mode === "auto") localStorage.setItem(INTERVAL_KEY, String(secs));
    onStart(mode, mode === "auto" ? secs : null);
  };

  if (state === "idle") {
    return (
      <div className="sheet" role="dialog">
        <div className="segmented">
          {(["manual", "auto"] as const).map((m) => (
            <button
              key={m}
              className={mode === m ? "seg active" : "seg"}
              onClick={() => setMode(m)}
            >
              {m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        {mode === "auto" && (
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
        <div className="stack">
          <button className="primary big" onClick={start}>
            Start route
          </button>
          <button className="big" onClick={onStop}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="rec-mini" role="status">
        <span>
          {elapsedS}s · {waypointCount} wp
        </span>
        <button aria-label="Show recording controls" onClick={() => toggle(false)}>
          ▲
        </button>
      </div>
    );
  }

  return (
    <div className="sheet" role="dialog">
      <div className="rec-stats">
        <span>{elapsedS}s</span>
        <span>{waypointCount} waypoints</span>
        <button
          className="rec-min"
          aria-label="Minimise recording controls"
          onClick={() => toggle(true)}
        >
          ▼
        </button>
      </div>
      <div className="stack">
        {state === "recording" && (
          <button className="primary big" onClick={onDrop}>
            Drop waypoint
          </button>
        )}
        <button className="danger big" onClick={onStop}>
          Stop
        </button>
      </div>
    </div>
  );
}
