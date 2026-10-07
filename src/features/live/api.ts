import { supabase } from '@/lib/supabase'

export interface PositionInput {
  adventure_id: string
  user_id: string
  lat: number
  lng: number
  heading?: number | null
  speed?: number | null
  accuracy_m?: number | null
}

export async function upsertPosition(input: PositionInput): Promise<void> {
  const { error } = await supabase.rpc('upsert_position', {
    p: JSON.parse(JSON.stringify(input)),
  })
  if (error) throw error
}
