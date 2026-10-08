import { useCallback, useEffect, useState } from 'react'
import {
  Circle,
  CircleMarker,
  LayersControl,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { GeoPosition } from '@/features/tracking/useGeolocation'
import PointMarker from '@/features/points/PointMarker'
import type { Point } from '@/features/points/api'
import RoutePolyline from '@/features/routes/RoutePolyline'
import type { RouteRow } from '@/features/routes/api'
import MemberMarker from '@/features/live/MemberMarker'
import type { LivePos } from '@/features/live/usePositions'
import { Polyline } from 'react-leaflet'

const DEFAULT_CENTER: [number, number] = [-33.56, 18.48]
const ESRI_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

function CurrentPositionMarker({ position }: { position: GeoPosition | null }) {
  if (!position) return null
  return (
    <>
      <CircleMarker
        center={[position.lat, position.lng]}
        radius={8}
        pathOptions={{ color: '#fff', fillColor: '#1e88e5', fillOpacity: 1 }}
      />
      {position.accuracy != null && (
        <Circle
          center={[position.lat, position.lng]}
          radius={position.accuracy}
          pathOptions={{ color: '#1e88e5', weight: 1, fillOpacity: 0.1 }}
        />
      )}
    </>
  )
}

function FollowMe({
  position,
  following,
}: {
  position: GeoPosition | null
  following: boolean
}) {
  const map = useMap()
  useEffect(() => {
    if (following && position) map.setView([position.lat, position.lng])
  }, [following, position, map])
  return null
}

function MapEvents({
  onLongPress,
  onUserMove,
}: {
  onLongPress?: (lat: number, lng: number) => void
  onUserMove: () => void
}) {
  useMapEvents({
    contextmenu: (e) => onLongPress?.(e.latlng.lat, e.latlng.lng),
    dragstart: onUserMove,
  })
  return null
}

function CenterTracker({
  active,
  onCenter,
}: {
  active: boolean
  onCenter: (c: [number, number]) => void
}) {
  const map = useMap()
  useMapEvents({
    move: () => {
      if (active) {
        const c = map.getCenter()
        onCenter([c.lat, c.lng])
      }
    },
  })
  useEffect(() => {
    if (active) {
      const c = map.getCenter()
      onCenter([c.lat, c.lng])
    }
  }, [active, map, onCenter])
  return null
}

function FlyTo({
  target,
  onFly,
}: {
  target: {
    lat: number
    lng: number
    t: number
    bounds?: [[number, number], [number, number]]
  } | null
  onFly: () => void
}) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    onFly()
    if (target.bounds) map.flyToBounds(target.bounds, { padding: [40, 40] })
    else map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 15))
  }, [target, map, onFly])
  return null
}

export default function MapView({
  points = [],
  routes = [],
  recordingCoords = [],
  others = [],
  rotation = 0,
  onMarkerTap,
  onRouteTap,
  onLongPress,
  movingId,
  onCenterChange,
  flyTo,
  position = null,
  error = null,
}: {
  points?: Point[]
  routes?: RouteRow[]
  recordingCoords?: { lat: number; lng: number }[]
  others?: LivePos[]
  rotation?: number
  onMarkerTap?: (p: Point) => void
  onRouteTap?: (r: RouteRow) => void
  onLongPress?: (lat: number, lng: number) => void
  movingId?: string | null
  onCenterChange?: (lat: number, lng: number) => void
  flyTo?: {
    lat: number
    lng: number
    t: number
    bounds?: [[number, number], [number, number]]
  } | null
  position?: GeoPosition | null
  error?: string | null
}) {
  const [following, setFollowing] = useState(true)
  const [center, setCenter] = useState<[number, number] | null>(null)
  const stopFollowing = useCallback(() => setFollowing(false), [])

  useEffect(() => {
    if (movingId && center) onCenterChange?.(center[0], center[1])
  }, [movingId, center, onCenterChange])

  return (
    <div
      className={rotation ? 'mrot' : undefined}
      style={{ ['--rot' as string]: `${rotation}deg` }}
    >
      <MapContainer
        center={position ? [position.lat, position.lng] : DEFAULT_CENTER}
        zoom={14}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Esri World Imagery">
            <TileLayer url={ESRI_URL} attribution="Tiles © Esri" />
          </LayersControl.BaseLayer>
        </LayersControl>
        <CurrentPositionMarker position={position} />
        {points.map((p) => (
          <PointMarker
            key={p.id}
            point={p}
            onTap={(pt) => onMarkerTap?.(pt)}
            moving={p.id === movingId}
            position={p.id === movingId && center ? center : undefined}
          />
        ))}
        {routes.map((r) => (
          <RoutePolyline key={r.id} route={r} onTap={onRouteTap} />
        ))}
        {others.map((o) => (
          <MemberMarker key={o.user_id} pos={o} />
        ))}
        {recordingCoords.length > 1 && (
          <Polyline
            positions={recordingCoords.map((c) => [c.lat, c.lng] as [number, number])}
            pathOptions={{ color: '#7b3fb3', weight: 3, dashArray: '6 8' }}
          />
        )}
        <FollowMe position={position} following={following} />
        <MapEvents onLongPress={onLongPress} onUserMove={stopFollowing} />
        <CenterTracker active={!!movingId} onCenter={setCenter} />
        <FlyTo target={flyTo ?? null} onFly={stopFollowing} />
      </MapContainer>

      {!following && (
        <button className="follow-btn" onClick={() => setFollowing(true)}>
          Re-center
        </button>
      )}
      {error && <div className="geo-error">{error}</div>}
    </div>
  )
}
