import { useEffect, useState } from 'react'
import {
  Circle,
  CircleMarker,
  LayersControl,
  MapContainer,
  TileLayer,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useGeolocation } from '@/features/tracking/useGeolocation'
import type { GeoPosition } from '@/features/tracking/useGeolocation'

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

export default function MapView() {
  const { position, error } = useGeolocation()
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
        <FollowMe position={position} following={following} />
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
