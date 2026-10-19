import { memo, useMemo } from "react";
import { Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import type { RouteRow } from "./api";
import type { Point } from "@/features/points/api";
import { arrowPositions, withEndpoints } from "./routeUtils";

const COLOUR = "#7b3fb3";

export default memo(function RoutePolyline({
  route,
  from,
  to,
  onTap,
}: {
  route: RouteRow;
  from?: Point | null;
  to?: Point | null;
  onTap?: (r: RouteRow) => void;
}) {
  const coords = useMemo(
    () => withEndpoints(route.coords, from, to),
    [route.coords, from, to],
  );
  const positions = useMemo(
    () => coords.map(([lng, lat]) => [lat, lng] as [number, number]),
    [coords],
  );
  const arrows = useMemo(
    () => (route.direction !== "both" ? arrowPositions(coords) : []),
    [route.direction, coords],
  );
  const arrowIcons = useMemo(
    () =>
      arrows.map((a) =>
        L.divIcon({
          className: "route-arrow",
          html: `<span style="transform:rotate(calc(${route.direction === "reverse" ? a.bearing + 180 : a.bearing}deg - var(--rot, 0deg)))">▲</span>`,
          iconSize: [14, 14],
        }),
      ),
    [arrows, route.direction],
  );

  return (
    <>
      <Polyline
        positions={positions}
        pathOptions={{ color: COLOUR, weight: 3 }}
        eventHandlers={{ click: () => onTap?.(route) }}
      />
      {arrows.map((a, i) => (
        <Marker
          key={i}
          position={a.pos}
          icon={arrowIcons[i]}
          interactive={false}
        />
      ))}
    </>
  );
});
