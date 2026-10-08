import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { GeoPosition } from '@/features/tracking/useGeolocation'
import { enqueuePosition } from '@/features/sync/outbox'

export interface LivePos {
  user_id: string
  name: string
  colour: string
  lat: number
  lng: number
  heading: number | null
  speed: number | null
  accuracy: number | null
  t: number
}

export interface SelfInfo {
  user_id: string
  name: string
  colour: string
}

const PUBLISH_MS = 5_000
const PERSIST_MS = 30_000
const STALE_MS = 10 * 60_000
const RENDER_MS = 1_000

export function usePositions({
  adventureId,
  token,
  publish,
  self,
  position,
}: {
  adventureId: string
  token?: string | null
  publish: boolean
  self: SelfInfo | null
  position: GeoPosition | null
}) {
  const [others, setOthers] = useState<Map<string, LivePos>>(new Map())
  const [online, setOnline] = useState<Set<string>>(new Set())

  const selfRef = useRef(self)
  const posRef = useRef(position)
  const pubRef = useRef(publish)
  const lastRenderRef = useRef<Map<string, number>>(new Map())
  useEffect(() => {
    selfRef.current = self
  }, [self])
  useEffect(() => {
    posRef.current = position
  }, [position])
  useEffect(() => {
    pubRef.current = publish
  }, [publish])

  const selfId = self?.user_id ?? null

  useEffect(() => {
    if (!adventureId) return
    let active = true
    const chan = supabase.channel(`pos:${adventureId}`, {
      config: { private: false, presence: { key: selfId ?? 'anon' } },
    })

    chan
      .on('broadcast', { event: 'pos' }, ({ payload }) => {
        const p = payload as LivePos
        if (!p?.user_id || p.user_id === selfRef.current?.user_id) return
        const now = Date.now()
        const last = lastRenderRef.current.get(p.user_id) ?? 0
        if (now - last < RENDER_MS) return
        lastRenderRef.current.set(p.user_id, now)
        setOthers((m) => new Map(m).set(p.user_id, { ...p, t: now }))
      })
      .on('presence', { event: 'sync' }, () => {
        const state = chan.presenceState<{ user_id: string }>()
        setOnline(
          new Set(
            Object.values(state)
              .flat()
              .map((e) => e.user_id)
              .filter(Boolean),
          ),
        )
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && selfId) {
          chan.track({ user_id: selfId })
        }
      })

    const loadStale = async () => {
      const { data } = token
        ? await supabase.rpc('get_adventure_positions', { token })
        : await supabase
            .from('positions')
            .select('user_id, lat, lng, heading, speed, updated_at')
            .eq('adventure_id', adventureId)
      if (!data || !active) return
      setOthers((m) => {
        const next = new Map(m)
        for (const r of data) {
          if (r.user_id === selfRef.current?.user_id) continue
          if (next.has(r.user_id)) continue
          next.set(r.user_id, {
            user_id: r.user_id,
            name: '',
            colour: '#e91e63',
            lat: r.lat ?? 0,
            lng: r.lng ?? 0,
            heading: r.heading,
            speed: r.speed,
            accuracy: null,
            t: new Date(r.updated_at as string).getTime(),
          })
        }
        return next
      })
    }
    loadStale()

    const pub = setInterval(() => {
      const p = posRef.current
      const s = selfRef.current
      if (!pubRef.current || !p || !s) return
      chan.send({
        type: 'broadcast',
        event: 'pos',
        payload: {
          user_id: s.user_id,
          name: s.name,
          colour: s.colour,
          lat: p.lat,
          lng: p.lng,
          heading: p.heading,
          speed: p.speed,
          accuracy: p.accuracy,
        } satisfies Omit<LivePos, 't'>,
      })
    }, PUBLISH_MS)

    const persist = setInterval(() => {
      const p = posRef.current
      const s = selfRef.current
      if (!pubRef.current || !p || !s) return
      enqueuePosition({
        adventure_id: adventureId,
        user_id: s.user_id,
        lat: p.lat,
        lng: p.lng,
        heading: p.heading,
        speed: p.speed,
        accuracy_m: p.accuracy,
      })
    }, PERSIST_MS)

    const prune = setInterval(() => {
      const cutoff = Date.now() - STALE_MS
      setOthers((m) => {
        const next = new Map(m)
        for (const [k, v] of next) if (v.t < cutoff) next.delete(k)
        return next
      })
    }, 60_000)

    return () => {
      active = false
      clearInterval(pub)
      clearInterval(persist)
      clearInterval(prune)
      supabase.removeChannel(chan)
    }
  }, [adventureId, token, selfId])

  return { others, online }
}
