import { useRef, useState } from 'react'
import { fromGpx } from './gpx'
import { savePointLocal } from '@/features/points/repo'
import { saveRouteLocal, queueWaypoints } from '@/features/routes/repo'

export default function GpxSheet({
  adventureId,
  isEditor,
  onClose,
  onDone,
}: {
  adventureId: string
  isEditor: boolean
  onClose: () => void
  onDone: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<{
    points: number
    routes: number
    parsed: ReturnType<typeof fromGpx> | null
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const pick = async (file: File) => {
    setError(null)
    try {
      const parsed = fromGpx(await file.text(), adventureId)
      setPreview({
        points: parsed.points.length,
        routes: parsed.routes.length,
        parsed,
      })
    } catch {
      setError('Invalid GPX file')
    }
  }

  const confirm = async () => {
    if (!preview?.parsed) return
    setBusy(true)
    for (const p of preview.parsed.points) {
      await savePointLocal(adventureId, {
        name: p.name,
        kind: p.kind,
        note: p.note ?? '',
        seq: p.seq ?? null,
        accuracy_m: p.accuracy_m ?? null,
        lat: p.lat,
        lng: p.lng,
        client_id: p.client_id,
      })
    }
    for (const { route, waypoints } of preview.parsed.routes) {
      await saveRouteLocal({
        ...route,
        coords: waypoints.map((w) => [w.lng, w.lat]),
      })
      if (waypoints.length)
        await queueWaypoints(route.client_id, waypoints)
    }
    setBusy(false)
    onDone()
    onClose()
  }

  return (
    <div className="sheet" role="dialog">
      <h3>Import GPX</h3>
      <div className="stack">
        <input
          ref={inputRef}
          type="file"
          accept=".gpx"
          onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
        />
        {preview && (
          <p className="muted">
            {preview.points} waypoints, {preview.routes} routes
          </p>
        )}
        {error && <p className="error">{error}</p>}
        {preview?.parsed && isEditor && (
          <button className="primary" onClick={confirm} disabled={busy}>
            Import
          </button>
        )}
        {preview?.parsed && !isEditor && (
          <p className="muted">Viewers cannot import</p>
        )}
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}
