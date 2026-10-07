import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import NavigateHud from './NavigateHud'
import { fmtDistance } from './fmtDistance'
import type { Point } from '@/features/points/api'

const point: Point = {
  id: 'p1',
  name: 'Camp',
  kind: 'camp',
  seq: null,
  lat: -33.5,
  lng: 18.4,
  note: null,
}

describe('fmtDistance', () => {
  it('formats m and km', () => {
    expect(fmtDistance(850)).toBe('850 m')
    expect(fmtDistance(1300)).toBe('1.3 km')
  })
})

describe('NavigateHud', () => {
  it('shows distance and rotated arrow (bearing - heading)', () => {
    const pos = { lat: -33.51, lng: 18.4, accuracy: 5, heading: 0, speed: 0 }
    render(
      <NavigateHud point={point} position={pos} onClose={vi.fn()} />,
    )
    expect(screen.getByText('Camp')).toBeInTheDocument()
    expect(screen.getByText(/\d+(\.\d+)?\s?(m|km)/)).toBeInTheDocument()
    const arrow = document.querySelector('.nh-arrow') as HTMLElement
    expect(arrow.style.transform).toMatch(/rotate\(-?\d+(\.\d+)?deg\)/)
  })
})
