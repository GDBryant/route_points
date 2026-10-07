import { useState } from 'react'
import type { Point } from '@/features/points/api'
import type { GeoPosition } from '@/features/tracking/useGeolocation'
import { haversineM } from '@/lib/geo'
import { nearestPoint } from './snap'
import type { PendingRoute } from './useRecorder'

export interface FinishInput {
  name: string
  from_point_id: string | null
  to_point_id: string | null
  direction: string
}

export default function FinishRouteSheet({
  route,
  lastPos,
  points,
  snapRadiusM,
  routeCount,
  forceToId,
  onSave,
}: {
  route: PendingRoute
  lastPos: GeoPosition | null
  points: Point[]
  snapRadiusM: number
  routeCount: number
  forceToId?: string
  onSave: (input: FinishInput) => void
}) {
  const suggested = forceToId
    ? (points.find((p) => p.id === forceToId) ?? null)
    : nearestPoint(lastPos, points, snapRadiusM)
  const fromPoint = points.find((p) => p.id === route.from_point_id) ?? null
  const [name, setName] = useState(() =>
    fromPoint && suggested
      ? `${fromPoint.name} → ${suggested.name}`
      : `Route ${routeCount + 1}`,
  )
  const [fromId, setFromId] = useState(route.from_point_id ?? '')
  const [toId, setToId] = useState(suggested?.id ?? '')
  const [direction, setDirection] = useState('both')

  const dist =
    suggested && lastPos
      ? Math.round(haversineM(lastPos, suggested))
      : null

  return (
    <div className="sheet" role="dialog">
      <h3>Finish route</h3>
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
          To{dist != null && ` (within ${dist} m)`}
          <select value={toId} onChange={(e) => setToId(e.target.value)}>
            <option value="">—</option>
            {points.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="segmented">
          {['both', 'forward', 'reverse'].map((d) => (
            <button
              key={d}
              type="button"
              className={direction === d ? 'seg active' : 'seg'}
              onClick={() => setDirection(d)}
            >
              {d}
            </button>
          ))}
        </div>
        <button
          className="primary"
          onClick={() =>
            onSave({
              name,
              from_point_id: fromId || null,
              to_point_id: toId || null,
              direction,
            })
          }
        >
          Save route
        </button>
      </div>
    </div>
  )
}
