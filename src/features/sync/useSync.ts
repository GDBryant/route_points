import { useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { drain, MAX_ATTEMPTS, pendingCount } from './outbox'

export function useSync() {
  const [online, setOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)

  const pending = useLiveQuery(() => pendingCount(), [], 0)
  const dead = useLiveQuery(
    () => db.outbox.where('attempts').aboveOrEqual(MAX_ATTEMPTS).count(),
    [],
    0,
  )

  const syncNow = useCallback(async () => {
    setSyncing(true)
    try {
      await drain()
    } finally {
      setSyncing(false)
    }
  }, [])

  useEffect(() => {
    const on = () => {
      setOnline(true)
      syncNow()
    }
    const off = () => setOnline(false)
    const vis = () => {
      if (document.visibilityState === 'visible' && navigator.onLine)
        syncNow()
    }
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    document.addEventListener('visibilitychange', vis)
    const timer = setInterval(() => {
      if (navigator.onLine) drain()
    }, 30_000)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      document.removeEventListener('visibilitychange', vis)
      clearInterval(timer)
    }
  }, [syncNow])

  return { online, pending: pending ?? 0, dead: dead ?? 0, syncing, syncNow }
}
