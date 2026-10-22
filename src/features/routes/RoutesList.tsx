import { useState } from "react";
import type { RouteRow } from "./api";
import type { Point } from "@/features/points/api";
import {
  fmtDistance,
  fmtDuration,
  fmtSpeed,
  routeDurationS,
  routeLengthM,
} from "./routeUtils";

export default function RoutesList({
  routes,
  points,
  onTap,
  onDelete,
}: {
  routes: RouteRow[];
  points: Point[];
  onTap: (r: RouteRow) => void;
  onDelete?: (r: RouteRow) => void;
}) {
  const [pace, setPace] = useState(
    () => localStorage.getItem("speedUnit") === "pace",
  );
  const name = (id: string | null) =>
    id ? (points.find((p) => p.id === id)?.name ?? "") : "";
  const label = (r: RouteRow) =>
    r.name ||
    `${name(r.from_point_id) || "Start"} → ${name(r.to_point_id) || "End"}`;
  const stats = (r: RouteRow) => {
    const d = routeLengthM(r.coords);
    const t = routeDurationS(r);
    return `${fmtDistance(d)} · ${t == null ? "–" : fmtDuration(t)} · ${fmtSpeed(d, t ?? 0, pace)}`;
  };
  return (
    <>
      {routes.length > 0 && (
        <div className="routes-unit">
          <button
            type="button"
            className="linklike muted"
            aria-label="Toggle speed unit"
            onClick={() => {
              const next = !pace;
              setPace(next);
              localStorage.setItem("speedUnit", next ? "pace" : "kmh");
            }}
          >
            {pace ? "min/km" : "km/h"}
          </button>
        </div>
      )}
      <ul className="list">
        {routes.map((r) => (
          <li key={r.id} className="card">
            <button className="linklike" onClick={() => onTap(r)}>
              <strong>{label(r)}</strong>
              <span className="muted block">{stats(r)}</span>
            </button>
            {onDelete && (
              <button
                className="danger"
                onClick={() => {
                  if (confirm(`Delete ${label(r)}?`)) onDelete(r);
                }}
              >
                Delete
              </button>
            )}
          </li>
        ))}
        {routes.length === 0 && <p className="muted">No routes yet</p>}
      </ul>
    </>
  );
}
