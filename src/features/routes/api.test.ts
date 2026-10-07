import { describe, expect, it, vi } from 'vitest'
import { addWaypoints, subscribeRoutes, upsertRoute } from './api'

const rpc = vi.fn()
const onMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    channel: vi.fn(() => {
      const ch = { on: onMock, subscribe: vi.fn() }
      onMock.mockReturnValue(ch)
      return ch
    }),
    removeChannel: vi.fn(),
    from: vi.fn(),
  },
}))

describe('routes api', () => {
  it('upsertRoute calls rpc', async () => {
    rpc.mockResolvedValue({ data: { id: 'r1' }, error: null })
    const input = { adventure_id: 'a', client_id: 'c', mode: 'manual' }
    await upsertRoute(input)
    expect(rpc).toHaveBeenCalledWith('upsert_route', {
      r: JSON.parse(JSON.stringify(input)),
    })
  })

  it('addWaypoints passes route_client_id and wps', async () => {
    rpc.mockResolvedValue({ data: 2, error: null })
    const wps = [
      {
        client_id: 'w1',
        seq: 1,
        lat: 0,
        lng: 0,
        recorded_at: '2026-01-01T00:00:00Z',
      },
    ]
    const n = await addWaypoints('rc1', wps)
    expect(rpc).toHaveBeenCalledWith('add_waypoints', {
      route_client_id: 'rc1',
      wps: JSON.parse(JSON.stringify(wps)),
    })
    expect(n).toBe(2)
  })

  it('subscribeRoutes filters by adventure', () => {
    subscribeRoutes('a1', vi.fn())
    expect(onMock).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ filter: 'adventure_id=eq.a1' }),
      expect.any(Function),
    )
  })
})
