import { useState } from 'react'
import type { Point } from './api'
import { suggestedName } from './suggestedName'

export interface PointFormInput {
  name: string
  kind: string
  note: string
  seq: number | null
  accuracy_m: number | null
}

const KINDS = ['obstacle', 'camp', 'entrance', 'other'] as const

export default function AddPointSheet({
  lat,
  lng,
  accuracy,
  points,
  onSave,
  onClose,
}: {
  lat: number
  lng: number
  accuracy?: number | null
  points: Point[]
  onSave: (input: PointFormInput) => void
  onClose: () => void
}) {
  const [kind, setKind] = useState<string>('obstacle')
  const [name, setName] = useState(() => suggestedName(points, 'obstacle'))
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)

  const pickKind = (k: string) => {
    setKind(k)
    if (!touched) setName(suggestedName(points, k))
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name: name || `Point at ${lat.toFixed(4)},${lng.toFixed(4)}`,
      kind,
      note,
      seq:
        kind === 'obstacle'
          ? parseInt(name.replace(/\D/g, ''), 10) || null
          : null,
      accuracy_m: accuracy ?? null,
    })
  }

  return (
    <div className="sheet" role="dialog">
      <h3>Add point</h3>
      <p className="muted">
        {lat.toFixed(5)}, {lng.toFixed(5)}
        {accuracy != null && ` (±${Math.round(accuracy)} m)`}
      </p>
      <form onSubmit={save} className="stack">
        <div className="segmented">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className={kind === k ? 'seg active' : 'seg'}
              onClick={() => pickKind(k)}
            >
              {k}
            </button>
          ))}
        </div>
        <input
          required
          placeholder="Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setTouched(true)
          }}
        />
        <input
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button type="submit" className="primary">
          Save
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </form>
    </div>
  )
}
