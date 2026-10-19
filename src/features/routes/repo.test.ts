import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import {
  queueWaypoints,
  removeRoute,
  saveRouteLocal,
  syncRoutesFromServer,
} from "./repo";

vi.mock("./api", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./api")>();
  return {
    ...mod,
    listRoutes: vi.fn().mockResolvedValue([
      {
        id: "srv1",
        adventure_id: "adv1",
        client_id: "srv1",
        name: "remote",
        from_point_id: null,
        to_point_id: null,
        direction: "both",
        mode: "manual",
        interval_s: null,
        started_at: null,
        ended_at: null,
        coords: [],
      },
    ]),
  };
});

describe("routes repo", () => {
  beforeEach(async () => {
    await db.routes.clear();
    await db.outbox.clear();
  });

  it("pending delete_route keeps synced-deleted route out", async () => {
    await db.routes.put({
      id: "srv1",
      adventure_id: "adv1",
      client_id: "srv1",
      name: "remote",
      from_point_id: null,
      to_point_id: null,
      direction: "both",
      mode: "manual",
      interval_s: null,
      started_at: null,
      ended_at: null,
      coords: [],
    });
    await db.outbox.add({
      kind: "delete_route",
      payload: { id: "srv1" },
      created_at: new Date().toISOString(),
      attempts: 0,
      last_error: null,
    });
    await db.routes.delete("srv1");
    await syncRoutesFromServer("adv1");
    expect(await db.routes.get("srv1")).toBeUndefined();
  });

  it("syncFromServer preserves local coords when remote has none", async () => {
    await db.routes.put({
      id: "srv1",
      adventure_id: "adv1",
      client_id: "srv1",
      name: "remote",
      from_point_id: null,
      to_point_id: null,
      direction: "both",
      mode: "manual",
      interval_s: null,
      started_at: null,
      ended_at: null,
      coords: [[18.4, -33.5]],
    });
    await syncRoutesFromServer("adv1");
    expect((await db.routes.get("srv1"))?.coords).toEqual([[18.4, -33.5]]);
  });

  it("removeRoute drops pending upsert_route + add_waypoints and queues delete_route", async () => {
    const r = await saveRouteLocal({
      adventure_id: "adv1",
      client_id: "c1",
      mode: "manual",
    });
    await queueWaypoints("c1", [
      { client_id: "w1", seq: 1, lat: 1, lng: 2, recorded_at: "t" },
    ]);
    await removeRoute(r);
    expect(await db.routes.get(r.id)).toBeUndefined();
    const items = await db.outbox.toArray();
    expect(items.map((i) => i.kind)).toEqual(["delete_route"]);
    expect(items[0].payload).toEqual({ id: r.id });
  });
});
