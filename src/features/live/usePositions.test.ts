import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePositions } from './usePositions'

type Handler = (...args: unknown[]) => void
const handlers: Record<string, Handler> = {}
const send = vi.fn()
const track = vi.fn()
const subscribeCb = { fn: (_s: string) => {} }
const channel = {
  on: vi.fn((_t: string, f: unknown, cb: Handler) => {
    const ev = (f as { event: string }).event
    handlers[ev] = cb
    return channel
  }),
  subscribe: vi.fn((cb: (s: string) => void) => {
    subscribeCb.fn = cb
    return channel
  }),
  send,
  track,
  presenceState: vi.fn(() => ({})),
}
const removeChannel = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => channel),
    removeChannel: (...a: unknown[]) => removeChannel(...a),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    from: vi.fn(() => ({
      select: () => ({ eq: () => ({ data: [], error: null }) }),
    })),
  },
}))

vi.mock('@/features/sync/outbox', async (importOriginal) => {
  const mod =
    await importOriginal<typeof import('@/features/sync/outbox')>()
  return { ...mod, enqueuePosition: vi.fn() }
})

const pos = {
  lat: -33.5,
  lng: 18.4,
  accuracy: 5,
  heading: 90,
  speed: 2,
}
const self = { user_id: 'u1', name: 'Alice', colour: '#123' }

describe('usePositions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    send.mockClear()
    track.mockClear()
  })
  afterEach(() => vi.useRealTimers())

  it('publishes every 5 s when publishing', async () => {
    renderHook(() =>
      usePositions({
        adventureId: 'a1',
        publish: true,
        self,
        position: pos,
      }),
    )
    await act(async () => {
      subscribeCb.fn('SUBSCRIBED')
      await vi.advanceTimersByTimeAsync(11_000)
    })
    expect(send).toHaveBeenCalledTimes(2)
    expect(track).toHaveBeenCalledWith({ user_id: 'u1' })
  })

  it('does not publish when publish=false', async () => {
    renderHook(() =>
      usePositions({
        adventureId: 'a1',
        publish: false,
        self,
        position: pos,
      }),
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(21_000)
    })
    expect(send).not.toHaveBeenCalled()
  })

  it('applies incoming broadcast to others', async () => {
    const { result } = renderHook(() =>
      usePositions({
        adventureId: 'a1',
        publish: true,
        self,
        position: null,
      }),
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    act(() =>
      handlers.pos({
        payload: {
          user_id: 'u2',
          name: 'Bob',
          colour: '#f00',
          lat: -33.6,
          lng: 18.5,
          heading: null,
          speed: null,
          accuracy: null,
        },
      }),
    )
    expect(result.current.others.get('u2')?.name).toBe('Bob')
  })
})
