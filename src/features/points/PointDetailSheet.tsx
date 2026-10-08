import type { Point } from './api'
import type { GeoPosition } from '@/features/tracking/useGeolocation'
import { bearingDeg, haversineM } from '@/lib/geo'

export default function PointDetailSheet({
  point,
  position,
  isEditor,
  onEdit,
  onDelete,
  onNavigate,
  onMove,
  onClose,
}: {
  point: Point
  position: GeoPosition | null
  isEditor: boolean
  onEdit: (p: Point) => void
  onDelete: (p: Point) => void
  onNavigate?: (p: Point) => void
  onMove?: (p: Point) => void
  onClose: () => void
}) {
  const dist =
    position &&
    haversineM(position, { lat: point.lat, lng: point.lng })
  const bearing =
    position &&
    bearingDeg(position, { lat: point.lat, lng: point.lng })

  return (
    <div className="sheet" role="dialog">
      <h3>{point.name}</h3>
      <p className="muted">
        {point.kind}
        {dist != null && ` · ${Math.round(dist)} m`}
        {bearing != null && ` · ${Math.round(bearing)}°`}
      </p>
      {point.note && <p>{point.note}</p>}
      <div className="stack">
        {onNavigate && (
          <button className="primary" onClick={() => onNavigate(point)}>
            Navigate
          </button>
        )}
        {isEditor && (
          <>
            <button onClick={() => onEdit(point)}>Edit</button>
            {onMove && <button onClick={() => onMove(point)}>Move</button>}
            <button
              className="danger"
              onClick={() => {
                if (confirm(`Delete ${point.name}?`)) onDelete(point)
              }}
            >
              Delete
            </button>
          </>
        )}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
