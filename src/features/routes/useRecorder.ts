import { useEffect, useRef, useState } from 'react'
import type { GeoPosition } from '@/features/tracking/useGeolocation'
import { type WaypointInput } from './api'
import { queueWaypoints } from './repo'
import { nearestPoint } from './snap'
import { haversineM } from '@/lib/geo'
import type { Point } from '@/features/points/api'

export interface PendingRoute {
  client_id: string
  mode: 'manual' | 'auto'
  interval_s: number | null
  started_at: string
  from_point_id: string | null
}

const MAX_ACCURACY_M = 50
const MIN_MOVE_M = 5
const FLUSH_COUNT = 10
const FLUSH_MS = 30_000

export function useRecorder(
  position: GeoPosition | null,
  points: Point[],
  snapRadiusM: number,
) {
  const [state, setState] = useState<'idle' | 'recording' | 'finishing'>('idle')
  const [route, setRoute] = useState<PendingRoute | null>(null)
  const [waypointCount, setWaypointCount] = useState(0)
  const [elapsedS, setElapsedS] = useState(0)
  const [pendingCoords, setPendingCoords] = useState<[number, number][]>([])

  const posRef = useRef(position)
  const bufRef = useRef<WaypointInput[]>([])
  const seqRef = useRef(0)
  const lastPosRef = useRef<GeoPosition | null>(null)
  const lastDropMsRef = useRef(0)
  const routeRef = useRef<PendingRoute | null>(null)
  const wakeLockRef = useRef<{ release: () => void } | null>(null)
  const pointsRef = useRef(points)

  useEffect(() => {
    posRef.current = position
  }, [position])
  useEffect(() => {
    pointsRef.current = points
  }, [points])

  const dropWaypoint = () => {
    const p = posRef.current
    if (!p || (p.accuracy != null && p.accuracy > MAX_ACCURACY_M)) return false
    seqRef.current += 1
    lastDropMsRef.current = Date.now()
    bufRef.current.push({
      client_id: crypto.randomUUID(),
      seq: seqRef.current,
      lat: p.lat,
      lng: p.lng,
      accuracy_m: p.accuracy,
      recorded_at: new Date().toISOString(),
    })
    lastPosRef.current = p
    setPendingCoords((c) => [...c, [p.lng, p.lat]])
    setWaypointCount((n) => n + 1)
    return true
  }

  const flush = async () => {
    if (!routeRef.current || bufRef.current.length === 0) return
    const batch = bufRef.current
    bufRef.current = []
    await queueWaypoints(routeRef.current.client_id, batch).catch(() => {
      bufRef.current = [...batch, ...bufRef.current]
    })
  }

  const start = (mode: 'manual' | 'auto', intervalS: number | null) => {
    const r: PendingRoute = {
      client_id: crypto.randomUUID(),
      mode,
      interval_s: mode === 'auto' ? intervalS : null,
      started_at: new Date().toISOString(),
      from_point_id:
        nearestPoint(posRef.current, pointsRef.current, snapRadiusM)?.id ??
        null,
    }
    routeRef.current = r
    bufRef.current = []
    seqRef.current = 0
    lastPosRef.current = null
    lastDropMsRef.current = 0
    setRoute(r)
    setWaypointCount(0)
    setElapsedS(0)
    setPendingCoords([])
    setState('recording')
    navigator.wakeLock
      ?.request('screen')
      .then((wl) => (wakeLockRef.current = wl))
      .catch(() => {})
    return r
  }

  const stop = async () => {
    await flush()
    wakeLockRef.current?.release()
    wakeLockRef.current = null
    const r = routeRef.current
    const lastPos = posRef.current
    setState('finishing')
    return { route: r, lastPos }
  }

  const finishDone = () => {
    routeRef.current = null
    setRoute(null)
    setPendingCoords([])
    setState('idle')
  }

  useEffect(() => {
    if (state !== 'recording') return
    const r = routeRef.current
    const tick = setInterval(() => {
      setElapsedS(
        Math.round((Date.now() - new Date(r!.started_at).getTime()) / 1000),
      )
      if (r!.mode === 'auto') {
        const p = posRef.current
        const last = lastPosRef.current
        const due =
          Date.now() - lastDropMsRef.current >= (r!.interval_s ?? 5) * 1000
        const moved = !last || haversineM(last, p!) >= MIN_MOVE_M
        if (p && due && moved) dropWaypoint()
      }
    }, 1000)
    const flushTimer = setInterval(flush, FLUSH_MS)
    return () => {
      clearInterval(tick)
      clearInterval(flushTimer)
    }
  }, [state])

  useEffect(() => {
    if (state === 'recording' && bufRef.current.length >= FLUSH_COUNT) flush()
  }, [waypointCount, state])

  return {
    state,
    route,
    waypointCount,
    elapsedS,
    pendingCoords,
    start,
    dropWaypoint,
    stop,
    finishDone,
  }
}
