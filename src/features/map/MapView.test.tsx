import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MapView from './MapView'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div className="leaflet-container">{children}</div>
  ),
  TileLayer: () => null,
  CircleMarker: () => null,
  Circle: () => null,
  LayersControl: Object.assign(
    ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    {
      BaseLayer: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
      ),
    },
  ),
  useMap: () => ({ setView: vi.fn(), flyTo: vi.fn(), getZoom: () => 14 }),
  useMapEvents: () => undefined,
  Marker: () => null,
}))

vi.mock('@/features/tracking/useGeolocation', () => ({
  useGeolocation: () => ({
    position: { lat: -33.56, lng: 18.48, accuracy: 10, heading: 0, speed: 0 },
    error: null,
  }),
}))

describe('MapView', () => {
  it('renders without crashing', () => {
    const { container } = render(<MapView />)
    expect(container.querySelector('.leaflet-container')).toBeInTheDocument()
  })
})
