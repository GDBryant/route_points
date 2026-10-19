import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "./db";
import { defineEntity, type EntityEvent } from "./entity";
import { routeEntity } from "@/features/routes/repo";

vi.mock("@/features/routes/api", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/features/routes/api")>();
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

describe("entity layer", () => {
  beforeEach(async () => {
    await db.routes.clear();
    await db.points.clear();
    await db.outbox.clear();
  });

  it("mergeRemote preserves local coords in syncFromServer", async () => {
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
    await routeEntity.syncFromServer("adv1");
    expect((await db.routes.get("srv1"))?.coords).toEqual([[18.4, -33.5]]);
  });

  it("default applyEvent resyncs on realtime event", async () => {
    const list = vi.fn().mockResolvedValue([]);
    let cb: (e: EntityEvent) => void = () => {};
    const ent = defineEntity<{ id: string }>({
      table: db.points,
      kindUpsert: "upsert_point",
      kindDelete: "delete_point",
      list,
      listByToken: vi.fn().mockResolvedValue([]),
      subscribe: (_id, fn) => {
        cb = fn;
        return () => {};
      },
    });
    renderHook(() => ent.useEntity({ adventureId: "adv1" }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    act(() => cb({ eventType: "INSERT" }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  });
});
