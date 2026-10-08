import { describe, expect, it } from 'vitest'
import { pointIcon } from './pointIcon'
import type { Point } from './api'

const p: Point = {
  id: 'p1',
  name: 'Obstacle 1',
  kind: 'obstacle',
  seq: 1,
  lat: 0,
  lng: 0,
  note: null,
}

describe('pointIcon', () => {
  it('html contains point name', () => {
    const icon = pointIcon(p)
    expect(icon.options.html).toContain('Obstacle 1')
    expect(icon.options.html).toContain('#7b1fa2')
  })

  it('moving adds class', () => {
    expect(pointIcon(p, true).options.className).toBe('point-marker moving')
    expect(pointIcon(p).options.className).toBe('point-marker')
  })
})
