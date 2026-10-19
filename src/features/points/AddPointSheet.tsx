import { useState } from "react";
import type { Point } from "./api";
import { KINDS, KIND_LABEL } from "./kinds";
import { suggestedName } from "./suggestedName";

export interface PointFormInput {
  name: string;
  kind: string;
  note: string;
  seq: number | null;
  accuracy_m: number | null;
  client_id?: string;
}

export default function AddPointSheet({
  lat,
  lng,
  accuracy,
  points,
  initial,
  initialKind = "obstacle",
  initialName,
  recording,
  endRouteAt,
  onEndRouteAt,
  onSave,
  onClose,
}: {
  lat: number;
  lng: number;
  accuracy?: number | null;
  points: Point[];
  initial?: Point;
  initialKind?: string;
  initialName?: string;
  recording?: boolean;
  endRouteAt?: boolean;
  onEndRouteAt?: (v: boolean) => void;
  onSave: (input: PointFormInput) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<string>(initial?.kind ?? initialKind);
  const [name, setName] = useState(
    () => initial?.name ?? initialName ?? suggestedName(points, initialKind),
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [touched, setTouched] = useState(!!initial || !!initialName);

  const pickKind = (k: string) => {
    setKind(k);
    if (!touched) setName(suggestedName(points, k));
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: name || `Point at ${lat.toFixed(4)},${lng.toFixed(4)}`,
      kind,
      note,
      seq:
        kind === "obstacle"
          ? parseInt(name.replace(/\D/g, ""), 10) || initial?.seq || null
          : (initial?.seq ?? null),
      accuracy_m: accuracy ?? null,
      client_id: initial?.client_id,
    });
  };

  return (
    <div className="sheet" role="dialog">
      <h3>{initial ? "Edit point" : "Add point"}</h3>
      <p className="muted">
        {lat.toFixed(5)}, {lng.toFixed(5)}
        {accuracy != null && ` (±${Math.round(accuracy)} m)`}
      </p>
      <form onSubmit={save} className="stack">
        <select
          aria-label="Kind"
          value={kind}
          onChange={(e) => pickKind(e.target.value)}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <input
          required
          placeholder="Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setTouched(true);
          }}
        />
        <input
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {recording && !initial && (
          <label className="checkline">
            <input
              type="checkbox"
              checked={endRouteAt}
              onChange={(e) => onEndRouteAt?.(e.target.checked)}
            />
            End route here
          </label>
        )}
        <button type="submit" className="primary">
          Save
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </form>
    </div>
  );
}
