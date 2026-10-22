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

type PermStatus = { state: string; onchange: (() => void) | null };

type PermQuery = {
  query?: (d: { name: string }) => Promise<PermStatus>;
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
  const permStatus = useRef<PermStatus | null>(null);

  const clearWatch = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  const queryPerm = useCallback(async (): Promise<PermStatus | null> => {
    const perms = navigator.permissions as PermQuery | undefined;
    if (!perms?.query) return null;
    try {
      const s = await perms.query({ name: "geolocation" });
      permStatus.current = s;
      return s;
    } catch {
      return null;
    }
  }, []);

  const start = useCallback(() => {
    if (watchId.current !== null) return;
    setState("watching");
    setError(null);
    let cancelled = false;
    const id = navigator.geolocation.watchPosition(
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
          cancelled = true;
          clearWatch();
          localStorage.removeItem(KEY);
          setState("denied");
          setError(e.message);
        } else if (e.code === 3) {
          setError(e.message);
          queryPerm().then((s) => {
            if (s?.state === "prompt") {
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
    if (!cancelled) watchId.current = id;
  }, [clearWatch, queryPerm]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    let alive = true;
    if (localStorage.getItem(KEY) === "1") start();
    else
      queryPerm().then((s) => {
        if (!alive || !s) {
          if (alive) setState("prompt");
          return;
        }
        s.onchange = () => {
          if (s.state === "granted") start();
        };
        if (s.state === "granted") start();
        else if (s.state === "denied") setState("denied");
        else setState("prompt");
      });
    return () => {
      alive = false;
      if (permStatus.current) permStatus.current.onchange = null;
      clearWatch();
    };
  }, [start, queryPerm, clearWatch]);

  useEffect(() => {
    if (state !== "denied") return;
    const retry = () =>
      navigator.geolocation.getCurrentPosition(() => start(), () => {}, {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      });
    const id = setInterval(retry, 5000);
    const onVis = () => {
      if (document.visibilityState === "visible") retry();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [state, start]);

  return { position, error, state, request: start };
}
