import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Circle,
  CircleMarker,
  LayersControl,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useGeoStatus, usePosition } from "@/features/tracking/position";
import PointMarker from "@/features/points/PointMarker";
import type { Point } from "@/features/points/api";
import RoutePolyline from "@/features/routes/RoutePolyline";
import type { RouteRow } from "@/features/routes/api";
import MemberMarker from "@/features/live/MemberMarker";
import type { LivePos } from "@/features/live/usePositions";
import { Polyline } from "react-leaflet";

export type FlyTarget = {
  lat: number;
  lng: number;
  t: number;
  bounds?: [[number, number], [number, number]];
};

const DEFAULT_CENTER: [number, number] = [-33.56, 18.48];
const VIEW_KEY = "lastView";

function loadView(): { center: [number, number]; zoom: number } {
  const raw = localStorage.getItem(VIEW_KEY);
  if (raw) {
    try {
      const v = JSON.parse(raw);
      if (
        Number.isFinite(v.lat) &&
        Number.isFinite(v.lng) &&
        Number.isFinite(v.zoom)
      )
        return { center: [v.lat, v.lng], zoom: v.zoom };
    } catch {
      return { center: DEFAULT_CENTER, zoom: 14 };
    }
  }
  return { center: DEFAULT_CENTER, zoom: 14 };
}

function SaveView() {
  const map = useMap();
  useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      localStorage.setItem(
        VIEW_KEY,
        JSON.stringify({ lat: c.lat, lng: c.lng, zoom: map.getZoom() }),
      );
    },
  });
  return null;
}
const ESRI_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

function CurrentPositionMarker() {
  const position = usePosition();
  if (!position) return null;
  return (
    <>
      <CircleMarker
        center={[position.lat, position.lng]}
        radius={8}
        pathOptions={{ color: "#fff", fillColor: "#1e88e5", fillOpacity: 1 }}
      />
      {position.accuracy != null && (
        <Circle
          center={[position.lat, position.lng]}
          radius={position.accuracy}
          pathOptions={{ color: "#1e88e5", weight: 1, fillOpacity: 0.1 }}
        />
      )}
    </>
  );
}

function FollowMe({ following }: { following: boolean }) {
  const position = usePosition();
  const map = useMap();
  useEffect(() => {
    if (following && position) map.setView([position.lat, position.lng]);
  }, [following, position, map]);
  return null;
}

function ResizeOnRotate({ active }: { active: boolean }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [active, map]);
  return null;
}

function MapEvents({
  onLongPress,
  onUserMove,
}: {
  onLongPress?: (lat: number, lng: number) => void;
  onUserMove: () => void;
}) {
  useMapEvents({
    contextmenu: (e) => onLongPress?.(e.latlng.lat, e.latlng.lng),
    dragstart: onUserMove,
  });
  return null;
}

function CenterTracker({
  active,
  onCenter,
}: {
  active: boolean;
  onCenter: (c: [number, number]) => void;
}) {
  const map = useMap();
  useMapEvents({
    move: () => {
      if (active) {
        const c = map.getCenter();
        onCenter([c.lat, c.lng]);
      }
    },
  });
  useEffect(() => {
    if (active) {
      const c = map.getCenter();
      onCenter([c.lat, c.lng]);
    }
  }, [active, map, onCenter]);
  return null;
}

function FlyTo({
  target,
  onFly,
}: {
  target: FlyTarget | null;
  onFly: () => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    onFly();
    if (target.bounds) map.flyToBounds(target.bounds, { padding: [40, 40] });
    else map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 15));
  }, [target, map, onFly]);
  return null;
}

function Rotated({
  headingUp,
  children,
}: {
  headingUp: boolean;
  children: ReactNode;
}) {
  const position = usePosition();
  const rotation =
    headingUp && position?.heading != null ? -position.heading : 0;
  return (
    <div
      className={headingUp ? "mrot" : undefined}
      style={{ ["--rot" as string]: `${rotation}deg` }}
    >
      {children}
    </div>
  );
}

export default function MapView({
  points = [],
  routes = [],
  recordingCoords = [],
  others = [],
  headingUp = false,
  onMarkerTap,
  onRouteTap,
  onLongPress,
  movingId,
  onCenterChange,
  flyTo,
}: {
  points?: Point[];
  routes?: RouteRow[];
  recordingCoords?: { lat: number; lng: number }[];
  others?: LivePos[];
  headingUp?: boolean;
  onMarkerTap?: (p: Point) => void;
  onRouteTap?: (r: RouteRow) => void;
  onLongPress?: (lat: number, lng: number) => void;
  movingId?: string | null;
  onCenterChange?: (lat: number, lng: number) => void;
  flyTo?: FlyTarget | null;
}) {
  const { error } = useGeoStatus();
  const [initial] = useState(loadView);
  const [following, setFollowing] = useState(true);
  const [center, setCenter] = useState<[number, number] | null>(null);
  const stopFollowing = useCallback(() => setFollowing(false), []);
  const byId = useMemo(() => new Map(points.map((p) => [p.id, p])), [points]);

  useEffect(() => {
    if (movingId && center) onCenterChange?.(center[0], center[1]);
  }, [movingId, center, onCenterChange]);

  return (
    <Rotated headingUp={headingUp}>
      <MapContainer center={initial.center} zoom={initial.zoom}>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Esri World Imagery">
            <TileLayer url={ESRI_URL} attribution="Tiles © Esri" />
          </LayersControl.BaseLayer>
        </LayersControl>
        <CurrentPositionMarker />
        {points.map((p) => (
          <PointMarker
            key={p.id}
            point={p}
            onTap={onMarkerTap}
            moving={p.id === movingId}
            position={p.id === movingId && center ? center : undefined}
          />
        ))}
        {routes.map((r) => (
          <RoutePolyline
            key={r.id}
            route={r}
            from={byId.get(r.from_point_id ?? "")}
            to={byId.get(r.to_point_id ?? "")}
            onTap={onRouteTap}
          />
        ))}
        {others.map((o) => (
          <MemberMarker key={o.user_id} pos={o} />
        ))}
        {recordingCoords.length > 1 && (
          <Polyline
            positions={recordingCoords.map(
              (c) => [c.lat, c.lng] as [number, number],
            )}
            pathOptions={{ color: "#7b3fb3", weight: 3, dashArray: "6 8" }}
          />
        )}
        <FollowMe following={following} />
        <ResizeOnRotate active={headingUp} />
        <MapEvents onLongPress={onLongPress} onUserMove={stopFollowing} />
        <CenterTracker active={!!movingId} onCenter={setCenter} />
        <FlyTo target={flyTo ?? null} onFly={stopFollowing} />
        <SaveView />
      </MapContainer>

      {!following && (
        <button className="follow-btn" onClick={() => setFollowing(true)}>
          Re-center
        </button>
      )}
      {error && <div className="geo-error">{error}</div>}
    </Rotated>
  );
}
