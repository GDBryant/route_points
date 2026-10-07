import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import {
  listPointsByToken,
  subscribePoints,
  type Point,
} from './api'
import { syncPointsFromServer } from './repo'

export function usePoints(opts: { adventureId?: string; token?: string }) {
  const [tokenPoints, setTokenPoints] = useState<Point[]>([])
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const localPoints = useLiveQuery(
    () =>
      opts.adventureId
        ? db.points
            .where('adventure_id')
            .equals(opts.adventureId)
            .toArray()
        : Promise.resolve([] as (Point & { adventure_id: string })[]),
    [opts.adventureId, tick],
    [] as Point[],
  )

  useEffect(() => {
    if (opts.adventureId || !opts.token) return
    listPointsByToken(opts.token)
      .then(setTokenPoints)
      .catch((e) => setError(e.message))
  }, [opts.adventureId, opts.token])

  useEffect(() => {
    if (!opts.adventureId) return
    let active = true
    syncPointsFromServer(opts.adventureId)
      .then(() => active && setTick((t) => t + 1))
      .catch((e) => active && setError(e.message))

    const unsub = subscribePoints(opts.adventureId, ({ eventType, new: n, old }) => {
      if (eventType === 'DELETE')
        db.points.delete(old.id).catch(() => {})
      else
        db.points
          .put({ ...(n as Point), adventure_id: opts.adventureId! })
          .catch(() => {})
    })
    return () => {
      active = false
      unsub()
    }
  }, [opts.adventureId])

  const refresh = () => {
    if (opts.adventureId)
      syncPointsFromServer(opts.adventureId).catch((e) => setError(e.message))
    else if (opts.token)
      listPointsByToken(opts.token)
        .then(setTokenPoints)
        .catch((e) => setError(e.message))
  }

  return {
    points: opts.adventureId ? localPoints : tokenPoints,
    error,
    refresh,
  }
}
