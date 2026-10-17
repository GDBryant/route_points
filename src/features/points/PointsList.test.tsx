import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PointsList from "./PointsList";
import type { Point } from "./api";

const point = { id: "p1", name: "Gate", kind: "entrance", seq: 1 } as Point;

describe("PointsList", () => {
  it("shows Delete for editors with onDelete and confirms", () => {
    const onDelete = vi.fn();
    const { rerender } = render(
      <PointsList points={[point]} onTap={vi.fn()} onDelete={onDelete} />,
    );
    expect(screen.queryByText("Delete")).toBeNull();

    rerender(
      <PointsList
        points={[point]}
        isEditor
        onTap={vi.fn()}
        onDelete={onDelete}
      />,
    );
    vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    fireEvent.click(screen.getByText("Delete"));
    expect(onDelete).not.toHaveBeenCalled();

    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    fireEvent.click(screen.getByText("Delete"));
    expect(onDelete).toHaveBeenCalledWith(point);
  });
});
