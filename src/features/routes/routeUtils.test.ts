import { describe, expect, it } from 'vitest'
import { arrowPositions, routeLengthM, withEndpoints } from './routeUtils'
import type { Point } from '@/features/points/api'

const line: [number, number][] = Array.from({ length: 12 }, (_, i) => [
  18.4 + i * 0.001,
  -33.5,
])

describe('arrowPositions', () => {
  it('returns arrows for multi-point route', () => {
    expect(arrowPositions(line).length).toBeGreaterThan(0)
  })
  it('empty for <2 points', () => {
    expect(arrowPositions([[18.4, -33.5]])).toHaveLength(0)
  })
})

describe('routeLengthM', () => {
  it('sums segment lengths', () => {
    expect(routeLengthM(line)).toBeGreaterThan(900)
    expect(routeLengthM(line)).toBeLessThan(1400)
  })
})

const pt = (lng: number, lat: number): Point => ({
  id: 'p',
  name: '',
  kind: '',
  seq: null,
  lat,
  lng,
  note: null,
})

describe('withEndpoints', () => {
  it('prepends from', () => {
    expect(withEndpoints(line, pt(1, 2), null)[0]).toEqual([1, 2])
  })
  it('appends to', () => {
    expect(withEndpoints(line, null, pt(3, 4)).at(-1)).toEqual([3, 4])
  })
  it('same reference when neither given', () => {
    expect(withEndpoints(line)).toBe(line)
  })
  it('unchanged when coords empty', () => {
    const empty: [number, number][] = []
    expect(withEndpoints(empty, pt(1, 2), pt(3, 4))).toBe(empty)
  })
})
