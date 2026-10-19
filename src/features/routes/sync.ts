import { db } from "@/lib/db";
import { registerOutboxHandler } from "@/features/sync/outbox";
import {
  addWaypoints,
  deleteRoute,
  upsertRoute,
  type RouteInput,
  type RouteRow,
  type WaypointInput,
} from "./api";

registerOutboxHandler("upsert_route", {
  run: (p) => upsertRoute(p as RouteInput),
  reconcile: async (payload, result) => {
    const row = result as RouteRow | null;
    if (!row?.id) return;
    const clientId = (payload as RouteInput).client_id;
    const existing = await db.routes
      .where("client_id")
      .equals(clientId)
      .first();
    if (existing) {
      await db.routes.delete(existing.id);
      await db.routes.put({
        ...existing,
        id: row.id,
        name: row.name,
        direction: row.direction,
        ended_at: row.ended_at,
      });
    }
  },
  refs: ["from_point_id", "to_point_id"],
});

registerOutboxHandler("add_waypoints", {
  run: (p) => {
    const x = p as { route_client_id: string; wps: WaypointInput[] };
    return addWaypoints(x.route_client_id, x.wps);
  },
  reconcile: async (payload) => {
    const p = payload as {
      route_client_id: string;
      wps: { seq: number; lat: number; lng: number }[];
    };
    const route = await db.routes
      .where("client_id")
      .equals(p.route_client_id)
      .first();
    if (route) {
      const coords = (route.coords ?? []) as [number, number][];
      for (const w of p.wps) coords[w.seq - 1] = [w.lng, w.lat];
      await db.routes.update(route.id, { coords });
    }
  },
});

registerOutboxHandler("delete_route", {
  run: (p) => deleteRoute((p as { id: string }).id),
  refs: ["id"],
});
