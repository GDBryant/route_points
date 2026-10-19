import { db } from "@/lib/db";
import { defineEntity } from "@/lib/entity";
import { enqueue } from "@/features/sync/outbox";
import {
  listRoutes,
  listRoutesByToken,
  subscribeRoutes,
  type RouteInput,
  type RouteRow,
  type WaypointInput,
} from "./api";
import "./sync";

export const routeEntity = defineEntity<RouteRow>({
  table: db.routes,
  kindUpsert: "upsert_route",
  kindDelete: "delete_route",
  list: listRoutes,
  listByToken: listRoutesByToken,
  subscribe: subscribeRoutes,
  mergeRemote: (r, local) =>
    r.coords.length ? r : { ...r, coords: local?.coords ?? r.coords },
  ownsItem: (item, clientId) => {
    const p = item.payload as { client_id?: string; route_client_id?: string };
    return (
      (item.kind === "upsert_route" && p.client_id === clientId) ||
      (item.kind === "add_waypoints" && p.route_client_id === clientId)
    );
  },
});

export const syncRoutesFromServer = routeEntity.syncFromServer;
export const removeRoute = routeEntity.remove;

export async function saveRouteLocal(
  input: RouteInput & { coords?: [number, number][] },
): Promise<RouteRow> {
  const existing = await db.routes
    .where("client_id")
    .equals(input.client_id)
    .first();
  const row: RouteRow = {
    id: existing?.id ?? input.client_id,
    adventure_id: input.adventure_id,
    client_id: input.client_id,
    name: input.name ?? "",
    from_point_id: input.from_point_id ?? null,
    to_point_id: input.to_point_id ?? null,
    direction: input.direction ?? "both",
    mode: input.mode,
    interval_s: input.interval_s ?? null,
    started_at: input.started_at ?? null,
    ended_at: input.ended_at ?? null,
    coords: input.coords ?? existing?.coords ?? [],
  };
  await db.routes.put(row);
  await enqueue("upsert_route", input);
  return row;
}

export async function updateRouteCoordsLocal(
  clientId: string,
  coords: [number, number][],
) {
  const r = await db.routes.where("client_id").equals(clientId).first();
  if (r) await db.routes.update(r.id, { coords });
}

export async function queueWaypoints(
  routeClientId: string,
  wps: WaypointInput[],
) {
  await enqueue("add_waypoints", { route_client_id: routeClientId, wps });
}
