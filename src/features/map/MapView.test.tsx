import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MapView from "./MapView";
import { PositionProvider } from "@/features/tracking/PositionContext";

let handlers: Record<string, (...args: unknown[]) => void>;
let containerProps: { center?: [number, number]; zoom?: number };
const map = {
  setView: vi.fn(),
  flyTo: vi.fn(),
  flyToBounds: vi.fn(),
  getZoom: () => 14,
  getCenter: () => ({ lat: 5, lng: 6 }),
  invalidateSize: vi.fn(),
};

vi.mock("react-leaflet", () => ({
  MapContainer: (props: {
    children: React.ReactNode;
    center?: [number, number];
    zoom?: number;
  }) => {
    containerProps = props;
    return <div className="leaflet-container">{props.children}</div>;
  },
  TileLayer: () => null,
  CircleMarker: () => null,
  Circle: () => null,
  LayersControl: Object.assign(
    ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    {
      BaseLayer: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
      ),
    },
  ),
  useMap: () => map,
  useMapEvents: (h: Record<string, (...args: unknown[]) => void>) => {
    handlers = { ...handlers, ...h };
  },
  Marker: ({ position }: { position: [number, number] }) => (
    <div data-testid="marker" data-pos={String(position)} />
  ),
  Polyline: () => null,
}));

vi.mock("@/features/tracking/useGeolocation", () => ({
  useGeolocation: () => ({
    position: { lat: -33.56, lng: 18.48, accuracy: 10, heading: 0, speed: 0 },
    error: null,
  }),
}));

describe("MapView", () => {
  beforeEach(() => {
    localStorage.clear();
    map.getZoom = () => 14;
    map.getCenter = () => ({ lat: 5, lng: 6 });
  });

  it("renders without crashing", () => {
    const { container } = render(
      <PositionProvider>
        <MapView />
      </PositionProvider>,
    );
    expect(container.querySelector(".leaflet-container")).toBeInTheDocument();
  });

  it("hides Re-center while following", () => {
    render(
      <PositionProvider>
        <MapView />
      </PositionProvider>,
    );
    expect(screen.queryByText("Re-center")).toBeNull();
  });

  it("shows Re-center after manual drag and hides after click", () => {
    render(
      <PositionProvider>
        <MapView />
      </PositionProvider>,
    );
    act(() => handlers.dragstart());
    const btn = screen.getByText("Re-center");
    fireEvent.click(btn);
    expect(screen.queryByText("Re-center")).toBeNull();
  });

  it("stops following on flyTo", () => {
    render(
      <PositionProvider>
        <MapView flyTo={{ lat: 1, lng: 2, t: 1 }} />
      </PositionProvider>,
    );
    expect(screen.getByText("Re-center")).toBeInTheDocument();
  });

  it("applies .mrot when headingUp and invalidates size", () => {
    const { container } = render(
      <PositionProvider>
        <MapView headingUp />
      </PositionProvider>,
    );
    const mrot = container.querySelector(".mrot") as HTMLElement;
    expect(mrot.style.getPropertyValue("--rot")).toMatch(/-?0deg/);
    expect(map.invalidateSize).toHaveBeenCalled();
    const plain = render(
      <PositionProvider>
        <MapView />
      </PositionProvider>,
    );
    expect(plain.container.querySelector(".mrot")).toBeNull();
  });

  it("moving marker tracks map centre", () => {
    const p = {
      id: "p1",
      name: "Obstacle 1",
      kind: "obstacle",
      seq: 1,
      lat: 0,
      lng: 0,
      note: null,
    };
    const fn = vi.fn();
    render(
      <PositionProvider>
        <MapView points={[p]} movingId="p1" onCenterChange={fn} />
      </PositionProvider>,
    );
    expect(screen.getByTestId("marker").dataset.pos).toBe("5,6");
    expect(fn).toHaveBeenCalledWith(5, 6);
  });

  it("uses saved view as initial center", () => {
    localStorage.setItem("lastView", JSON.stringify({ lat: 1, lng: 2, zoom: 9 }));
    render(
      <PositionProvider>
        <MapView />
      </PositionProvider>,
    );
    expect(containerProps.center).toEqual([1, 2]);
    expect(containerProps.zoom).toBe(9);
  });

  it("falls back to default when nothing saved", () => {
    render(
      <PositionProvider>
        <MapView />
      </PositionProvider>,
    );
    expect(containerProps.center).toEqual([-33.56, 18.48]);
    expect(containerProps.zoom).toBe(14);
  });

  it("saves view on moveend", () => {
    map.getCenter = () => ({ lat: 3, lng: 4 });
    map.getZoom = () => 12;
    render(
      <PositionProvider>
        <MapView />
      </PositionProvider>,
    );
    act(() => handlers.moveend());
    expect(JSON.parse(localStorage.getItem("lastView") ?? "")).toEqual({
      lat: 3,
      lng: 4,
      zoom: 12,
    });
  });
});
