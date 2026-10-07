import { useEffect, useState } from 'react'
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

function LongPress({ onLongPress }: { onLongPress?: (lat: number, lng: number) => void }) {
  useMapEvents({
    contextmenu: (e) => onLongPress?.(e.latlng.lat, e.latlng.lng),
  })
  return null
}

function FlyTo({ target }: { target: { lat: number; lng: number; t: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 15))
  }, [target, map])
  return null
}

export default function MapView({
  points = [],
  onMarkerTap,
  onLongPress,
  flyTo,
  position = null,
  error = null,
}: {
  points?: Point[]
  onMarkerTap?: (p: Point) => void
  onLongPress?: (lat: number, lng: number) => void
  flyTo?: { lat: number; lng: number; t: number } | null
  position?: GeoPosition | null
  error?: string | null
}) {
  const [following, setFollowing] = useState(true)

  return (
    <>
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
          <PointMarker key={p.id} point={p} onTap={(pt) => onMarkerTap?.(pt)} />
        ))}
        <FollowMe position={position} following={following} />
        <LongPress onLongPress={onLongPress} />
        <FlyTo target={flyTo ?? null} />
      </MapContainer>
      <button
        className={`follow-btn${following ? ' active' : ''}`}
        onClick={() => setFollowing((f) => !f)}
      >
        {following ? 'Following' : 'Follow me'}
      </button>
      {error && <div className="geo-error">{error}</div>}
    </>
  )
}
