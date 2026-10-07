import { describe, expect, it } from 'vitest'
import { fromGpx, toGpx } from './gpx'
import garminGpx from './__fixtures__/garmin.gpx?raw'
import type { Point } from '@/features/points/api'
import type { RouteRow } from '@/features/routes/api'

const pts: Point[] = [
  {
    id: 'p1',
    name: 'A & B <x>',
    kind: 'camp',
    seq: null,
    lat: -33.5,
    lng: 18.4,
    note: 'n "o"te',
  },
  {
    id: 'p2',
    name: 'Gate',
    kind: 'entrance',
    seq: null,
    lat: -33.6,
    lng: 18.5,
    note: null,
  },
]

const rts: RouteRow[] = [
  {
    id: 'r1',
    adventure_id: 'a',
    client_id: 'c1',
    name: 'A → B',
    from_point_id: 'p1',
    to_point_id: 'p2',
    direction: 'forward',
    mode: 'manual',
    interval_s: null,
    started_at: null,
    ended_at: null,
    coords: [
      [18.4, -33.5],
      [18.45, -33.55],
      [18.5, -33.6],
    ],
  },
]

describe('gpx', () => {
  it('round-trips points and routes', () => {
    const xml = toGpx({ name: 'Adv' }, pts, rts)
    const { points, routes } = fromGpx(xml, 'a1')
    expect(points).toHaveLength(2)
    expect(points[0].name).toBe('A & B <x>')
    expect(points[0].kind).toBe('camp')
    expect(points[0].lat).toBe(-33.5)
    expect(points[0].note).toBe('n "o"te')
    expect(routes).toHaveLength(1)
    expect(routes[0].route.name).toBe('A → B')
    expect(routes[0].waypoints).toHaveLength(3)
    expect(routes[0].waypoints[2].lat).toBe(-33.6)
    expect(routes[0].route.client_id).toBeTruthy()
  })

  it('imports Garmin-style gpx', () => {
    const { points, routes } = fromGpx(garminGpx, 'a1')
    expect(points).toHaveLength(3)
    expect(points[1].name).toBe('Camp & Kitchen')
    expect(points[2].kind).toBe('entrance')
    expect(routes).toHaveLength(1)
    expect(routes[0].waypoints).toHaveLength(4)
    expect(routes[0].waypoints[0].recorded_at).toBe('2026-10-07T08:00:00Z')
  })

  it('throws on invalid XML', () => {
    expect(() => fromGpx('<gpx><wpt', 'a1')).toThrow('invalid_gpx')
  })
})
