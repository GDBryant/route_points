import { useState } from 'react'
import { updateAdventure } from './api'

export default function AdventureSettingsSheet({
  adventure,
  isOwner,
  onSaved,
  onOfflineMaps,
  sharePos,
  onToggleShare,
  onExportGpx,
  onImportGpx,
  onClose,
}: {
  adventure: { id: string; name: string; snap_radius_m: number }
  isOwner: boolean
  onSaved: (snap: number, name: string) => void
  onOfflineMaps?: () => void
  sharePos?: boolean
  onToggleShare?: () => void
  onExportGpx?: () => void
  onImportGpx?: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(adventure.name)
  const [snap, setSnap] = useState(adventure.snap_radius_m)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isOwner)
      await updateAdventure(adventure.id, { name, snap_radius_m: snap })
    onSaved(snap, name)
    onClose()
  }

  return (
    <div className="sheet" role="dialog">
      <h3>Adventure settings</h3>
      <form onSubmit={save} className="stack">
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isOwner}
          />
        </label>
        <label>
          Snap radius: {snap} m
          <input
            type="range"
            min={5}
            max={100}
            value={snap}
            onChange={(e) => setSnap(parseInt(e.target.value, 10))}
            disabled={!isOwner}
          />
        </label>
        {onOfflineMaps && (
          <button type="button" onClick={onOfflineMaps}>
            Offline maps
          </button>
        )}
        {typeof onToggleShare === 'function' && (
          <label className="checkline">
            <input
              type="checkbox"
              checked={sharePos}
              onChange={() => onToggleShare()}
            />
            Share my position
          </label>
        )}
        {onExportGpx && (
          <button type="button" onClick={onExportGpx}>
            Export GPX
          </button>
        )}
        {onImportGpx && (
          <button type="button" onClick={onImportGpx}>
            Import GPX
          </button>
        )}
        <button type="submit" className="primary">
          Done
        </button>
      </form>
    </div>
  )
}
