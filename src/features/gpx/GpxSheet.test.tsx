import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import GpxSheet from './GpxSheet'
import garminGpx from './__fixtures__/garmin.gpx?raw'

vi.mock('@/features/points/repo', () => ({
  savePointLocal: vi.fn().mockResolvedValue({ id: 'x' }),
}))
vi.mock('@/features/routes/repo', () => ({
  saveRouteLocal: vi.fn().mockResolvedValue({ id: 'r' }),
  queueWaypoints: vi.fn(),
}))

const gpxXml = garminGpx

describe('GpxSheet', () => {
  it('shows preview counts for a valid gpx', async () => {
    render(
      <GpxSheet
        adventureId="a1"
        isEditor={true}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    )
    const input = document.querySelector(
      'input[type=file]',
    ) as HTMLInputElement
    const file = new File([gpxXml], 't.gpx')
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() =>
      expect(screen.getByText(/3 waypoints, 1 routes/)).toBeInTheDocument(),
    )
  })

  it('shows error for invalid gpx', async () => {
    render(
      <GpxSheet
        adventureId="a1"
        isEditor={true}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    )
    const input = document.querySelector(
      'input[type=file]',
    ) as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['<gpx><wpt'], 'b.gpx')] },
    })
    await waitFor(() =>
      expect(screen.getByText('Invalid GPX file')).toBeInTheDocument(),
    )
  })
})
