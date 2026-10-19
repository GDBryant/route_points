import { pointEntity } from "./repo";

export function usePoints(opts: { adventureId?: string; token?: string }) {
  const { rows, ...rest } = pointEntity.useEntity(opts);
  return { points: rows, ...rest };
}
