export type Bbox = [number, number, number, number]
export type Layer = 'osm' | 'esri'

export function lngLatToTile(lng: number, lat: number, z: number) {
  const n = 2 ** z
  const x = Math.floor(((lng + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  )
  return { x, y }
}

export function tilesInBbox(bbox: Bbox, zmin: number, zmax: number) {
  const tiles: { x: number; y: number; z: number }[] = []
  for (let z = zmin; z <= zmax; z++) {
    const tl = lngLatToTile(bbox[0], bbox[3], z)
    const br = lngLatToTile(bbox[2], bbox[1], z)
    for (let x = tl.x; x <= br.x; x++)
      for (let y = tl.y; y <= br.y; y++) tiles.push({ x, y, z })
  }
  return tiles
}

export function estimateBytes(count: number): number {
  return count * 20 * 1024
}

export const LAYER_CAPS: Record<Layer, number> = { osm: 2500, esri: 8000 }

export const LAYER_URLS: Record<Layer, string> = {
  osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  esri: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
}

export const LAYER_CACHES: Record<Layer, string> = {
  osm: 'osm-tiles',
  esri: 'esri-tiles',
}

export function tileUrl(layer: Layer, t: { x: number; y: number; z: number }) {
  return LAYER_URLS[layer]
    .replace('{s}', 'a')
    .replace('{z}', String(t.z))
    .replace('{x}', String(t.x))
    .replace('{y}', String(t.y))
}

export function adventureBbox(
  coords: { lat: number; lng: number }[],
  fallback?: { lat: number; lng: number },
): Bbox {
  let b: Bbox = [Infinity, Infinity, -Infinity, -Infinity]
  for (const c of coords) {
    b = [
      Math.min(b[0], c.lng),
      Math.min(b[1], c.lat),
      Math.max(b[2], c.lng),
      Math.max(b[3], c.lat),
    ]
  }
  if (!isFinite(b[0])) {
    const f = fallback ?? { lat: -33.56, lng: 18.48 }
    b = [f.lng - 0.01, f.lat - 0.01, f.lng + 0.01, f.lat + 0.01]
  }
  const pad = 0.009
  return [b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad]
}
