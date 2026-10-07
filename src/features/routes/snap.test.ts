import { describe, expect, it } from 'vitest'
import { nearestPoint } from './snap'
import type { Point } from '@/features/points/api'

const p = (id: string, lat: number, lng: number): Point => ({
  id,
  name: id,
  kind: 'obstacle',
  seq: null,
  lat,
  lng,
  note: null,
})

const pos = { lat: -33.5, lng: 18.4 }

describe('nearestPoint', () => {
  it('returns point within radius', () => {
    const pts = [p('near', -33.5001, 18.4001)]
    expect(nearestPoint(pos, pts, 20)?.id).toBe('near')
  })
  it('returns null outside radius', () => {
    const pts = [p('far', -33.6, 18.5)]
    expect(nearestPoint(pos, pts, 20)).toBeNull()
  })
  it('returns nearest of two', () => {
    const pts = [p('farther', -33.5003, 18.4003), p('nearer', -33.5001, 18.4001)]
    expect(nearestPoint(pos, pts, 100)?.id).toBe('nearer')
  })
  it('null position → null', () => {
    expect(nearestPoint(null, [p('x', 0, 0)], 99999)).toBeNull()
  })
})
