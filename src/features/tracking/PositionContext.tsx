import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useGeolocation, type GeoPosition } from "./useGeolocation";
import { GeoStatusContext, PositionContext } from "./position";

export function PositionProvider({ children }: { children: ReactNode }) {
  const { position, error, state, request } = useGeolocation();
  const posRef = useRef<GeoPosition | null>(null);
  useEffect(() => {
    posRef.current = position;
  }, [position]);
  const status = useMemo(
    () => ({ state, error, request, posRef }),
    [state, error, request],
  );
  return (
    <GeoStatusContext.Provider value={status}>
      <PositionContext.Provider value={position}>
        {children}
      </PositionContext.Provider>
    </GeoStatusContext.Provider>
  );
}
