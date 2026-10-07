import type { Point } from './api'

export default function PointsList({
  points,
  isEditor,
  onTap,
  onMove,
}: {
  points: Point[]
  isEditor?: boolean
  onTap: (p: Point) => void
  onMove?: (p: Point, dir: -1 | 1) => void
}) {
  const sorted = [...points].sort(
    (a, b) => (a.seq ?? 9999) - (b.seq ?? 9999) || a.name.localeCompare(b.name),
  )
  return (
    <ul className="list">
      {sorted.map((p, i) => (
        <li key={p.id} className="card">
          <button className="linklike" onClick={() => onTap(p)}>
            {p.seq != null && <span className="seq">#{p.seq}</span>}
            <strong>{p.name}</strong>
            <span className="muted"> {p.kind}</span>
          </button>
          {isEditor && onMove && (
            <span className="moves">
              <button
                aria-label="move up"
                disabled={i === 0}
                onClick={() => onMove(p, -1)}
              >
                ↑
              </button>
              <button
                aria-label="move down"
                disabled={i === sorted.length - 1}
                onClick={() => onMove(p, 1)}
              >
                ↓
              </button>
            </span>
          )}
        </li>
      ))}
      {sorted.length === 0 && <p className="muted">No points yet</p>}
    </ul>
  )
}
