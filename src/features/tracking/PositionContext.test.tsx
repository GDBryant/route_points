import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PositionProvider } from "./PositionContext";
import { usePosition, usePositionRef } from "./position";
import type { GeoPosition, GeoState } from "./useGeolocation";

const geo = {
  position: null as GeoPosition | null,
  error: null as string | null,
  state: "watching" as GeoState,
  request: vi.fn(),
};

vi.mock("./useGeolocation", () => ({ useGeolocation: () => geo }));

const pos1: GeoPosition = {
  lat: 1,
  lng: 2,
  accuracy: 5,
  heading: 0,
  speed: 0,
};

describe("PositionContext", () => {
  it("tick re-renders consumers only; posRef stays fresh", () => {
    let parentRenders = 0;
    let childRenders = 0;
    let refSeen: GeoPosition | null = null;
    function Parent() {
      parentRenders++;
      return null;
    }
    function Child() {
      childRenders++;
      return <span data-testid="p">{usePosition()?.lat ?? "none"}</span>;
    }
    function RefProbe() {
      const r = usePositionRef();
      return (
        <button data-testid="refbtn" onClick={() => (refSeen = r.current)} />
      );
    }
    const kids = (
      <>
        <Parent />
        <Child />
        <RefProbe />
      </>
    );
    const { rerender } = render(<PositionProvider>{kids}</PositionProvider>);
    expect(parentRenders).toBe(1);
    expect(childRenders).toBe(1);
    expect(screen.getByTestId("p").textContent).toBe("none");

    geo.position = pos1;
    rerender(<PositionProvider>{kids}</PositionProvider>);
    expect(childRenders).toBe(2);
    expect(parentRenders).toBe(1);
    expect(screen.getByTestId("p").textContent).toBe("1");
    fireEvent.click(screen.getByTestId("refbtn"));
    expect(refSeen).toEqual(pos1);
  });
});
