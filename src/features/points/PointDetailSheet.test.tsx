import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PointDetailSheet from './PointDetailSheet'
import type { Point } from './api'

const p: Point = {
  id: 'p1',
  name: 'Obstacle 1',
  kind: 'obstacle',
  seq: 1,
  lat: -33.0,
  lng: 18.0,
  note: 'big dune',
}

const pos = { lat: -33.0, lng: 18.01, accuracy: 5, heading: 0, speed: 0 }

const renderSheet = (isEditor: boolean) =>
  render(
    <PointDetailSheet
      point={p}
      position={pos}
      isEditor={isEditor}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      onClose={vi.fn()}
    />,
  )

describe('PointDetailSheet', () => {
  it('shows distance and bearing from position', () => {
    renderSheet(false)
    expect(screen.getByText(/obstacle · \d+ m · \d+°/)).toBeInTheDocument()
  })

  it('hides Edit/Delete for viewers', () => {
    renderSheet(false)
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('shows Edit/Delete for editors', () => {
    renderSheet(true)
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })
})
