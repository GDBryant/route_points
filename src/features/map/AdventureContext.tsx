import { createContext, useContext } from "react";
import type { Point } from "@/features/points/api";
import type { RouteRow } from "@/features/routes/api";
import type { AdvInfo } from "./useAdventure";
import type { Action } from "@/features/adventures/permissions";

export interface AdventureCtx {
  id: string;
  adv: AdvInfo | null;
  guest: boolean;
  can: (a: Action) => boolean;
  snapRadius: number;
  points: Point[];
  routes: RouteRow[];
}

export const AdventureContext = createContext<AdventureCtx | null>(null);

export function useAdventureCtx(): AdventureCtx {
  const ctx = useContext(AdventureContext);
  if (!ctx) throw new Error("useAdventureCtx outside provider");
  return ctx;
}
