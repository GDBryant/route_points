import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePoints } from './usePoints'
import type { Point } from './api'

const mk = (id: string, name = id): Point => ({
  id,
  name,
  kind: 'obstacle',
  seq: null,
  lat: 0,
  lng: 0,
  note: null,
})

let cb: (e: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Point
  old: { id: string }
}) => void

vi.mock('./api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./api')>()
  return {
    ...mod,
    listPoints: vi.fn().mockResolvedValue([
      { id: 'a', name: 'a', kind: 'obstacle', seq: null, lat: 0, lng: 0, note: null },
    ]),
    subscribePoints: vi.fn((_id: string, fn: typeof cb) => {
      cb = fn
      return () => {}
    }),
  }
})

describe('usePoints', () => {
  it('loads then applies realtime INSERT/UPDATE/DELETE', async () => {
    const { result } = renderHook(() => usePoints({ adventureId: 'adv1' }))
    await waitFor(() => expect(result.current.points).toHaveLength(1))
    expect(result.current.points[0].id).toBe('a')

    act(() => cb({ eventType: 'INSERT', new: mk('b'), old: { id: '' } }))
    await waitFor(() =>
      expect(result.current.points.map((p) => p.id)).toEqual(['a', 'b']),
    )

    act(() =>
      cb({ eventType: 'UPDATE', new: mk('a', 'renamed'), old: { id: 'a' } }),
    )
    await waitFor(() =>
      expect(result.current.points[0].name).toBe('renamed'),
    )

    act(() => cb({ eventType: 'DELETE', new: mk('x'), old: { id: 'a' } }))
    await waitFor(() =>
      expect(result.current.points.map((p) => p.id)).toEqual(['b']),
    )
  })
})
