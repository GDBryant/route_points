import { useMemo, useRef, useState } from 'react'
import { db } from '@/lib/db'
import {
  LAYER_CAPS,
  estimateBytes,
  tilesInBbox,
  type Bbox,
  type Layer,
} from './tileMath'
import { deleteTilesInBbox, prefetchTiles } from './prefetch'

export default function DownloadTilesSheet({
  adventureId,
  bbox,
  onClose,
}: {
  adventureId: string
  bbox: Bbox
  onClose: () => void
}) {
  const [layers, setLayers] = useState<Layer[]>(['osm'])
  const [zmax, setZmax] = useState(16)
  const [progress, setProgress] = useState<{
    done: number
    total: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const count = useMemo(
    () => layers.length * tilesInBbox(bbox, 12, zmax).length,
    [bbox, zmax, layers],
  )
  const capped = layers.reduce(
    (n, l) => n + Math.min(tilesInBbox(bbox, 12, zmax).length, LAYER_CAPS[l]),
    0,
  )
  const mb = (estimateBytes(capped) / 1024 / 1024).toFixed(1)

  const toggle = (l: Layer) =>
    setLayers((ls) => (ls.includes(l) ? ls.filter((x) => x !== l) : [...ls, l]))

  const download = async () => {
    abortRef.current = new AbortController()
    setError(null)
    for (const layer of layers) {
      try {
        const done = await prefetchTiles(
          layer,
          bbox,
          [12, zmax],
          (d, t) => setProgress({ done: d, total: t }),
          abortRef.current.signal,
        )
        await db.tiles_meta.put({
          adventure_id: adventureId,
          layer,
          bbox,
          zooms: [12, zmax],
          count: done,
          bytes: estimateBytes(done),
          downloaded_at: new Date().toISOString(),
        })
      } catch (e) {
        if ((e as Error).name === 'AbortError') {
          setProgress(null)
          return
        }
        setError((e as Error).message)
      }
    }
    setProgress(null)
    onClose()
  }

  const remove = async () => {
    for (const layer of layers) {
      await deleteTilesInBbox(layer, bbox, [12, zmax])
      await db.tiles_meta.delete([adventureId, layer])
    }
    onClose()
  }

  return (
    <div className="sheet" role="dialog">
      <h3>Offline maps</h3>
      <div className="stack">
        <label className="checkline">
          <input
            type="checkbox"
            checked={layers.includes('osm')}
            onChange={() => toggle('osm')}
          />
          OpenStreetMap
        </label>
        <label className="checkline">
          <input
            type="checkbox"
            checked={layers.includes('esri')}
            onChange={() => toggle('esri')}
          />
          Esri satellite
        </label>
        <label>
          Max zoom: {zmax}
          <input
            type="range"
            min={13}
            max={17}
            value={zmax}
            onChange={(e) => setZmax(parseInt(e.target.value, 10))}
          />
        </label>
        <p className="muted">
          {capped} tiles{capped < count && ` (capped from ${count})`} · ≈{mb} MB
        </p>
        {error && <p className="error">{error}</p>}
        {progress ? (
          <>
            <progress value={progress.done} max={progress.total} />
            <button onClick={() => abortRef.current?.abort()}>Cancel</button>
          </>
        ) : (
          <>
            <button
              className="primary"
              onClick={download}
              disabled={layers.length === 0}
            >
              Download
            </button>
            <button className="danger" onClick={remove}>
              Delete downloaded tiles
            </button>
            <button onClick={onClose}>Close</button>
          </>
        )}
      </div>
    </div>
  )
}
