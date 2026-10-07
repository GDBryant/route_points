import { describe, expect, it } from 'vitest'
import { arrowPositions, routeLengthM } from './routeUtils'

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
