import { describe, expect, it, vi } from 'vitest'
import { subscribePoints, upsertPoint } from './api'

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

describe('upsertPoint', () => {
  it('calls upsert_point rpc with payload', async () => {
    rpc.mockResolvedValue({ data: { id: 'p1' }, error: null })
    const input = {
      adventure_id: 'a1',
      client_id: 'c1',
      name: 'Obstacle 1',
      kind: 'obstacle',
      lat: -33.5,
      lng: 18.4,
    }
    const r = await upsertPoint(input)
    expect(rpc).toHaveBeenCalledWith('upsert_point', { p: input })
    expect(r.id).toBe('p1')
  })
})

describe('subscribePoints', () => {
  it('subscribes with adventure filter', () => {
    subscribePoints('a1', vi.fn())
    expect(onMock).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        table: 'points',
        filter: 'adventure_id=eq.a1',
      }),
      expect.any(Function),
    )
  })
})
