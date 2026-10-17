import { useState } from "react";
import { updateAdventure } from "./api";
import InstallHint from "@/features/pwa/InstallHint";
import { checkForUpdates, type UpdateCheck } from "@/features/pwa/updates";

export default function AdventureSettingsSheet({
  adventure,
  isOwner,
  onSaved,
  onShare,
  onOfflineMaps,
  sharePos,
  onToggleShare,
  onExportGpx,
  onImportGpx,
  onExit,
  onClose,
}: {
  adventure: { id: string; name: string; snap_radius_m: number };
  isOwner: boolean;
  onSaved: (snap: number, name: string) => void;
  onShare?: () => void;
  onOfflineMaps?: () => void;
  sharePos?: boolean;
  onToggleShare?: () => void;
  onExportGpx?: () => void;
  onImportGpx?: () => void;
  onExit: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(adventure.name);
  const [snap, setSnap] = useState(adventure.snap_radius_m);
  const [status, setStatus] = useState<"idle" | "checking" | "done">("idle");
  const [msg, setMsg] = useState("");

  const check = async () => {
    setStatus("checking");
    setMsg("Checking…");
    const r: UpdateCheck | "error" = await checkForUpdates().catch(
      () => "error" as const,
    );
    setStatus("done");
    setMsg(
      r === "unsupported"
        ? "Updates unavailable in this browser"
        : r === "none"
          ? "Up to date"
          : r === "found"
            ? "Update found — restarting…"
            : "Check failed",
    );
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOwner)
      await updateAdventure(adventure.id, { name, snap_radius_m: snap });
    onSaved(snap, name);
    onClose();
  };

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
        {onShare && (
          <button type="button" onClick={onShare}>
            Share adventure
          </button>
        )}
        {onOfflineMaps && (
          <button type="button" onClick={onOfflineMaps}>
            Offline maps
          </button>
        )}
        {typeof onToggleShare === "function" && (
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
        <InstallHint />
        <button type="button" className="danger" onClick={onExit}>
          Exit adventure
        </button>
        <button type="submit" className="primary">
          Done
        </button>
        <div className="about muted">
          <span>
            v{__APP_VERSION__} · {__BUILD_DATE__}
          </span>
          <button
            type="button"
            onClick={check}
            disabled={status === "checking"}
          >
            Check for updates
          </button>
          {msg && <span>{msg}</span>}
        </div>
      </form>
    </div>
  );
}
