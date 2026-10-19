import { routeEntity } from "./repo";

export function useRoutes(opts: { adventureId?: string; token?: string }) {
  const { rows, ...rest } = routeEntity.useEntity(opts);
  return { routes: rows, ...rest };
}
