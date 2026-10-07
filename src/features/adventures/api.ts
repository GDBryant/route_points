import { supabase } from '@/lib/supabase'

export interface Adventure {
  id: string
  name: string
  description: string
  share_token: string
  snap_radius_m: number
  role: string
  last_opened_at: string
}

export function shareUrl(token: string): string {
  return `${location.origin}/join/${token}`
}

export async function listAdventures(): Promise<Adventure[]> {
  const { data, error } = await supabase
    .from('adventure_members')
    .select(
      'role, last_opened_at, adventures(id, name, description, share_token, snap_radius_m)',
    )
    .order('last_opened_at', { ascending: false })
  if (error) throw error
  return (data ?? [])
    .filter((m) => m.adventures)
    .map((m) => ({
      ...(m.adventures as unknown as Omit<Adventure, 'role' | 'last_opened_at'>),
      role: m.role,
      last_opened_at: m.last_opened_at ?? '',
    }))
}

export async function createAdventure(name: string): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')
  const { data, error } = await supabase
    .from('adventures')
    .insert({ name, owner_id: user.id })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function joinByToken(
  token: string,
  asRole = 'editor',
): Promise<string> {
  const { data, error } = await supabase.rpc('join_adventure', {
    token,
    as_role: asRole,
  })
  if (error) throw error
  return data as string
}

export interface AdventureStub {
  id: string
  name: string
  description: string
  snap_radius_m: number
}

export async function getByToken(token: string): Promise<AdventureStub | null> {
  const { data, error } = await supabase.rpc('get_adventure_by_token', {
    token,
  })
  if (error) throw error
  return data?.[0] ?? null
}

export async function touchAdventure(id: string): Promise<void> {
  await supabase.rpc('touch_adventure', { aid: id })
}
