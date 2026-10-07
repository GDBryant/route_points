import { supabase } from '@/lib/supabase'

export interface Point {
  id: string
  client_id?: string
  name: string
  kind: string
  seq: number | null
  lat: number
  lng: number
  note: string | null
}

export interface PointInput {
  adventure_id: string
  client_id: string
  name: string
  kind: string
  seq?: number | null
  lat: number
  lng: number
  accuracy_m?: number | null
  note?: string
}

export async function listPoints(adventureId: string): Promise<Point[]> {
  const { data, error } = await supabase
    .from('points')
    .select('id, client_id, name, kind, seq, lat, lng, note')
    .eq('adventure_id', adventureId)
    .order('seq', { nullsFirst: false })
    .order('name')
  if (error) throw error
  return data as Point[]
}

export async function listPointsByToken(token: string): Promise<Point[]> {
  const { data, error } = await supabase.rpc('get_adventure_points', { token })
  if (error) throw error
  return data
}

export async function upsertPoint(input: PointInput): Promise<Point> {
  const { data, error } = await supabase.rpc('upsert_point', {
    p: JSON.parse(JSON.stringify(input)),
  })
  if (error) throw error
  return data as unknown as Point
}

export async function deletePoint(id: string): Promise<void> {
  const { error } = await supabase.from('points').delete().eq('id', id)
  if (error) throw error
}

export function subscribePoints(
  adventureId: string,
  cb: (event: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE'
    new: Point
    old: { id: string }
  }) => void,
) {
  const channel = supabase
    .channel(`points:${adventureId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'points',
        filter: `adventure_id=eq.${adventureId}`,
      },
      (payload) =>
        cb({
          eventType: payload.eventType,
          new: payload.new as Point,
          old: payload.old as { id: string },
        }),
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}
