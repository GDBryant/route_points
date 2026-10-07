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

export interface Member {
  user_id: string
  role: string
  display_name: string
  colour: string
}

export async function listMembers(adventureId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from('adventure_members')
    .select('user_id, role, profiles(display_name, colour)')
    .eq('adventure_id', adventureId)
  if (error) throw error
  return (data ?? []).map((m) => ({
    user_id: m.user_id,
    role: m.role,
    display_name:
      (m.profiles as unknown as { display_name: string } | null)
        ?.display_name ?? '',
    colour:
      (m.profiles as unknown as { colour: string } | null)?.colour ??
      '#1e88e5',
  }))
}

export async function myRole(adventureId: string): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('adventure_members')
    .select('role')
    .eq('adventure_id', adventureId)
    .eq('user_id', user.id)
    .maybeSingle()
  return data?.role ?? null
}
