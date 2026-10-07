import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { MAX_ATTEMPTS } from './outbox'

export default function SyncBadge({
  online,
  pending,
  dead,
  syncing,
  onSync,
}: {
  online: boolean
  pending: number
  dead: number
  syncing: boolean
  onSync: () => void
}) {
  const [open, setOpen] = useState(false)
  const deadItems = useLiveQuery(
    () =>
      open
        ? db.outbox.where('attempts').aboveOrEqual(MAX_ATTEMPTS).toArray()
        : [],
    [open],
    [],
  )

  return (
    <>
      <button
        className={`sync-badge${online ? '' : ' offline'}`}
        onClick={() => (dead ? setOpen(true) : onSync())}
      >
        {online ? '☁' : '⚠'}
        {pending + dead > 0 && <span className="count">{pending + dead}</span>}
        {syncing && '…'}
      </button>
      {open && (
        <div className="sheet" role="dialog">
          <h3>Failed sync items ({deadItems?.length ?? 0})</h3>
          <ul className="list">
            {(deadItems ?? []).map((i) => (
              <li key={i.id} className="card">
                <span>
                  {i.kind}
                  <span className="muted"> {i.last_error}</span>
                </span>
                <button
                  onClick={async () => {
                    await db.outbox.update(i.id!, { attempts: 0 })
                    onSync()
                  }}
                >
                  Retry
                </button>
                <button
                  className="danger"
                  onClick={() => db.outbox.delete(i.id!)}
                >
                  Discard
                </button>
              </li>
            ))}
          </ul>
          <button onClick={() => setOpen(false)}>Close</button>
        </div>
      )}
    </>
  )
}
