import { useMemo } from 'react'
import { Marker } from 'react-leaflet'
import { pointIcon } from './pointIcon'
import type { Point } from './api'

export default function PointMarker({
  point,
  onTap,
}: {
  point: Point
  onTap: (p: Point) => void
}) {
  const icon = useMemo(() => pointIcon(point), [point])
  return (
    <Marker
      position={[point.lat, point.lng]}
      icon={icon}
      eventHandlers={{ click: () => onTap(point) }}
    />
  )
}
