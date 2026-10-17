import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { MAX_ATTEMPTS } from "./outbox";

function SyncIcon() {
  return (
    <svg
      className="sync-icon"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 0 1-15.5 6.2" />
      <path d="M3 12a9 9 0 0 1 15.5-6.2" />
      <path d="M18.5 2v3.8h-3.8" />
      <path d="M5.5 22v-3.8h3.8" />
    </svg>
  );
}

export default function SyncBadge({
  online,
  pending,
  dead,
  syncing,
  onSync,
}: {
  online: boolean;
  pending: number;
  dead: number;
  syncing: boolean;
  onSync: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadItems = useLiveQuery(
    () => (open ? db.outbox.where("attempts").aboveOrEqual(MAX_ATTEMPTS).toArray() : []),
    [open],
    [],
  );

  const shown = toast?.startsWith("Syncing") && pending === 0 ? "All synced" : toast;

  const tap = () => {
    if (dead > 0) {
      setOpen(true);
      return;
    }
    const msg = !online
      ? `Offline · ${pending} queued`
      : pending > 0
        ? `Syncing ${pending}…`
        : "All synced";
    if (timer.current) clearTimeout(timer.current);
    setToast(msg);
    timer.current = setTimeout(() => setToast(null), 1400);
    onSync();
  };

  return (
    <>
      <button className={`sync-badge${online ? "" : " offline"}`} onClick={tap}>
        <span className={syncing ? "spin" : undefined}>
          <SyncIcon />
        </span>
        {!online && <span className="sync-bang">!</span>}
        {pending + dead > 0 && <span className="count">{pending + dead}</span>}
      </button>
      {shown && (
        <div className="toast sync-toast" role="status">
          {shown}
        </div>
      )}
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
                    await db.outbox.update(i.id!, { attempts: 0 });
                    onSync();
                  }}
                >
                  Retry
                </button>
                <button className="danger" onClick={() => db.outbox.delete(i.id!)}>
                  Discard
                </button>
              </li>
            ))}
          </ul>
          <button onClick={() => setOpen(false)}>Close</button>
        </div>
      )}
    </>
  );
}
