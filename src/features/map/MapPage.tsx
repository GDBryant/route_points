import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import MapView from './MapView'
import { useGeolocation } from '@/features/tracking/useGeolocation'
import {
  getAdventure,
  listMembers,
  myRole,
  touchAdventure,
  type Member,
} from '@/features/adventures/api'
import AdventureSettingsSheet from '@/features/adventures/AdventureSettingsSheet'
import { useAuth } from '@/features/auth/useAuth'
import { usePoints } from '@/features/points/usePoints'
import { savePointLocal, removePoint } from '@/features/points/repo'
import type { Point } from '@/features/points/api'
import AddPointSheet, {
  type PointFormInput,
} from '@/features/points/AddPointSheet'
import PointDetailSheet from '@/features/points/PointDetailSheet'
import PointsList from '@/features/points/PointsList'
import { useRoutes } from '@/features/routes/useRoutes'
import { saveRouteLocal, removeRoute } from '@/features/routes/repo'
import type { RouteRow } from '@/features/routes/api'
import { useSync } from '@/features/sync/useSync'
import SyncBadge from '@/features/sync/SyncBadge'
import { usePositions } from '@/features/live/usePositions'
import NavigateHud from '@/features/live/NavigateHud'
import { useAuth as useAuthCtx } from '@/features/auth/useAuth'
import { useRecorder, type PendingRoute } from '@/features/routes/useRecorder'
import RecordSheet from '@/features/routes/RecordSheet'
import FinishRouteSheet, {
  type FinishInput,
} from '@/features/routes/FinishRouteSheet'
import RouteDetailSheet from '@/features/routes/RouteDetailSheet'
import RoutesList from '@/features/routes/RoutesList'
import type { GeoPosition } from '@/features/tracking/useGeolocation'
import DownloadTilesSheet from '@/features/tiles/DownloadTilesSheet'
import { adventureBbox } from '@/features/tiles/tileMath'
import GpxSheet from '@/features/gpx/GpxSheet'
import { toGpx } from '@/features/gpx/gpx'

type Tab = 'map' | 'points' | 'routes' | 'members'

export default function MapPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const { profile } = useAuthCtx()
  const token = params.get('token')
  const guest = !user && !!token
  const { position, error } = useGeolocation()

  const [role, setRole] = useState<string | null>(null)
  const [snapRadius, setSnapRadius] = useState(20)
  const [adv, setAdv] = useState<{
    id: string
    name: string
    snap_radius_m: number
  } | null>(null)
  const { points, refresh } = usePoints(
    guest ? { token: token! } : { adventureId: id },
  )
  const { routes, refresh: refreshRoutes } = useRoutes(
    guest ? { token: token! } : { adventureId: id },
  )
  const [tab, setTab] = useState<Tab>('map')
  const [members, setMembers] = useState<Member[]>([])
  const [adding, setAdding] = useState<{
    lat: number
    lng: number
    accuracy: number | null
    initial?: Point
  } | null>(null)
  const [selected, setSelected] = useState<Point | null>(null)
  const [moving, setMoving] = useState<Point | null>(null)
  const [moveTo, setMoveTo] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<RouteRow | null>(null)
  const [flyTo, setFlyTo] = useState<{
    lat: number
    lng: number
    t: number
    bounds?: [[number, number], [number, number]]
  } | null>(null)
  const [recording, setRecording] = useState(false)
  const [endRouteAt, setEndRouteAt] = useState(false)
  const [finishing, setFinishing] = useState<{
    route: PendingRoute
    lastPos: GeoPosition | null
    forceToId?: string
  } | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showTiles, setShowTiles] = useState(false)
  const [showGpx, setShowGpx] = useState(false)
  const [headingUp, setHeadingUp] = useState(false)
  const [navTarget, setNavTarget] = useState<Point | null>(null)
  const [sharePos, setSharePos] = useState(
    () => localStorage.getItem('sharePos') !== 'off',
  )

  const isEditor = !guest && (role === 'owner' || role === 'editor')
  const isOwner = role === 'owner'
  const recorder = useRecorder(position, points, snapRadius)
  const sync = useSync()
  const self =
    user && profile
      ? {
          user_id: user.id,
          name: profile.display_name || user.email?.split('@')[0] || 'me',
          colour: profile.colour || '#1e88e5',
        }
      : null
  const { others, online } = usePositions({
    adventureId: id,
    token: guest ? token : null,
    publish: isEditor && sharePos,
    self,
    position,
  })

  useEffect(() => {
    if (user && id) {
      touchAdventure(id)
      myRole(id).then(setRole)
      getAdventure(id)
        .then((a) => {
          setAdv(a)
          setSnapRadius(a.snap_radius_m)
        })
        .catch(() => {})
    }
  }, [user, id])

  useEffect(() => {
    if (tab === 'members' && user && id)
      listMembers(id).then(setMembers).catch(() => {})
  }, [tab, user, id])

  const savePoint = async (input: PointFormInput) => {
    if (!adding) return
    const saved = await savePointLocal(id, {
      ...input,
      lat: adding.lat,
      lng: adding.lng,
    })
    const wasEnd = endRouteAt
    setAdding(null)
    setEndRouteAt(false)
    refresh()
    if (wasEnd && saved?.id) {
      const res = await recorder.stop()
      if (res.route)
        setFinishing({ ...res, route: res.route, forceToId: saved.id })
    }
  }

  const onLongPress = (lat: number, lng: number) => {
    if (isEditor) setAdding({ lat, lng, accuracy: null })
  }

  const startMove = (p: Point) => {
    setSelected(null)
    setMoving(p)
    setMoveTo({ lat: p.lat, lng: p.lng })
    setFlyTo({ lat: p.lat, lng: p.lng, t: Date.now() })
  }

  const onMoveCenter = useCallback(
    (lat: number, lng: number) => setMoveTo({ lat, lng }),
    [],
  )

  const onMoved = async (p: Point, lat: number, lng: number) => {
    await savePointLocal(id, {
      name: p.name,
      kind: p.kind,
      note: p.note ?? '',
      seq: p.seq,
      accuracy_m: null,
      lat,
      lng,
      client_id: p.client_id,
    })
    setMoving(null)
    setMoveTo(null)
    refresh()
  }

  const onDelete = async (p: Point) => {
    await removePoint(p)
    setSelected(null)
  }

  const onStopRecord = async () => {
    const res = await recorder.stop()
    if (res.route) setFinishing({ ...res, route: res.route })
    else recorder.finishDone()
  }

  const saveRoute = async (input: FinishInput) => {
    if (!finishing) return
    await saveRouteLocal({
      adventure_id: id,
      client_id: finishing.route.client_id,
      name: input.name,
      from_point_id: input.from_point_id,
      to_point_id: input.to_point_id,
      direction: input.direction,
      mode: finishing.route.mode,
      interval_s: finishing.route.interval_s,
      started_at: finishing.route.started_at,
      ended_at: new Date().toISOString(),
      coords: recorder.pendingCoords,
    })
    setFinishing(null)
    setRecording(false)
    recorder.finishDone()
    refreshRoutes()
  }

  const onRouteDirection = async (r: RouteRow, dir: string) => {
    await saveRouteLocal({
      adventure_id: id,
      client_id: r.client_id,
      name: r.name,
      from_point_id: r.from_point_id,
      to_point_id: r.to_point_id,
      direction: dir,
      mode: r.mode,
      interval_s: r.interval_s,
      started_at: r.started_at ?? undefined,
      ended_at: r.ended_at,
    })
    refreshRoutes()
    setSelectedRoute({ ...r, direction: dir })
  }

  const onRouteDelete = async (r: RouteRow) => {
    await removeRoute(r)
    setSelectedRoute(null)
    refreshRoutes()
  }

  const zoomToAdventure = () => {
    const coords = [
      ...points.map((p) => ({ lat: p.lat, lng: p.lng })),
      ...routes.flatMap((r) =>
        r.coords.map(([lng, lat]) => ({ lat, lng })),
      ),
    ]
    if (position) coords.push({ lat: position.lat, lng: position.lng })
    if (!coords.length) return
    const lats = coords.map((c) => c.lat)
    const lngs = coords.map((c) => c.lng)
    setFlyTo({
      lat: Math.min(...lats),
      lng: Math.min(...lngs),
      bounds: [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
      t: Date.now(),
    })
  }

  const toggleSharePos = () => {
    const next = !sharePos
    setSharePos(next)
    localStorage.setItem('sharePos', next ? 'on' : 'off')
  }

  const exportGpx = async () => {
    const xml = toGpx({ name: adv?.name ?? 'adventure' }, points, routes)
    const file = new File([xml], `${adv?.name ?? 'adventure'}.gpx`, {
      type: 'application/gpx+xml',
    })
    const nav = navigator as Navigator & {
      canShare?: (d: { files: File[] }) => boolean
    }
    if (nav.canShare?.({ files: [file] }))
      await navigator.share({ files: [file] }).catch(() => {})
    else {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(file)
      a.download = file.name
      a.click()
      URL.revokeObjectURL(a.href)
    }
    setShowSettings(false)
  }

  const recordingCoords = recorder.pendingCoords.map(
    ([lng, lat]) => ({ lat, lng }) as const,
  )

  return (
    <div className="mappage">
      {guest && <div className="banner">Viewing as guest</div>}
      {!sync.online && <div className="banner offline">Offline — changes will sync</div>}
      {moving && (
        <div className="banner">
          Pan map to position “{moving.name}”
          <button
            className="linklike"
            onClick={() => moveTo && onMoved(moving, moveTo.lat, moveTo.lng)}
          >
            Save
          </button>
          <button
            className="linklike"
            onClick={() => {
              setMoving(null)
              setMoveTo(null)
            }}
          >
            Cancel
          </button>
        </div>
      )}
      {!guest && (
        <SyncBadge
          online={sync.online}
          pending={sync.pending}
          dead={sync.dead}
          syncing={sync.syncing}
          onSync={sync.syncNow}
        />
      )}
      <MapView
        points={points}
        routes={routes}
        recordingCoords={recordingCoords}
        others={[...others.values()]}
        rotation={headingUp && position?.heading != null ? -position.heading : 0}
        position={position}
        error={error}
        onMarkerTap={setSelected}
        onRouteTap={setSelectedRoute}
        onLongPress={isEditor ? onLongPress : undefined}
        movingId={moving?.id ?? null}
        onCenterChange={onMoveCenter}
        flyTo={flyTo}
      />

      {tab === 'points' && (
        <div className="panel overlay">
          <PointsList
            points={points}
            isEditor={isEditor}
            onTap={(p) => {
              setFlyTo({ lat: p.lat, lng: p.lng, t: Date.now() })
              setTab('map')
            }}
            onMove={(p, dir) => {
              const sorted = [...points].sort(
                (a, b) =>
                  (a.seq ?? 9999) - (b.seq ?? 9999) ||
                  a.name.localeCompare(b.name),
              )
              const i = sorted.findIndex((x) => x.id === p.id)
              const other = sorted[i + dir]
              if (!other) return
              const seqA = p.seq ?? i + 1
              const seqB = other.seq ?? i + 1 + dir
              savePointLocal(id, {
                name: p.name,
                kind: p.kind,
                note: p.note ?? '',
                seq: seqB,
                accuracy_m: null,
                lat: p.lat,
                lng: p.lng,
                client_id: p.client_id,
              })
              savePointLocal(id, {
                name: other.name,
                kind: other.kind,
                note: other.note ?? '',
                seq: seqA,
                accuracy_m: null,
                lat: other.lat,
                lng: other.lng,
                client_id: other.client_id,
              })
            }}
          />
        </div>
      )}
      {tab === 'routes' && (
        <div className="panel overlay">
          <RoutesList
            routes={routes}
            points={points}
            onTap={(r) => {
              if (r.coords.length)
                setFlyTo({
                  lat: r.coords[0][1],
                  lng: r.coords[0][0],
                  t: Date.now(),
                })
              setTab('map')
            }}
          />
        </div>
      )}
      {tab === 'members' && (
        <div className="panel overlay">
          <ul className="list">
            {members.map((m) => (
              <li key={m.user_id} className="card">
                <button
                  className="linklike"
                  onClick={() => {
                    const o = others.get(m.user_id)
                    if (o) {
                      setFlyTo({ lat: o.lat, lng: o.lng, t: Date.now() })
                      setTab('map')
                    }
                  }}
                >
                  <span className="dot" style={{ background: m.colour }} />
                  <strong>{m.display_name || 'Member'}</strong>
                  <span className="muted">{m.role}</span>
                  {online.has(m.user_id) && (
                    <span className="dot-online">●</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isEditor && tab === 'map' && !adding && !recording && !finishing && (
        <>
          <button
            className="fab"
            disabled={!position}
            title={position ? undefined : 'Waiting for GPS'}
            onClick={() => {
              if (position)
                setAdding({
                  lat: position.lat,
                  lng: position.lng,
                  accuracy: position.accuracy,
                })
            }}
          >
            + Point
          </button>
          <button className="fab fab2" onClick={() => setRecording(true)}>
            Record
          </button>
          <button className="gear" onClick={() => setShowSettings(true)}>
            ⚙
          </button>
        </>
      )}
      {tab === 'map' && (
        <>
          <button
            className={`compass-btn${headingUp ? ' active' : ''}`}
            title="Heading up"
            onClick={() => setHeadingUp((h) => !h)}
          >
            🧭
          </button>
          <button
            className="zoomadv-btn"
            title="Zoom to adventure"
            onClick={zoomToAdventure}
          >
            ⛶
          </button>
        </>
      )}

      {navTarget && (
        <NavigateHud
          point={navTarget}
          position={position}
          onClose={() => setNavTarget(null)}
        />
      )}

      {adding && (
        <AddPointSheet
          lat={adding.lat}
          lng={adding.lng}
          accuracy={adding.accuracy}
          points={points}
          initial={adding.initial}
          recording={recorder.state === 'recording'}
          endRouteAt={endRouteAt}
          onEndRouteAt={setEndRouteAt}
          onSave={savePoint}
          onClose={() => setAdding(null)}
        />
      )}

      {selected && !adding && (
        <PointDetailSheet
          point={selected}
          position={position}
          isEditor={isEditor}
          onEdit={(p) => {
            setSelected(null)
            setAdding({ lat: p.lat, lng: p.lng, accuracy: null, initial: p })
          }}
          onMove={isEditor ? startMove : undefined}
          onDelete={onDelete}
          onNavigate={(p) => {
            setNavTarget(p)
            setSelected(null)
          }}
          onClose={() => setSelected(null)}
        />
      )}

      {selectedRoute && (
        <RouteDetailSheet
          route={selectedRoute}
          points={points}
          isEditor={isEditor}
          onDirection={onRouteDirection}
          onDelete={onRouteDelete}
          onClose={() => setSelectedRoute(null)}
        />
      )}

      {recording && recorder.state === 'recording' && (
        <RecordSheet
          state="recording"
          mode={recorder.route?.mode}
          waypointCount={recorder.waypointCount}
          elapsedS={recorder.elapsedS}
          onStart={() => {}}
          onDrop={recorder.dropWaypoint}
          onStop={onStopRecord}
        />
      )}
      {recording && recorder.state === 'idle' && (
        <RecordSheet
          state="idle"
          waypointCount={0}
          elapsedS={0}
          onStart={async (mode, s) => {
            const r = recorder.start(mode, s)
            if (r)
              await saveRouteLocal({
                adventure_id: id,
                client_id: r.client_id,
                mode: r.mode,
                interval_s: r.interval_s,
                started_at: r.started_at,
                from_point_id: r.from_point_id,
              }).catch(() => {})
          }}
          onDrop={() => {}}
          onStop={() => setRecording(false)}
        />
      )}

      {finishing && (
        <FinishRouteSheet
          route={finishing.route}
          lastPos={finishing.lastPos}
          points={points}
          snapRadiusM={snapRadius}
          routeCount={routes.length}
          forceToId={finishing.forceToId}
          onSave={saveRoute}
        />
      )}

      {showSettings && adv && (
        <AdventureSettingsSheet
          adventure={adv}
          isOwner={isOwner}
          onSaved={(snap, name) => {
            setSnapRadius(snap)
            setAdv({ ...adv, name, snap_radius_m: snap })
          }}
          sharePos={sharePos}
          onToggleShare={isEditor ? toggleSharePos : undefined}
          onExportGpx={() => exportGpx()}
          onImportGpx={
            isEditor
              ? () => {
                  setShowSettings(false)
                  setShowGpx(true)
                }
              : undefined
          }
          onOfflineMaps={() => {
            setShowSettings(false)
            setShowTiles(true)
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showGpx && (
        <GpxSheet
          adventureId={id}
          isEditor={isEditor}
          onClose={() => setShowGpx(false)}
          onDone={() => {
            refresh()
            refreshRoutes()
          }}
        />
      )}

      {showTiles && (
        <DownloadTilesSheet
          adventureId={id}
          bbox={adventureBbox([
            ...points,
            ...routes.flatMap((r) =>
              r.coords.map(([lng, lat]) => ({ lat, lng })),
            ),
          ])}
          onClose={() => setShowTiles(false)}
        />
      )}

      <nav className="tabbar">
        {(['map', 'points', 'routes', 'members'] as Tab[]).map((t) => (
          <button
            key={t}
            className={tab === t ? 'tab active' : 'tab'}
            onClick={() => setTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>
    </div>
  )
}
