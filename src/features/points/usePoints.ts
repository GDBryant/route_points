import { useEffect, useState } from 'react'
import {
  listPoints,
  listPointsByToken,
  subscribePoints,
  type Point,
} from './api'

export function usePoints(opts: { adventureId?: string; token?: string }) {
  const [points, setPoints] = useState<Point[]>([])
  const [error, setError] = useState<string | null>(null)

  const refresh = () => {
    const load = opts.adventureId
      ? listPoints(opts.adventureId)
      : listPointsByToken(opts.token!)
    load.then(setPoints).catch((e) => setError(e.message))
  }

  useEffect(() => {
    let active = true
    const load = opts.adventureId
      ? listPoints(opts.adventureId)
      : listPointsByToken(opts.token!)
    load
      .then((p) => active && setPoints(p))
      .catch((e) => active && setError(e.message))

    let unsub: (() => void) | undefined
    if (opts.adventureId) {
      unsub = subscribePoints(opts.adventureId, ({ eventType, new: n, old }) => {
        setPoints((prev) => {
          if (eventType === 'DELETE') return prev.filter((p) => p.id !== old.id)
          const idx = prev.findIndex((p) => p.id === n.id)
          if (eventType === 'UPDATE' || idx >= 0) {
            const copy = [...prev]
            if (idx >= 0) copy[idx] = n
            else copy.push(n)
            return copy
          }
          return [...prev, n]
        })
      })
    }
    return () => {
      active = false
      unsub?.()
    }
  }, [opts.adventureId, opts.token])

  return { points, error, refresh }
}
