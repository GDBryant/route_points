import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AddPointSheet from './AddPointSheet'
import { suggestedName } from './suggestedName'
import type { Point } from './api'

const pts = (seqs: (number | null)[]): Point[] =>
  seqs.map((seq, i) => ({
    id: `p${i}`,
    name: `Obstacle ${seq}`,
    kind: 'obstacle',
    seq,
    lat: 0,
    lng: 0,
    note: null,
  }))

describe('suggestedName', () => {
  it('suggests Obstacle 3 when seq 1,2 exist', () => {
    expect(suggestedName(pts([1, 2]), 'obstacle')).toBe('Obstacle 3')
  })
  it('suggests Obstacle 1 when none exist', () => {
    expect(suggestedName([], 'obstacle')).toBe('Obstacle 1')
  })
  it('empty for non-obstacle kinds', () => {
    expect(suggestedName(pts([1]), 'camp')).toBe('')
  })
})

describe('AddPointSheet', () => {
  it('submits payload with lat/lng-independent fields', () => {
    const onSave = vi.fn()
    render(
      <AddPointSheet
        lat={-33.5}
        lng={18.4}
        accuracy={10}
        points={pts([1, 2])}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByPlaceholderText('Name')).toHaveValue('Obstacle 3')
    fireEvent.change(screen.getByPlaceholderText('Note (optional)'), {
      target: { value: 'steep' },
    })
    fireEvent.click(screen.getByText('Save'))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Obstacle 3',
        kind: 'obstacle',
        note: 'steep',
        seq: 3,
        accuracy_m: 10,
      }),
    )
  })

  it('edit mode submits same client_id', () => {
    const onSave = vi.fn()
    const initial = {
      id: 'p9',
      client_id: 'cid-9',
      name: 'Obstacle 9',
      kind: 'camp',
      seq: 9,
      lat: -33.5,
      lng: 18.4,
      note: 'old note',
    }
    render(
      <AddPointSheet
        lat={-33.5}
        lng={18.4}
        points={[]}
        initial={initial}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('Edit point')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Save'))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'cid-9', kind: 'camp' }),
    )
  })
})
