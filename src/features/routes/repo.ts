import { db } from '@/lib/db'
import { enqueue } from '@/features/sync/outbox'
import {
  listRoutes,
  type RouteInput,
  type RouteRow,
  type WaypointInput,
} from './api'

export async function syncRoutesFromServer(adventureId: string) {
  const remote = await listRoutes(adventureId)
  await db.transaction('rw', db.routes, db.outbox, async () => {
    const local = await db.routes
      .where('adventure_id')
      .equals(adventureId)
      .toArray()
    const remoteIds = new Set(remote.map((r) => r.id))
    const pendingClientIds = new Set(
      (await db.outbox.toArray())
        .filter((i) => i.kind === 'upsert_route')
        .map((i) => (i.payload as { client_id: string }).client_id),
    )
    for (const r of local) {
      if (
        !remoteIds.has(r.id) &&
        !pendingClientIds.has(r.client_id)
      )
        await db.routes.delete(r.id)
    }
    const localByClient = new Map(local.map((r) => [r.client_id, r]))
    await db.routes.bulkPut(
      remote.map((r) =>
        r.coords.length
          ? r
          : {
              ...r,
              coords: localByClient.get(r.client_id)?.coords ?? r.coords,
            },
      ),
    )
  })
}

export async function saveRouteLocal(
  input: RouteInput & { coords?: [number, number][] },
): Promise<RouteRow> {
  const existing = await db.routes
    .where('client_id')
    .equals(input.client_id)
    .first()
  const row: RouteRow = {
    id: existing?.id ?? input.client_id,
    adventure_id: input.adventure_id,
    client_id: input.client_id,
    name: input.name ?? '',
    from_point_id: input.from_point_id ?? null,
    to_point_id: input.to_point_id ?? null,
    direction: input.direction ?? 'both',
    mode: input.mode,
    interval_s: input.interval_s ?? null,
    started_at: input.started_at ?? null,
    ended_at: input.ended_at ?? null,
    coords: input.coords ?? existing?.coords ?? [],
  }
  await db.routes.put(row)
  await enqueue('upsert_route', input)
  return row
}

export async function updateRouteCoordsLocal(
  clientId: string,
  coords: [number, number][],
) {
  const r = await db.routes.where('client_id').equals(clientId).first()
  if (r) await db.routes.update(r.id, { coords })
}

export async function queueWaypoints(
  routeClientId: string,
  wps: WaypointInput[],
) {
  await enqueue('add_waypoints', { route_client_id: routeClientId, wps })
}

export async function removeRoute(route: RouteRow) {
  await db.routes.delete(route.id)
  if (route.id === route.client_id) {
    const items = await db.outbox.toArray()
    for (const i of items) {
      const p = i.payload as { client_id?: string; route_client_id?: string }
      if (
        (i.kind === 'upsert_route' && p.client_id === route.client_id) ||
        (i.kind === 'add_waypoints' &&
          p.route_client_id === route.client_id)
      )
        await db.outbox.delete(i.id!)
    }
    return
  }
  await enqueue('delete_route', { id: route.id })
}
