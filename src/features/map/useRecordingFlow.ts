import { useMemo, useState } from "react";
import type { GeoPosition } from "@/features/tracking/useGeolocation";
import type { Point } from "@/features/points/api";
import { savePointLocal } from "@/features/points/repo";
import type { PointFormInput } from "@/features/points/AddPointSheet";
import { nearbyOsmName } from "@/features/points/osmName";
import { saveRouteLocal } from "@/features/routes/repo";
import { useRecorder, type PendingRoute } from "@/features/routes/useRecorder";
import { nearestPoint, START_PROMPT_M } from "@/features/routes/snap";
import type { FinishInput } from "@/features/routes/FinishRouteSheet";

export interface AddState {
  lat: number;
  lng: number;
  accuracy: number | null;
  initial?: Point;
  kind?: string;
  role?: "start" | "turn" | "end";
  name?: string;
}

export function useRecordingFlow({
  adventureId,
  position,
  points,
  snapRadius,
  refreshPoints,
  refreshRoutes,
}: {
  adventureId: string;
  position: GeoPosition | null;
  points: Point[];
  snapRadius: number;
  refreshPoints: () => void;
  refreshRoutes: () => void;
}) {
  const recorder = useRecorder(position, points, snapRadius);
  const [recording, setRecording] = useState(false);
  const [adding, setAdding] = useState<AddState | null>(null);
  const [endRouteAt, setEndRouteAt] = useState(false);
  const [newEnd, setNewEnd] = useState(false);
  const [finishing, setFinishing] = useState<{
    route: PendingRoute;
    lastPos: GeoPosition | null;
    forceToId?: string;
  } | null>(null);

  const openAdd = (
    lat: number,
    lng: number,
    accuracy: number | null,
    extra?: Partial<AddState>,
  ) => setAdding({ lat, lng, accuracy, ...extra });

  const closeAdd = () => {
    setAdding(null);
    setNewEnd(false);
  };

  const openRecord = () => setRecording(true);
  const cancelRecord = () => setRecording(false);

  const savePoint = async (input: PointFormInput) => {
    if (!adding) return;
    const saved = await savePointLocal(adventureId, {
      ...input,
      lat: adding.lat,
      lng: adding.lng,
    });
    const wasEnd = endRouteAt;
    setAdding(null);
    setEndRouteAt(false);
    refreshPoints();
    if (adding.role === "start" && saved?.id) {
      recorder.setFromPoint(saved.id);
      const r = recorder.route;
      if (r)
        await saveRouteLocal({
          adventure_id: adventureId,
          client_id: r.client_id,
          mode: r.mode,
          interval_s: r.interval_s,
          started_at: r.started_at,
          from_point_id: saved.id,
        }).catch(() => {});
    } else if (newEnd && finishing && saved?.id) {
      setNewEnd(false);
      setFinishing({ ...finishing, forceToId: saved.id });
    } else if (wasEnd && saved?.id) {
      const res = await recorder.stop();
      if (res.route)
        setFinishing({ ...res, route: res.route, forceToId: saved.id });
    }
  };

  const onStop = async () => {
    const res = await recorder.stop();
    if (
      res.route &&
      res.lastPos &&
      !nearestPoint(res.lastPos, points, snapRadius)
    ) {
      const name = await nearbyOsmName(res.lastPos.lat, res.lastPos.lng);
      setFinishing({ ...res, route: res.route });
      setNewEnd(true);
      setAdding({
        lat: res.lastPos.lat,
        lng: res.lastPos.lng,
        accuracy: res.lastPos.accuracy,
        kind: "end",
        role: "end",
        name: name ?? undefined,
      });
    } else if (res.route) setFinishing({ ...res, route: res.route });
    else recorder.finishDone();
  };

  const saveRoute = async (input: FinishInput) => {
    if (!finishing) return;
    await saveRouteLocal({
      adventure_id: adventureId,
      client_id: finishing.route.client_id,
      name: input.name,
      from_point_id: input.from_point_id,
      to_point_id: input.to_point_id,
      direction: input.direction,
      mode: finishing.route.mode,
      interval_s: finishing.route.interval_s,
      started_at: finishing.route.started_at,
      ended_at: new Date().toISOString(),
      coords: recorder.pendingCoords,
    });
    setFinishing(null);
    setRecording(false);
    recorder.finishDone();
    refreshRoutes();
  };

  const onStart = async (mode: "manual" | "auto", s: number | null) => {
    const r = recorder.start(mode, s);
    if (r)
      await saveRouteLocal({
        adventure_id: adventureId,
        client_id: r.client_id,
        mode: r.mode,
        interval_s: r.interval_s,
        started_at: r.started_at,
        from_point_id: r.from_point_id,
      }).catch(() => {});
    if (position && !nearestPoint(position, points, START_PROMPT_M))
      openAdd(position.lat, position.lng, position.accuracy, {
        kind: "start",
        role: "start",
      });
  };

  const onDrop = () => {
    if (recorder.dropWaypoint() && position)
      openAdd(position.lat, position.lng, position.accuracy, {
        kind: "turn",
        role: "turn",
      });
  };

  const newEndFromFinish = () => {
    if (!finishing?.lastPos) return;
    setNewEnd(true);
    setAdding({
      lat: finishing.lastPos.lat,
      lng: finishing.lastPos.lng,
      accuracy: finishing.lastPos.accuracy,
    });
  };

  const recordingCoords = useMemo(
    () => recorder.pendingCoords.map(([lng, lat]) => ({ lat, lng })),
    [recorder.pendingCoords],
  );

  return {
    recorder,
    recording,
    adding,
    finishing,
    endRouteAt,
    setEndRouteAt,
    openAdd,
    closeAdd,
    savePoint,
    openRecord,
    cancelRecord,
    onStart,
    onDrop,
    onStop,
    saveRoute,
    newEndFromFinish,
    recordingCoords,
  };
}
