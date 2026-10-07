import { useCallback, useEffect, useState } from 'react'
import {
  listRoutes,
  listRoutesByToken,
  subscribeRoutes,
  type RouteRow,
} from './api'

export function useRoutes(opts: { adventureId?: string; token?: string }) {
  const [routes, setRoutes] = useState<RouteRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    const load = opts.adventureId
      ? listRoutes(opts.adventureId)
      : listRoutesByToken(opts.token!)
    load.then(setRoutes).catch((e) => setError(e.message))
  }, [opts.adventureId, opts.token])

  useEffect(() => {
    let active = true
    const load = opts.adventureId
      ? listRoutes(opts.adventureId)
      : listRoutesByToken(opts.token!)
    load
      .then((r) => active && setRoutes(r))
      .catch((e) => active && setError(e.message))

    let unsub: (() => void) | undefined
    if (opts.adventureId) {
      unsub = subscribeRoutes(opts.adventureId, () => refresh())
    }
    return () => {
      active = false
      unsub?.()
    }
  }, [opts.adventureId, opts.token, refresh])

  return { routes, error, refresh }
}
