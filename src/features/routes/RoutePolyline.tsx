import { useMemo } from 'react'
import { Marker, Polyline } from 'react-leaflet'
import L from 'leaflet'
import type { RouteRow } from './api'
import { arrowPositions } from './routeUtils'

const COLOUR = '#7b3fb3'

export default function RoutePolyline({
  route,
  onTap,
}: {
  route: RouteRow
  onTap?: (r: RouteRow) => void
}) {
  const positions = useMemo(
    () => route.coords.map(([lng, lat]) => [lat, lng] as [number, number]),
    [route.coords],
  )
  const arrows = useMemo(
    () => (route.direction !== 'both' ? arrowPositions(route.coords) : []),
    [route.direction, route.coords],
  )
  const arrowIcons = useMemo(
    () =>
      arrows.map(
        (a) =>
          L.divIcon({
            className: 'route-arrow',
            html: `<span style="transform:rotate(calc(${route.direction === 'reverse' ? a.bearing + 180 : a.bearing}deg - var(--rot, 0deg)))">▲</span>`,
            iconSize: [14, 14],
          }),
      ),
    [arrows, route.direction],
  )

  return (
    <>
      <Polyline
        positions={positions}
        pathOptions={{ color: COLOUR, weight: 3 }}
        eventHandlers={{ click: () => onTap?.(route) }}
      />
      {arrows.map((a, i) => (
        <Marker key={i} position={a.pos} icon={arrowIcons[i]} interactive={false} />
      ))}
    </>
  )
}
