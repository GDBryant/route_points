import { useCallback, useEffect, useState } from "react";
import { can as canDo, type Action } from "@/features/adventures/permissions";
import {
  getAdventure,
  myRole,
  touchAdventure,
} from "@/features/adventures/api";

export interface AdvInfo {
  id: string;
  name: string;
  snap_radius_m: number;
  share_token: string;
}

export function useAdventure({
  id,
  token,
  user,
}: {
  id: string;
  token: string | null;
  user: { id: string } | null;
}) {
  const guest = !user && !!token;
  const [role, setRole] = useState<string | null>(null);
  const [snapRadius, setSnapRadius] = useState(20);
  const [adv, setAdv] = useState<AdvInfo | null>(null);

  useEffect(() => {
    if (user && id) {
      touchAdventure(id);
      myRole(id).then(setRole);
      getAdventure(id)
        .then((a) => {
          setAdv(a);
          setSnapRadius(a.snap_radius_m);
        })
        .catch(() => {});
    }
  }, [user, id]);

  const can = useCallback(
    (a: Action) => !guest && canDo(role, a),
    [guest, role],
  );
  return {
    guest,
    adv,
    setAdv,
    role,
    can,
    snapRadius,
    setSnapRadius,
  };
}
