import { describe, expect, it } from 'vitest'
import { bearingDeg, haversineM } from './geo'

const capeTown = { lat: -33.9249, lng: 18.4241 }
const johannesburg = { lat: -26.2041, lng: 28.0473 }

describe('haversineM', () => {
  it('returns 0 for same point', () => {
    expect(haversineM(capeTown, capeTown)).toBe(0)
  })

  it('Cape Town to Johannesburg is ~1262 km', () => {
    const d = haversineM(capeTown, johannesburg)
    expect(d).toBeGreaterThan(1262000 * 0.99)
    expect(d).toBeLessThan(1262000 * 1.01)
  })
})

describe('bearingDeg', () => {
  it('north is 0', () => {
    expect(
      bearingDeg({ lat: 0, lng: 0 }, { lat: 1, lng: 0 }),
    ).toBeCloseTo(0, 1)
  })

  it('east is 90', () => {
    expect(
      bearingDeg({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }),
    ).toBeCloseTo(90, 1)
  })
})
