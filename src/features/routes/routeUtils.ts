import { bearingDeg, haversineM } from "@/lib/geo";
import type { Point } from "@/features/points/api";

export function withEndpoints(
  coords: [number, number][],
  from?: Point | null,
  to?: Point | null,
): [number, number][] {
  if (coords.length === 0 || (!from && !to)) return coords;
  const out: [number, number][] = [];
  if (from) out.push([from.lng, from.lat]);
  out.push(...coords);
  if (to) out.push([to.lng, to.lat]);
  return out;
}

export function arrowPositions(coords: [number, number][]) {
  const arrows: { pos: [number, number]; bearing: number }[] = [];
  if (coords.length < 2) return arrows;
  for (let i = 0; i < coords.length - 1; i += 5) {
    const j = Math.min(i + 1, coords.length - 1);
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[j];
    arrows.push({
      pos: [(lat1 + lat2) / 2, (lng1 + lng2) / 2],
      bearing: bearingDeg({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 }),
    });
  }
  return arrows;
}

export function routeLengthM(coords: [number, number][]): number {
  let d = 0;
  for (let i = 1; i < coords.length; i++) {
    d += haversineM(
      { lat: coords[i - 1][1], lng: coords[i - 1][0] },
      { lat: coords[i][1], lng: coords[i][0] },
    );
  }
  return d;
}

export function routeDurationS(r: {
  started_at: string | null;
  ended_at: string | null;
}): number | null {
  if (!r.started_at || !r.ended_at) return null;
  const s =
    (new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()) / 1000;
  return s > 0 ? s : null;
}

export function fmtDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 2 : 1)} km`;
}

export function fmtDuration(s: number): string {
  const t = Math.round(s);
  const h = Math.floor(t / 3600);
  const min = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(min)}:${pad(sec)}` : `${min}:${pad(sec)}`;
}

export function fmtSpeed(m: number, s: number, pace: boolean): string {
  if (s <= 0 || m <= 0) return "–";
  if (!pace) return `${((m / s) * 3.6).toFixed(1)} km/h`;
  const spk = Math.round((s / m) * 1000);
  return `${Math.floor(spk / 60)}:${String(spk % 60).padStart(2, "0")} /km`;
}
