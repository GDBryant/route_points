import type { Point } from './api'

export default function PointsList({
  points,
  onTap,
}: {
  points: Point[]
  onTap: (p: Point) => void
}) {
  const sorted = [...points].sort(
    (a, b) => (a.seq ?? 9999) - (b.seq ?? 9999) || a.name.localeCompare(b.name),
  )
  return (
    <ul className="list">
      {sorted.map((p) => (
        <li key={p.id} className="card">
          <button className="linklike" onClick={() => onTap(p)}>
            {p.seq != null && <span className="seq">#{p.seq}</span>}
            <strong>{p.name}</strong>
            <span className="muted"> {p.kind}</span>
          </button>
        </li>
      ))}
      {sorted.length === 0 && <p className="muted">No points yet</p>}
    </ul>
  )
}
