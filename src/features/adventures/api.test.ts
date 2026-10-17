import { describe, expect, it, vi } from "vitest";
import { deleteAdventure, listAdventures, shareUrl } from "./api";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    transaction: vi.fn((_m: string, ...args: unknown[]) =>
      (args.at(-1) as () => Promise<void>)(),
    ),
    adventures: { delete: vi.fn() },
    points: { where: () => ({ equals: () => ({ delete: vi.fn() }) }) },
    routes: { where: () => ({ equals: () => ({ delete: vi.fn() }) }) },
    tiles_meta: { filter: () => ({ delete: vi.fn() }) },
  },
}));

import { supabase } from "@/lib/supabase";

const rows = [
  {
    role: "owner",
    last_opened_at: "2026-10-07T10:00:00Z",
    adventures: {
      id: "a1",
      name: "Trip 1",
      description: "",
      share_token: "t1",
      snap_radius_m: 20,
    },
  },
  {
    role: "editor",
    last_opened_at: "2026-10-06T10:00:00Z",
    adventures: {
      id: "a2",
      name: "Trip 2",
      description: "",
      share_token: "t2",
      snap_radius_m: 20,
    },
  },
];

describe("listAdventures", () => {
  it("maps membership rows ordered by last_opened desc", async () => {
    const order = vi.fn().mockResolvedValue({ data: rows, error: null });
    const select = vi.fn().mockReturnValue({ order });
    vi.mocked(supabase.from).mockReturnValue({ select } as never);

    const list = await listAdventures();
    expect(supabase.from).toHaveBeenCalledWith("adventure_members");
    expect(order).toHaveBeenCalledWith("last_opened_at", {
      ascending: false,
    });
    expect(list.map((a) => a.id)).toEqual(["a1", "a2"]);
    expect(list[0]).toMatchObject({ name: "Trip 1", role: "owner" });
  });
});

describe("deleteAdventure", () => {
  it("deletes from adventures by id", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn().mockReturnValue({ eq });
    vi.mocked(supabase.from).mockReturnValue({ delete: del } as never);

    await deleteAdventure("a1");
    expect(supabase.from).toHaveBeenCalledWith("adventures");
    expect(eq).toHaveBeenCalledWith("id", "a1");
  });

  it("throws on error", async () => {
    const eq = vi.fn().mockResolvedValue({ error: new Error("denied") });
    const del = vi.fn().mockReturnValue({ eq });
    vi.mocked(supabase.from).mockReturnValue({ delete: del } as never);

    await expect(deleteAdventure("a1")).rejects.toThrow("denied");
  });
});

describe("shareUrl", () => {
  it("builds join URL from origin", () => {
    expect(shareUrl("abc")).toBe(`${location.origin}/join/abc`);
  });
});
