import type { RouteRow } from './api'
import type { Point } from '@/features/points/api'
import { routeLengthM } from './routeUtils'

export default function RouteDetailSheet({
  route,
  points,
  isEditor,
  onDirection,
  onDelete,
  onClose,
}: {
  route: RouteRow
  points: Point[]
  isEditor: boolean
  onDirection: (r: RouteRow, dir: string) => void
  onDelete: (r: RouteRow) => void
  onClose: () => void
}) {
  const name = (id: string | null) =>
    id ? (points.find((p) => p.id === id)?.name ?? '?') : '—'

  return (
    <div className="sheet" role="dialog">
      <h3>{route.name || 'Route'}</h3>
      <p className="muted">
        {name(route.from_point_id)} → {name(route.to_point_id)} ·{' '}
        {Math.round(routeLengthM(route.coords))} m ·{' '}
        {route.coords.length} waypoints
      </p>
      {isEditor && (
        <div className="segmented">
          {['both', 'forward', 'reverse'].map((d) => (
            <button
              key={d}
              className={route.direction === d ? 'seg active' : 'seg'}
              onClick={() => onDirection(route, d)}
            >
              {d}
            </button>
          ))}
        </div>
      )}
      <div className="stack">
        {isEditor && (
          <button
            className="danger"
            onClick={() => {
              if (confirm(`Delete ${route.name || 'route'}?`)) onDelete(route)
            }}
          >
            Delete
          </button>
        )}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
