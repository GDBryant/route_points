import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { syncRoutesFromServer } from "./repo";

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
});
