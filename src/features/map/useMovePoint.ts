import { useCallback, useState } from "react";
import { pointInput, savePointLocal } from "@/features/points/repo";
import type { Point } from "@/features/points/api";
import type { FlyTarget } from "./MapView";

export function useMovePoint({
  adventureId,
  setFlyTo,
  refresh,
}: {
  adventureId: string;
  setFlyTo: (t: FlyTarget) => void;
  refresh: () => void;
}) {
  const [moving, setMoving] = useState<Point | null>(null);
  const [moveTo, setMoveTo] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  const startMove = (p: Point) => {
    setMoving(p);
    setMoveTo({ lat: p.lat, lng: p.lng });
    setFlyTo({ lat: p.lat, lng: p.lng, t: Date.now() });
  };

  const onCenterChange = useCallback(
    (lat: number, lng: number) => setMoveTo({ lat, lng }),
    [],
  );

  const save = async () => {
    if (!moving || !moveTo) return;
    await savePointLocal(
      adventureId,
      pointInput(moving, { lat: moveTo.lat, lng: moveTo.lng }),
    );
    setMoving(null);
    setMoveTo(null);
    refresh();
  };

  const cancel = () => {
    setMoving(null);
    setMoveTo(null);
  };

  return { moving, startMove, onCenterChange, save, cancel };
}
