import { useMemo } from 'react'
import { Marker } from 'react-leaflet'
import { pointIcon } from './pointIcon'
import type { Point } from './api'

export default function PointMarker({
  point,
  onTap,
  moving,
  position,
}: {
  point: Point
  onTap: (p: Point) => void
  moving?: boolean
  position?: [number, number]
}) {
  const icon = useMemo(() => pointIcon(point, moving), [point, moving])
  return (
    <Marker
      position={position ?? [point.lat, point.lng]}
      icon={icon}
      zIndexOffset={moving ? 1000 : 0}
      eventHandlers={{
        click: () => {
          if (!moving) onTap(point)
        },
      }}
    />
  )
}
