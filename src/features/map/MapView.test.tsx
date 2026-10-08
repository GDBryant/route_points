import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MapView from './MapView'

let handlers: Record<string, (...args: unknown[]) => void>
const map = {
  setView: vi.fn(),
  flyTo: vi.fn(),
  flyToBounds: vi.fn(),
  getZoom: () => 14,
  getCenter: () => ({ lat: 5, lng: 6 }),
}

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
  useMap: () => map,
  useMapEvents: (h: Record<string, (...args: unknown[]) => void>) => {
    handlers = { ...handlers, ...h }
  },
  Marker: ({ position }: { position: [number, number] }) => (
    <div data-testid="marker" data-pos={String(position)} />
  ),
  Polyline: () => null,
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

  it('hides Re-center while following', () => {
    render(<MapView />)
    expect(screen.queryByText('Re-center')).toBeNull()
  })

  it('shows Re-center after manual drag and hides after click', () => {
    render(<MapView />)
    act(() => handlers.dragstart())
    const btn = screen.getByText('Re-center')
    fireEvent.click(btn)
    expect(screen.queryByText('Re-center')).toBeNull()
  })

  it('stops following on flyTo', () => {
    render(<MapView flyTo={{ lat: 1, lng: 2, t: 1 }} />)
    expect(screen.getByText('Re-center')).toBeInTheDocument()
  })

  it('moving marker tracks map centre', () => {
    const p = {
      id: 'p1',
      name: 'Obstacle 1',
      kind: 'obstacle',
      seq: 1,
      lat: 0,
      lng: 0,
      note: null,
    }
    const fn = vi.fn()
    render(<MapView points={[p]} movingId="p1" onCenterChange={fn} />)
    expect(screen.getByTestId('marker').dataset.pos).toBe('5,6')
    expect(fn).toHaveBeenCalledWith(5, 6)
  })
})
