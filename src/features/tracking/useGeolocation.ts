import { useEffect, useState } from 'react'

export interface GeoPosition {
  lat: number
  lng: number
  accuracy: number | null
  heading: number | null
  speed: number | null
}

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null)
  const [error, setError] = useState<string | null>(() =>
    typeof navigator !== 'undefined' && navigator.geolocation
      ? null
      : 'Geolocation not supported',
  )

  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (p) =>
        setPosition({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          heading: p.coords.heading,
          speed: p.coords.speed,
        }),
      (e) => setError(e.message),
      { enableHighAccuracy: true, maximumAge: 2000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  return { position, error }
}
