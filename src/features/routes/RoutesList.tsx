import type { RouteRow } from './api'
import type { Point } from '@/features/points/api'

export default function RoutesList({
  routes,
  points,
  onTap,
}: {
  routes: RouteRow[]
  points: Point[]
  onTap: (r: RouteRow) => void
}) {
  const name = (id: string | null) =>
    id ? (points.find((p) => p.id === id)?.name ?? '') : ''
  return (
    <ul className="list">
      {routes.map((r) => (
        <li key={r.id} className="card">
          <button className="linklike" onClick={() => onTap(r)}>
            <strong>
              {r.name ||
                `${name(r.from_point_id) || 'Start'} → ${name(r.to_point_id) || 'End'}`}
            </strong>
            <span className="muted"> {r.coords.length} pts</span>
          </button>
        </li>
      ))}
      {routes.length === 0 && <p className="muted">No routes yet</p>}
    </ul>
  )
}
