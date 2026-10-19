import { useState } from "react";
import { checkForUpdates, type UpdateCheck } from "./updates";

export default function AboutUpdate() {
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

  return (
    <div className="about muted">
      <span>
        v{__APP_VERSION__} · {__BUILD_DATE__}
      </span>
      <button type="button" onClick={check} disabled={status === "checking"}>
        Check for updates
      </button>
      {msg && <span>{msg}</span>}
    </div>
  );
}
