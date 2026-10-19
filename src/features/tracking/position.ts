import { createContext, useContext, type RefObject } from "react";
import type { GeoPosition, GeoState } from "./useGeolocation";

export const PositionContext = createContext<GeoPosition | null>(null);

export interface GeoStatus {
  state: GeoState;
  error: string | null;
  request: () => void;
  posRef: RefObject<GeoPosition | null>;
}

export const GeoStatusContext = createContext<GeoStatus | null>(null);

export const usePosition = () => useContext(PositionContext);

export function useGeoStatus(): GeoStatus {
  const s = useContext(GeoStatusContext);
  if (!s) throw new Error("useGeoStatus outside PositionProvider");
  return s;
}

export const usePositionRef = () => useGeoStatus().posRef;
