import {
  LAYER_CACHES,
  LAYER_CAPS,
  tilesInBbox,
  tileUrl,
  type Bbox,
  type Layer,
} from './tileMath'

const CONCURRENCY = 6

export async function prefetchTiles(
  layer: Layer,
  bbox: Bbox,
  zooms: [number, number],
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<number> {
  const cache = await caches.open(LAYER_CACHES[layer])
  let tiles = tilesInBbox(bbox, zooms[0], zooms[1])
  tiles = tiles.slice(0, LAYER_CAPS[layer])
  const total = tiles.length
  let done = 0
  let idx = 0

  const worker = async () => {
    while (idx < tiles.length) {
      if (signal?.aborted) return
      const t = tiles[idx++]
      const res = await fetch(tileUrl(layer, t), { signal })
      if (res.ok) await cache.put(tileUrl(layer, t), res)
      done++
      onProgress?.(done, total)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, total) }, worker),
  )
  return done
}

export async function deleteTilesInBbox(
  layer: Layer,
  bbox: Bbox,
  zooms: [number, number],
): Promise<void> {
  const cache = await caches.open(LAYER_CACHES[layer])
  const tiles = tilesInBbox(bbox, zooms[0], zooms[1])
  for (const t of tiles) await cache.delete(tileUrl(layer, t))
}
