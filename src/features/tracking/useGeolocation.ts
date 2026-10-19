import { useCallback, useEffect, useRef, useState } from "react";

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
}

export type GeoState =
  | "checking"
  | "unsupported"
  | "prompt"
  | "denied"
  | "watching";

const KEY = "geoEnabled";

type PermQuery = {
  query?: (d: { name: string }) => Promise<{ state: string }>;
};

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(() =>
    navigator.geolocation ? null : "Geolocation not supported",
  );
  const [state, setState] = useState<GeoState>(() =>
    navigator.geolocation ? "checking" : "unsupported",
  );
  const watchId = useRef<number | null>(null);

  const clearWatch = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  const queryPerm = useCallback(async (): Promise<string | null> => {
    const perms = navigator.permissions as PermQuery | undefined;
    if (!perms?.query) return null;
    try {
      return (await perms.query({ name: "geolocation" })).state;
    } catch {
      return null;
    }
  }, []);

  const start = useCallback(() => {
    if (watchId.current !== null) return;
    setState("watching");
    setError(null);
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        setPosition({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          heading: p.coords.heading,
          speed: p.coords.speed,
        });
        localStorage.setItem(KEY, "1");
      },
      (e) => {
        if (e.code === 1) {
          clearWatch();
          localStorage.removeItem(KEY);
          setState("denied");
          setError(e.message);
        } else if (e.code === 3) {
          setError(e.message);
          queryPerm().then((s) => {
            if (s === "prompt") {
              clearWatch();
              setState("prompt");
            }
          });
        } else {
          setError(e.message);
        }
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );
  }, [clearWatch, queryPerm]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    let alive = true;
    if (localStorage.getItem(KEY) === "1") start();
    else
      queryPerm().then((s) => {
        if (!alive) return;
        if (s === "granted") start();
        else if (s === "denied") setState("denied");
        else setState("prompt");
      });
    return () => {
      alive = false;
      clearWatch();
    };
  }, [start, queryPerm, clearWatch]);

  return { position, error, state, request: start };
}
