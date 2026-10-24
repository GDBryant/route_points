import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RoutesList from "./RoutesList";
import type { RouteRow } from "./api";
import type { Point } from "@/features/points/api";

const route = {
  id: "r1",
  name: "Loop",
  coords: [
    [0, 0],
    [0.01, 0],
  ],
  started_at: "2026-01-01T10:00:00Z",
  ended_at: "2026-01-01T10:10:00Z",
  from_point_id: null,
  to_point_id: null,
} as unknown as RouteRow;

describe("RoutesList", () => {
  it("shows Delete only with onDelete and confirms", () => {
    const { rerender } = render(
      <RoutesList routes={[route]} points={[]} onTap={vi.fn()} />,
    );
    expect(screen.queryByText("Delete")).toBeNull();

    const onDelete = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    rerender(
      <RoutesList
        routes={[route]}
        points={[]}
        onTap={vi.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByText("Delete"));
    expect(onDelete).not.toHaveBeenCalled();

    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    fireEvent.click(screen.getByText("Delete"));
    expect(onDelete).toHaveBeenCalledWith(route);
  });

  it("shows distance, time and speed with unit toggle", () => {
    localStorage.clear();
    render(<RoutesList routes={[route]} points={[]} onTap={vi.fn()} />);
    expect(screen.getByText(/1\.11 km · 10:00 · 6\.7 km\/h/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Toggle speed unit" }));
    expect(screen.getByText(/1\.11 km · 10:00 · 9:00 \/km/)).toBeTruthy();
    expect(localStorage.getItem("speedUnit")).toBe("pace");
  });

  it("includes endpoints in distance but not speed", () => {
    localStorage.clear();
    const linked = {
      ...route,
      from_point_id: "a",
      to_point_id: "b",
    } as unknown as RouteRow;
    const points = [
      { id: "a", name: "A", lat: 0, lng: -0.01 },
      { id: "b", name: "B", lat: 0, lng: 0.02 },
    ] as unknown as Point[];
    render(<RoutesList routes={[linked]} points={points} onTap={vi.fn()} />);
    expect(screen.getByText(/3\.34 km · 10:00 · 6\.7 km\/h/)).toBeTruthy();
  });
});
