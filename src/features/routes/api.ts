import { supabase } from '@/lib/supabase'

export interface RouteRow {
  id: string
  adventure_id: string
  client_id: string
  name: string
  from_point_id: string | null
  to_point_id: string | null
  direction: string
  mode: string
  interval_s: number | null
  started_at: string | null
  ended_at: string | null
  coords: [number, number][]
}

export interface RouteInput {
  adventure_id: string
  client_id: string
  name?: string
  from_point_id?: string | null
  to_point_id?: string | null
  direction?: string
  mode: string
  interval_s?: number | null
  started_at?: string
  ended_at?: string | null
}

export interface WaypointInput {
  client_id: string
  seq: number
  lat: number
  lng: number
  accuracy_m?: number | null
  recorded_at: string
}

function parse(r: Record<string, unknown>): RouteRow {
  return { ...r, coords: r.coords as [number, number][] } as RouteRow
}

export async function listRoutes(adventureId: string): Promise<RouteRow[]> {
  const { data, error } = await supabase
    .from('routes_with_coords')
    .select('*')
    .eq('adventure_id', adventureId)
  if (error) throw error
  return (data ?? []).map((r) => parse(r as Record<string, unknown>))
}

export async function listRoutesByToken(token: string): Promise<RouteRow[]> {
  const { data, error } = await supabase.rpc('get_adventure_routes', { token })
  if (error) throw error
  return (data ?? []).map((r) => ({
    ...parse(r as Record<string, unknown>),
    adventure_id: '',
    client_id: '',
    mode: '',
    interval_s: null,
    started_at: null,
    ended_at: null,
  }))
}

export async function upsertRoute(input: RouteInput): Promise<RouteRow> {
  const { data, error } = await supabase.rpc('upsert_route', {
    r: JSON.parse(JSON.stringify(input)),
  })
  if (error) throw error
  return { ...data, coords: [] } as unknown as RouteRow
}

export async function addWaypoints(
  routeClientId: string,
  wps: WaypointInput[],
): Promise<number> {
  const { data, error } = await supabase.rpc('add_waypoints', {
    route_client_id: routeClientId,
    wps: JSON.parse(JSON.stringify(wps)),
  })
  if (error) throw error
  return data
}

export async function deleteRoute(id: string): Promise<void> {
  const { error } = await supabase.from('routes').delete().eq('id', id)
  if (error) throw error
}

export function subscribeRoutes(
  adventureId: string,
  cb: (event: { eventType: string }) => void,
) {
  const channel = supabase
    .channel(`routes:${adventureId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'routes',
        filter: `adventure_id=eq.${adventureId}`,
      },
      (payload) => cb({ eventType: payload.eventType }),
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}
