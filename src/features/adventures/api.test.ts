import { describe, expect, it, vi } from 'vitest'
import { listAdventures, shareUrl } from './api'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}))

import { supabase } from '@/lib/supabase'

const rows = [
  {
    role: 'owner',
    last_opened_at: '2026-10-07T10:00:00Z',
    adventures: {
      id: 'a1',
      name: 'Trip 1',
      description: '',
      share_token: 't1',
      snap_radius_m: 20,
    },
  },
  {
    role: 'editor',
    last_opened_at: '2026-10-06T10:00:00Z',
    adventures: {
      id: 'a2',
      name: 'Trip 2',
      description: '',
      share_token: 't2',
      snap_radius_m: 20,
    },
  },
]

describe('listAdventures', () => {
  it('maps membership rows ordered by last_opened desc', async () => {
    const order = vi.fn().mockResolvedValue({ data: rows, error: null })
    const select = vi.fn().mockReturnValue({ order })
    vi.mocked(supabase.from).mockReturnValue({ select } as never)

    const list = await listAdventures()
    expect(supabase.from).toHaveBeenCalledWith('adventure_members')
    expect(order).toHaveBeenCalledWith('last_opened_at', {
      ascending: false,
    })
    expect(list.map((a) => a.id)).toEqual(['a1', 'a2'])
    expect(list[0]).toMatchObject({ name: 'Trip 1', role: 'owner' })
  })
})

describe('shareUrl', () => {
  it('builds join URL from origin', () => {
    expect(shareUrl('abc')).toBe(`${location.origin}/join/abc`)
  })
})
