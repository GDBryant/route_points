import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import RouteDetailSheet from './RouteDetailSheet'
import type { RouteRow } from './api'
import type { Point } from '@/features/points/api'

const pt = (id: string, name: string): Point => ({
  id,
  name,
  kind: 'obstacle',
  seq: null,
  lat: 0,
  lng: 0,
  note: null,
})

const points = [pt('a', 'A'), pt('b', 'B'), pt('c', 'C')]

const route: RouteRow = {
  id: 'r1',
  adventure_id: 'adv',
  client_id: 'c1',
  name: 'R1',
  from_point_id: 'a',
  to_point_id: 'b',
  direction: 'both',
  mode: 'manual',
  interval_s: null,
  started_at: null,
  ended_at: null,
  coords: [
    [0, 0],
    [0.001, 0.001],
  ],
}

const renderSheet = (isEditor: boolean, onUpdate = vi.fn()) => {
  render(
    <RouteDetailSheet
      route={route}
      points={points}
      isEditor={isEditor}
      onUpdate={onUpdate}
      onDelete={vi.fn()}
      onClose={vi.fn()}
    />,
  )
  return onUpdate
}

describe('RouteDetailSheet', () => {
  it('renders A → B summary', () => {
    renderSheet(false)
    expect(screen.getByText(/A → B/)).toBeTruthy()
  })

  it('non-editor sees no Edit/Delete', () => {
    renderSheet(false)
    expect(screen.queryByText('Edit')).toBeNull()
    expect(screen.queryByText('Delete')).toBeNull()
  })

  it('editor Edit → change → Save calls onUpdate', () => {
    const onUpdate = renderSheet(true)
    fireEvent.click(screen.getByText('Edit'))
    fireEvent.change(screen.getByPlaceholderText('Route name'), {
      target: { value: 'X' },
    })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: 'c' } })
    fireEvent.click(screen.getByText('reverse'))
    fireEvent.click(screen.getByText('Save'))
    expect(onUpdate).toHaveBeenCalledOnce()
    expect(onUpdate).toHaveBeenCalledWith(route, {
      name: 'X',
      from_point_id: 'a',
      to_point_id: 'c',
      direction: 'reverse',
    })
  })

  it('editor Edit → Cancel does not call onUpdate', () => {
    const onUpdate = renderSheet(true)
    fireEvent.click(screen.getByText('Edit'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(onUpdate).not.toHaveBeenCalled()
    expect(screen.getByText(/A → B/)).toBeTruthy()
  })

  it('direction button in view mode calls onUpdate', () => {
    const onUpdate = renderSheet(true)
    fireEvent.click(screen.getByText('forward'))
    expect(onUpdate).toHaveBeenCalledWith(route, {
      name: 'R1',
      from_point_id: 'a',
      to_point_id: 'b',
      direction: 'forward',
    })
  })
})
