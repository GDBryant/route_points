import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import FinishRouteSheet from './FinishRouteSheet'
import type { PendingRoute } from './useRecorder'
import type { Point } from '@/features/points/api'

const pt = (id: string, name: string, lat: number, lng: number): Point => ({
  id,
  name,
  kind: 'obstacle',
  seq: null,
  lat,
  lng,
  note: null,
})

const route: PendingRoute = {
  client_id: 'c1',
  mode: 'manual',
  interval_s: null,
  started_at: new Date().toISOString(),
  from_point_id: 'pA',
}

const points = [
  pt('pA', 'Point A', -33.5, 18.4),
  pt('pB', 'Point B', -33.5001, 18.4001),
]

const lastPos = { lat: -33.50015, lng: 18.40015, accuracy: 5, heading: 0, speed: 0 }

const renderSheet = (onSave = vi.fn()) =>
  render(
    <FinishRouteSheet
      route={route}
      lastPos={lastPos}
      points={points}
      snapRadiusM={20}
      routeCount={0}
      onSave={onSave}
    />,
  )

describe('FinishRouteSheet', () => {
  it('preselects to-point within snap radius and names route', () => {
    renderSheet()
    const selects = screen.getAllByRole('combobox')
    expect(selects[1]).toHaveValue('pB')
    expect(screen.getByPlaceholderText('Route name')).toHaveValue(
      'Point A → Point B',
    )
  })

  it('saves direction', () => {
    const onSave = vi.fn()
    renderSheet(onSave)
    fireEvent.click(screen.getByText('forward'))
    fireEvent.click(screen.getByText('Save route'))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'forward',
        to_point_id: 'pB',
        from_point_id: 'pA',
      }),
    )
  })
})
