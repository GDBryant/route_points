import { useEffect, useState } from "react";
import { listMembers, type Member } from "@/features/adventures/api";
import { useAuth } from "@/features/auth/useAuth";
import type { LivePos } from "@/features/live/usePositions";

export default function MembersTab({
  adventureId,
  others,
  online,
  onFly,
}: {
  adventureId: string;
  others: Map<string, LivePos>;
  online: Set<string>;
  onFly: (lat: number, lng: number) => void;
}) {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (user && adventureId)
      listMembers(adventureId)
        .then(setMembers)
        .catch(() => {});
  }, [user, adventureId]);

  return (
    <div className="panel overlay">
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
    </div>
  );
}
