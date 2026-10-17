import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RoutesList from "./RoutesList";
import type { RouteRow } from "./api";

const route = {
  id: "r1",
  name: "Loop",
  coords: [[0, 0]],
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
});
