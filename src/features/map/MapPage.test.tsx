import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MapPage from "./MapPage";
import { savePointLocal } from "@/features/points/repo";
import { saveRouteLocal } from "@/features/routes/repo";
import { listMembers, listKnownUsers } from "@/features/adventures/api";
import { nearbyOsmName } from "@/features/points/osmName";
import type { Point } from "@/features/points/api";
import type { GeoPosition } from "@/features/tracking/useGeolocation";

const ctl = vi.hoisted(() => ({
  position: null as GeoPosition | null,
  user: null as { id: string; email: string } | null,
  role: "owner" as string | null,
  points: [] as Point[],
}));

const POS: GeoPosition = {
  lat: 0,
  lng: 0,
  accuracy: 5,
  heading: null,
  speed: null,
};

const mkPoint = (o: Partial<Point> = {}): Point => ({
  id: "p1",
  client_id: "p1",
  name: "Obstacle 1",
  kind: "obstacle",
  seq: 1,
  lat: 10,
  lng: 10,
  note: null,
  ...o,
});

vi.mock("./MapView", async () => {
  const { useEffect } = await import("react");
  return {
    default: function MapViewStub({
      points = [],
      routes = [],
      onMarkerTap,
      onLongPress,
      movingId,
      onCenterChange,
    }: {
      points?: Point[];
      routes?: unknown[];
      onMarkerTap?: (p: Point) => void;
      onLongPress?: (lat: number, lng: number) => void;
      movingId?: string | null;
      onCenterChange?: (lat: number, lng: number) => void;
    }) {
      useEffect(() => {
        if (movingId) onCenterChange?.(5, 6);
      }, [movingId, onCenterChange]);
      return (
        <div data-testid="map">
          <button data-testid="longpress" onClick={() => onLongPress?.(1, 2)} />
          {points.map((pt) => (
            <button
              key={pt.id}
              data-testid={`marker-${pt.id}`}
              onClick={() => onMarkerTap?.(pt)}
            />
          ))}
          <span data-testid="routes-count">{routes.length}</span>
        </div>
      );
    },
  };
});

vi.mock("@/features/tracking/useGeolocation", () => ({
  useGeolocation: () => ({
    position: ctl.position,
    error: null,
    state: "granted",
    request: vi.fn(),
  }),
}));

vi.mock("@/features/auth/useAuth", () => ({
  useAuth: () => ({
    user: ctl.user,
    profile: ctl.user ? { display_name: "Me", colour: "#000" } : null,
    loading: false,
  }),
}));

vi.mock("@/features/adventures/api", async (importOriginal) => {
  const mod =
    await importOriginal<typeof import("@/features/adventures/api")>();
  return {
    ...mod,
    getAdventure: vi.fn().mockResolvedValue({
      id: "adv1",
      name: "Dunes",
      snap_radius_m: 20,
      share_token: "tok",
    }),
    myRole: vi.fn(() => Promise.resolve(ctl.role)),
    touchAdventure: vi.fn().mockResolvedValue(undefined),
    listKnownUsers: vi.fn().mockResolvedValue([
      {
        user_id: "u3",
        display_name: "Carol",
        colour: "#0f0",
        role: "viewer",
      },
    ]),
    addMember: vi.fn().mockResolvedValue(undefined),
    listMembers: vi.fn().mockResolvedValue([
      {
        user_id: "u2",
        display_name: "Bob",
        colour: "#f00",
        role: "editor",
      },
    ]),
  };
});

vi.mock("@/features/points/usePoints", () => ({
  usePoints: () => ({
    points: ctl.points,
    error: null,
  }),
}));

vi.mock("@/features/routes/useRoutes", () => ({
  useRoutes: () => ({ routes: [], error: null }),
}));

vi.mock("@/features/points/repo", () => ({
  pointInput: (
    p: Point,
    o: Partial<Point & { note: string; seq: number | null }> = {},
  ) => ({
    name: p.name,
    kind: p.kind,
    note: p.note ?? "",
    seq: p.seq,
    accuracy_m: null,
    lat: p.lat,
    lng: p.lng,
    client_id: p.client_id,
    ...o,
  }),
  swapSeq: vi.fn(
    async (adventureId: string, points: Point[], p: Point, dir: -1 | 1) => {
      const sorted = [...points].sort(
        (a, b) =>
          (a.seq ?? 9999) - (b.seq ?? 9999) || a.name.localeCompare(b.name),
      );
      const i = sorted.findIndex((x) => x.id === p.id);
      const other = sorted[i + dir];
      if (!other) return;
      const input = (x: Point, seq: number | null) => ({
        name: x.name,
        kind: x.kind,
        note: x.note ?? "",
        seq,
        accuracy_m: null,
        lat: x.lat,
        lng: x.lng,
        client_id: x.client_id,
      });
      await savePointLocal(adventureId, input(p, other.seq ?? i + 1 + dir));
      await savePointLocal(adventureId, input(other, p.seq ?? i + 1));
    },
  ),
  savePointLocal: vi.fn(
    async (_adv: string, input: { client_id?: string; note?: string }) => {
      const p = {
        id: input.client_id ?? "newid",
        client_id: input.client_id ?? "newid",
        ...input,
        note: input.note || null,
      } as Point;
      ctl.points = [...ctl.points.filter((x) => x.id !== p.id), p];
      return p;
    },
  ),
  removePoint: vi.fn(),
}));

vi.mock("@/features/routes/repo", () => ({
  saveRouteLocal: vi.fn(async (i: unknown) => i),
  removeRoute: vi.fn(),
  queueWaypoints: vi.fn(),
  updateRouteCoordsLocal: vi.fn(),
}));

vi.mock("@/features/sync/useSync", () => ({
  useSync: () => ({
    online: true,
    pending: 0,
    dead: 0,
    syncing: false,
    syncNow: vi.fn(),
  }),
}));

vi.mock("@/features/live/usePositions", () => ({
  usePositions: () => ({ others: new Map(), online: new Set(["u2"]) }),
}));

vi.mock("@/features/points/osmName", () => ({
  nearbyOsmName: vi.fn().mockResolvedValue("Big Dune"),
}));

function renderPage(entry = "/a/adv1") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/a/:id" element={<MapPage />} />
        <Route path="/adventures" element={<div>ADV</div>} />
        <Route path="/" element={<div>HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function renderOwner(opts: { position?: GeoPosition | null } = {}) {
  ctl.user = { id: "u1", email: "me@x.com" };
  ctl.position = opts.position === undefined ? POS : opts.position;
  renderPage();
  await waitFor(() => expect(listMembers).not.toHaveBeenCalled());
  await screen.findByText("⚙");
}

async function renderMember(role: string) {
  ctl.role = role;
  ctl.user = { id: "u1", email: "me@x.com" };
  ctl.position = POS;
  renderPage();
  await waitFor(() => expect(listMembers).not.toHaveBeenCalled());
  await screen.findByText("Points");
}

describe("MapPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    ctl.user = { id: "u1", email: "me@x.com" };
    ctl.position = POS;
    ctl.role = "owner";
    ctl.points = [mkPoint()];
  });

  it("guest: banner only, no editor UI or sync badge", () => {
    ctl.user = null;
    renderPage("/a/adv1?token=tok");
    expect(screen.getByText("Viewing as guest")).toBeInTheDocument();
    expect(screen.queryByText("+ Point")).toBeNull();
    expect(screen.queryByText("Record")).toBeNull();
    expect(screen.queryByText("⚙")).toBeNull();
    expect(document.querySelector(".sync-badge")).toBeNull();
  });

  it("+ Point disabled without GPS, saves at position with fix", async () => {
    await renderOwner({ position: null });
    const fab = await screen.findByText("+ Point");
    expect(fab).toBeDisabled();
    expect(fab).toHaveAttribute("title", "Waiting for GPS");
  });

  it("+ Point opens AddPointSheet; save persists at position", async () => {
    await renderOwner();
    fireEvent.click(await screen.findByText("+ Point"));
    const sheet = await screen.findByRole("dialog");
    fireEvent.change(within(sheet).getByPlaceholderText("Name"), {
      target: { value: "My point" },
    });
    fireEvent.click(within(sheet).getByText("Save"));
    await waitFor(() =>
      expect(savePointLocal).toHaveBeenCalledWith(
        "adv1",
        expect.objectContaining({ lat: 0, lng: 0, name: "My point" }),
      ),
    );
  });

  it("long-press opens AddPointSheet at pressed coords", async () => {
    await renderOwner();
    fireEvent.click(screen.getByTestId("longpress"));
    const sheet = await screen.findByRole("dialog");
    fireEvent.click(within(sheet).getByText("Save"));
    await waitFor(() =>
      expect(savePointLocal).toHaveBeenCalledWith(
        "adv1",
        expect.objectContaining({ lat: 1, lng: 2 }),
      ),
    );
  });

  it("record start away from points saves route and prompts for start point", async () => {
    await renderOwner();
    fireEvent.click(await screen.findByText("Record"));
    fireEvent.click(await screen.findByText("Start route"));
    await waitFor(() =>
      expect(saveRouteLocal).toHaveBeenCalledWith(
        expect.objectContaining({ mode: "auto", adventure_id: "adv1" }),
      ),
    );
    const sheet = (await screen.findByText("Add point")).closest(
      "[role=dialog]",
    ) as HTMLElement;
    expect(
      (within(sheet).getByLabelText("Kind") as HTMLSelectElement).value,
    ).toBe("start");
    fireEvent.click(within(sheet).getByText("Save"));
    await waitFor(() =>
      expect(saveRouteLocal).toHaveBeenCalledWith(
        expect.objectContaining({ from_point_id: "newid" }),
      ),
    );
    expect(saveRouteLocal).toHaveBeenCalledTimes(2);
  });

  it("record stop away from points prompts new end point then finishes route", async () => {
    await renderOwner();
    fireEvent.click(await screen.findByText("Record"));
    fireEvent.click(await screen.findByText("Start route"));
    const startSheet = (await screen.findByText("Add point")).closest(
      "[role=dialog]",
    ) as HTMLElement;
    fireEvent.click(within(startSheet).getByText("Cancel"));
    fireEvent.click(await screen.findByText("Stop"));
    await waitFor(() => expect(nearbyOsmName).toHaveBeenCalled());
    const endSheet = (await screen.findByText("Add point")).closest(
      "[role=dialog]",
    ) as HTMLElement;
    expect(within(endSheet).getByDisplayValue("Big Dune")).toBeInTheDocument();
    fireEvent.click(within(endSheet).getByText("Save"));
    const finish = await screen.findByText("Finish route");
    const finishSheet = finish.closest("[role=dialog]")!;
    fireEvent.click(within(finishSheet as HTMLElement).getByText("Save route"));
    await waitFor(() =>
      expect(saveRouteLocal).toHaveBeenCalledWith(
        expect.objectContaining({
          to_point_id: "newid",
          ended_at: expect.any(String),
        }),
      ),
    );
    await waitFor(() => expect(screen.queryByText("Finish route")).toBeNull());
    expect(screen.queryByText("Stop")).toBeNull();
  });

  it("record stop near existing point goes straight to FinishRouteSheet", async () => {
    ctl.points = [mkPoint({ lat: 0, lng: 0 })];
    await renderOwner();
    fireEvent.click(await screen.findByText("Record"));
    fireEvent.click(await screen.findByText("Start route"));
    await screen.findByText("Stop");
    fireEvent.click(screen.getByText("Stop"));
    await screen.findByText("Finish route");
    expect(nearbyOsmName).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Kind")).toBeNull();
  });

  it("tabs: points list, members with online dot, exit navigates", async () => {
    await renderOwner();
    fireEvent.click(screen.getByText("Points"));
    expect(await screen.findByText("Obstacle 1")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Members"));
    await waitFor(() => expect(listMembers).toHaveBeenCalledWith("adv1"));
    expect(await screen.findByText("Bob")).toBeInTheDocument();
    expect(document.querySelector(".dot-online")).not.toBeNull();
    fireEvent.click(screen.getByLabelText("Exit adventure"));
    expect(await screen.findByText("ADV")).toBeInTheDocument();
  });

  it("move point: banner then save at map centre", async () => {
    await renderOwner();
    fireEvent.click(screen.getByTestId("marker-p1"));
    fireEvent.click(await screen.findByText("Move"));
    const banner = await screen.findByText(/Pan map to position/);
    expect(banner.textContent).toContain("Obstacle 1");
    fireEvent.click(
      within(banner.parentElement as HTMLElement).getByText("Save"),
    );
    await waitFor(() =>
      expect(savePointLocal).toHaveBeenCalledWith(
        "adv1",
        expect.objectContaining({ lat: 5, lng: 6, client_id: "p1" }),
      ),
    );
  });

  it("reorder: move-down swaps seqs", async () => {
    ctl.points = [
      mkPoint(),
      mkPoint({ id: "p2", client_id: "p2", name: "Obstacle 2", seq: 2 }),
    ];
    await renderOwner();
    fireEvent.click(screen.getByText("Points"));
    const item = (await screen.findByText("Obstacle 1")).closest("li")!;
    fireEvent.click(within(item as HTMLElement).getByLabelText("move down"));
    await waitFor(() => expect(savePointLocal).toHaveBeenCalledTimes(2));
    expect(savePointLocal).toHaveBeenNthCalledWith(
      1,
      "adv1",
      expect.objectContaining({ client_id: "p1", seq: 2 }),
    );
    expect(savePointLocal).toHaveBeenNthCalledWith(
      2,
      "adv1",
      expect.objectContaining({ client_id: "p2", seq: 1 }),
    );
  });

  it("editor: editor FABs, no Add people, settings inputs disabled", async () => {
    await renderMember("editor");
    expect(await screen.findByText("+ Point")).toBeInTheDocument();
    expect(screen.getByText("Record")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Members"));
    expect(await screen.findByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Add people")).toBeNull();
    expect(listKnownUsers).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Map"));
    fireEvent.click(await screen.findByText("⚙"));
    expect(
      await screen.findByLabelText(/Name/, { selector: "input" }),
    ).toBeDisabled();
  });

  it("owner: Add people lists known users", async () => {
    await renderOwner();
    fireEvent.click(screen.getByText("Members"));
    expect(await screen.findByText("Add people")).toBeInTheDocument();
    expect(screen.getByText("Carol")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Map"));
    fireEvent.click(await screen.findByText("⚙"));
    expect(
      await screen.findByLabelText(/Name/, { selector: "input" }),
    ).toBeEnabled();
  });

  it("viewer: no editor FABs, no long-press, no delete in lists", async () => {
    await renderMember("viewer");
    expect(screen.queryByText("+ Point")).toBeNull();
    expect(screen.queryByText("Record")).toBeNull();
    fireEvent.click(screen.getByTestId("longpress"));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByText("Points"));
    expect(await screen.findByText("Obstacle 1")).toBeInTheDocument();
    expect(screen.queryByText("Delete")).toBeNull();
  });

  it("gear opens settings; Share adventure opens share sheet", async () => {
    await renderOwner();
    fireEvent.click(await screen.findByText("⚙"));
    expect(await screen.findByText("Adventure settings")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Share adventure"));
    expect(await screen.findByText("Share Dunes")).toBeInTheDocument();
  });
});
