import { useCallback, useEffect, useState } from "react";
import {
  addMember,
  listKnownUsers,
  listMembers,
  type Member,
} from "@/features/adventures/api";
import { useAuth } from "@/features/auth/useAuth";
import type { LivePos } from "@/features/live/usePositions";

export default function MembersTab({
  adventureId,
  others,
  online,
  isOwner,
  onShare,
  onFly,
}: {
  adventureId: string;
  others: Map<string, LivePos>;
  online: Set<string>;
  isOwner: boolean;
  onShare?: () => void;
  onFly: (lat: number, lng: number) => void;
}) {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [known, setKnown] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      listMembers(adventureId)
        .then(setMembers)
        .catch((e) => setError(e.message)),
    [adventureId],
  );

  useEffect(() => {
    if (user && adventureId) load();
  }, [user, adventureId, load]);

  useEffect(() => {
    if (isOwner && user && adventureId)
      listKnownUsers()
        .then(setKnown)
        .catch(() => {});
  }, [isOwner, user, adventureId]);

  const addable = known.filter(
    (k) => !members.some((m) => m.user_id === k.user_id),
  );

  return (
    <div className="panel overlay">
      {onShare && (
        <button className="primary" onClick={onShare}>
          Share adventure
        </button>
      )}
      {error && <p className="error">{error}</p>}
      <ul className="list">
        {members.map((m) => (
          <li key={m.user_id} className="card">
            <button
              className="linklike"
              onClick={() => {
                const o = others.get(m.user_id);
                if (o) onFly(o.lat, o.lng);
              }}
            >
              <span className="dot" style={{ background: m.colour }} />
              <strong>{m.display_name || "Member"}</strong>
              <span className="muted">{m.role}</span>
              {online.has(m.user_id) && <span className="dot-online">●</span>}
            </button>
          </li>
        ))}
      </ul>
      {isOwner && addable.length > 0 && (
        <>
          <h3>Add people</h3>
          <ul className="list">
            {addable.map((k) => (
              <li key={k.user_id} className="card">
                <span className="dot" style={{ background: k.colour }} />
                <strong>{k.display_name || "Member"}</strong>
                <button
                  className="primary"
                  onClick={() =>
                    addMember(adventureId, k.user_id)
                      .then(load)
                      .catch((e) => setError(e.message))
                  }
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
