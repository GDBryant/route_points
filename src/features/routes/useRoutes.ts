import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import {
  listRoutesByToken,
  subscribeRoutes,
  type RouteRow,
} from './api'
import { syncRoutesFromServer } from './repo'

export function useRoutes(opts: { adventureId?: string; token?: string }) {
  const [tokenRoutes, setTokenRoutes] = useState<RouteRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const localRoutes = useLiveQuery(
    () =>
      opts.adventureId
        ? db.routes
            .where('adventure_id')
            .equals(opts.adventureId)
            .toArray()
        : Promise.resolve([] as RouteRow[]),
    [opts.adventureId, tick],
    [] as RouteRow[],
  )

  useEffect(() => {
    if (opts.adventureId || !opts.token) return
    listRoutesByToken(opts.token)
      .then(setTokenRoutes)
      .catch((e) => setError(e.message))
  }, [opts.adventureId, opts.token])

  useEffect(() => {
    if (!opts.adventureId) return
    let active = true
    syncRoutesFromServer(opts.adventureId)
      .then(() => active && setTick((t) => t + 1))
      .catch((e) => active && setError(e.message))

    const unsub = subscribeRoutes(opts.adventureId, () => {
      syncRoutesFromServer(opts.adventureId!).catch(() => {})
    })
    return () => {
      active = false
      unsub()
    }
  }, [opts.adventureId])

  const refresh = () => {
    if (opts.adventureId)
      syncRoutesFromServer(opts.adventureId).catch((e) => setError(e.message))
    else if (opts.token)
      listRoutesByToken(opts.token)
        .then(setTokenRoutes)
        .catch((e) => setError(e.message))
  }

  return {
    routes: opts.adventureId ? localRoutes : tokenRoutes,
    error,
    refresh,
  }
}
