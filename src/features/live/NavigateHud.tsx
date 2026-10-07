import { bearingDeg, haversineM } from '@/lib/geo'
import type { Point } from '@/features/points/api'
import type { GeoPosition } from '@/features/tracking/useGeolocation'
import { fmtDistance } from './fmtDistance'

export default function NavigateHud({
  point,
  position,
  onClose,
}: {
  point: Point
  position: GeoPosition | null
  onClose: () => void
}) {
  const dist = position ? haversineM(position, point) : null
  const bearing = position ? bearingDeg(position, point) : null
  const arrowDeg =
    bearing != null ? bearing - (position?.heading ?? 0) : 0

  return (
    <div className="navhud">
      <span className="nh-arrow" style={{ transform: `rotate(${arrowDeg}deg)` }}>
        ➤
      </span>
      <span className="nh-name">{point.name}</span>
      <span className="nh-dist">{dist != null ? fmtDistance(dist) : '—'}</span>
      <button className="nh-close" onClick={onClose}>
        ✕
      </button>
    </div>
  )
}
