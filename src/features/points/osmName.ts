import { haversineM } from "@/lib/geo";

const timedFetch = (url: string, init?: RequestInit) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 5000);
  return fetch(url, { ...init, signal: c.signal }).finally(() =>
    clearTimeout(t),
  );
};

const overpassName = async (lat: number, lng: number, radiusM: number) => {
  const res = await timedFetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=[out:json][timeout:5];(node(around:${radiusM},${lat},${lng})[name];way(around:${radiusM},${lat},${lng})[name];);out tags center 20;`,
  });
  if (!res.ok) return null;
  const { elements = [] } = await res.json();
  let best: string | null = null;
  let bestD = Infinity;
  for (const e of elements) {
    const name = e.tags?.name;
    const el = e.type === "way" ? e.center : e;
    if (!name || el?.lat == null) continue;
    const d = haversineM({ lat, lng }, { lat: el.lat, lng: el.lon });
    if (d < bestD) {
      best = name;
      bestD = d;
    }
  }
  return best;
};

const nominatimName = async (lat: number, lng: number) => {
  const res = await timedFetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`,
  );
  if (!res.ok) return null;
  const json = await res.json();
  if (json.name) return json.name as string;
  const a = json.address ?? {};
  for (const k of [
    "tourism",
    "amenity",
    "natural",
    "farm",
    "hamlet",
    "isolated_dwelling",
    "village",
    "road",
  ])
    if (a[k]) return a[k] as string;
  return null;
};

export async function nearbyOsmName(
  lat: number,
  lng: number,
  radiusM = 200,
): Promise<string | null> {
  if (!navigator.onLine) return null;
  try {
    const n = await overpassName(lat, lng, radiusM);
    if (n) return n;
  } catch {}
  try {
    return await nominatimName(lat, lng);
  } catch {
    return null;
  }
}
