import { useState } from 'react'
import type { RouteRow } from './api'
import type { Point } from '@/features/points/api'
import { routeLengthM } from './routeUtils'

export type RoutePatch = Pick<
  RouteRow,
  'name' | 'from_point_id' | 'to_point_id' | 'direction'
>

export default function RouteDetailSheet({
  route,
  points,
  isEditor,
  onUpdate,
  onDelete,
  onClose,
}: {
  route: RouteRow
  points: Point[]
  isEditor: boolean
  onUpdate: (r: RouteRow, patch: RoutePatch) => void
  onDelete: (r: RouteRow) => void
  onClose: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(route.name)
  const [fromId, setFromId] = useState(route.from_point_id ?? '')
  const [toId, setToId] = useState(route.to_point_id ?? '')
  const [direction, setDirection] = useState(route.direction)

  const pointName = (id: string | null) =>
    id ? (points.find((p) => p.id === id)?.name ?? '?') : '—'

  const seg = (dir: string, set: (d: string) => void) => (
    <div className="segmented">
      {['both', 'forward', 'reverse'].map((d) => (
        <button
          key={d}
          type="button"
          className={dir === d ? 'seg active' : 'seg'}
          onClick={() => set(d)}
        >
          {d}
        </button>
      ))}
    </div>
  )

  if (editing) {
    return (
      <div className="sheet" role="dialog">
        <h3>Edit route</h3>
        <div className="stack">
          <input
            required
            placeholder="Route name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label>
            From
            <select value={fromId} onChange={(e) => setFromId(e.target.value)}>
              <option value="">—</option>
              {points.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            To
            <select value={toId} onChange={(e) => setToId(e.target.value)}>
              <option value="">—</option>
              {points.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {seg(direction, setDirection)}
          <button
            className="primary"
            onClick={() => {
              onUpdate(route, {
                name,
                from_point_id: fromId || null,
                to_point_id: toId || null,
                direction,
              })
              setEditing(false)
            }}
          >
            Save
          </button>
          <button onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="sheet" role="dialog">
      <h3>{route.name || 'Route'}</h3>
      <p className="muted">
        {pointName(route.from_point_id)} → {pointName(route.to_point_id)} ·{' '}
        {Math.round(routeLengthM(route.coords))} m ·{' '}
        {route.coords.length} waypoints
      </p>
      {isEditor &&
        seg(route.direction, (d) =>
          onUpdate(route, {
            name: route.name,
            from_point_id: route.from_point_id,
            to_point_id: route.to_point_id,
            direction: d,
          }),
        )}
      <div className="stack">
        {isEditor && (
          <button
            onClick={() => {
              setName(route.name)
              setFromId(route.from_point_id ?? '')
              setToId(route.to_point_id ?? '')
              setDirection(route.direction)
              setEditing(true)
            }}
          >
            Edit
          </button>
        )}
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
