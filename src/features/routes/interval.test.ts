import { describe, expect, it } from 'vitest'
import { formatInterval, secondsToT, tToSeconds } from './interval'

describe('tToSeconds', () => {
  it('t=0 → 5, t=1 → 300', () => {
    expect(tToSeconds(0)).toBe(5)
    expect(tToSeconds(1)).toBe(300)
  })
  it('t=0.5 → ~39 (log scale)', () => {
    expect(tToSeconds(0.5)).toBe(Math.round(5 * Math.sqrt(60)))
  })
  it('clamps outside [0,1]', () => {
    expect(tToSeconds(-1)).toBe(5)
    expect(tToSeconds(2)).toBe(300)
  })
  it('roundtrips snap marks', () => {
    for (const s of [5, 10, 30, 60, 120, 300]) {
      expect(tToSeconds(secondsToT(s))).toBe(s)
    }
  })
})

describe('formatInterval', () => {
  it('formats', () => {
    expect(formatInterval(5)).toBe('5s')
    expect(formatInterval(45)).toBe('45s')
    expect(formatInterval(60)).toBe('1m')
    expect(formatInterval(150)).toBe('2m 30s')
    expect(formatInterval(300)).toBe('5m')
  })
})
