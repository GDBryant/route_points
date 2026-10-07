import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRecorder } from './useRecorder'
import type { GeoPosition } from '@/features/tracking/useGeolocation'
import type { Point } from '@/features/points/api'

const addWaypoints = vi.fn().mockResolvedValue(1)
vi.mock('./api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./api')>()
  return { ...mod, addWaypoints: (...args: unknown[]) => addWaypoints(...args) }
})

const pos = (accuracy = 5): GeoPosition => ({
  lat: -33.5,
  lng: 18.4,
  accuracy,
  heading: 0,
  speed: 0,
})

const pt = (id: string, lat = -33.5001, lng = 18.4001): Point => ({
  id,
  name: id,
  kind: 'obstacle',
  seq: null,
  lat,
  lng,
  note: null,
})

describe('useRecorder', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    addWaypoints.mockClear()
  })
  afterEach(() => vi.useRealTimers())

  it('auto mode drops waypoints on interval', async () => {
    const { result } = renderHook(() => useRecorder(pos(), [], 20))
    act(() => result.current.start('auto', 5))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16_000)
    })
    expect(result.current.waypointCount).toBeGreaterThanOrEqual(3)
    expect(result.current.route?.interval_s).toBe(5)
  })

  it('skips waypoint when accuracy > 50 m', () => {
    const { result } = renderHook(() => useRecorder(pos(100), [], 20))
    act(() => result.current.start('manual', null))
    act(() => result.current.dropWaypoint())
    expect(result.current.waypointCount).toBe(0)
  })

  it('manual drop + flush on stop calls addWaypoints', async () => {
    const { result } = renderHook(() => useRecorder(pos(), [], 20))
    act(() => result.current.start('manual', null))
    act(() => result.current.dropWaypoint())
    act(() => result.current.dropWaypoint())
    expect(result.current.waypointCount).toBe(2)
    const cid = result.current.route!.client_id
    await act(async () => {
      await result.current.stop()
    })
    expect(addWaypoints).toHaveBeenCalledWith(
      cid,
      expect.arrayContaining([
        expect.objectContaining({ seq: 1 }),
        expect.objectContaining({ seq: 2 }),
      ]),
    )
  })

  it('requests and releases wake lock', async () => {
    const release = vi.fn()
    const request = vi.fn().mockResolvedValue({ release })
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request },
      configurable: true,
    })
    const { result } = renderHook(() => useRecorder(pos(), [], 20))
    act(() => result.current.start('manual', null))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(request).toHaveBeenCalledWith('screen')
    await act(async () => {
      await result.current.stop()
    })
    expect(release).toHaveBeenCalled()
  })

  it('snaps from_point to nearest point within radius', () => {
    const { result } = renderHook(() =>
      useRecorder(pos(), [pt('p-near'), pt('p-far', 0, 0)], 20),
    )
    act(() => result.current.start('manual', null))
    expect(result.current.route?.from_point_id).toBe('p-near')
  })

  it('flushes buffered waypoints at 10', async () => {
    const { result } = renderHook(() => useRecorder(pos(), [], 20))
    act(() => result.current.start('manual', null))
    for (let i = 0; i < 10; i++) act(() => result.current.dropWaypoint())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(addWaypoints).toHaveBeenCalled()
  })
})
