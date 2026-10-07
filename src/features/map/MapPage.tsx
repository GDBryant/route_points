import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import MapView from './MapView'
import { useGeolocation } from '@/features/tracking/useGeolocation'
import {
  listMembers,
  myRole,
  touchAdventure,
  type Member,
} from '@/features/adventures/api'
import { useAuth } from '@/features/auth/useAuth'
import { usePoints } from '@/features/points/usePoints'
import { deletePoint, upsertPoint, type Point } from '@/features/points/api'
import AddPointSheet from '@/features/points/AddPointSheet'
import PointDetailSheet from '@/features/points/PointDetailSheet'
import PointsList from '@/features/points/PointsList'

type Tab = 'map' | 'points' | 'members'

export default function MapPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const token = params.get('token')
  const guest = !user && !!token
  const { position, error } = useGeolocation()

  const [role, setRole] = useState<string | null>(null)
  const { points, refresh } = usePoints(
    guest ? { token: token! } : { adventureId: id },
  )
  const [tab, setTab] = useState<Tab>('map')
  const [members, setMembers] = useState<Member[]>([])
  const [adding, setAdding] = useState<{
    lat: number
    lng: number
    accuracy: number | null
  } | null>(null)
  const [selected, setSelected] = useState<Point | null>(null)
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; t: number } | null>(null)

  const isEditor = role === 'owner' || role === 'editor'

  useEffect(() => {
    if (user && id) {
      touchAdventure(id)
      myRole(id).then(setRole)
    }
  }, [user, id])

  useEffect(() => {
    if (tab === 'members' && user && id)
      listMembers(id).then(setMembers).catch(() => {})
  }, [tab, user, id])

  const savePoint = async (input: {
    name: string
    kind: string
    note: string
    seq: number | null
    accuracy_m: number | null
  }) => {
    if (!adding) return
    await upsertPoint({
      adventure_id: id,
      client_id: crypto.randomUUID(),
      lat: adding.lat,
      lng: adding.lng,
      ...input,
    })
    setAdding(null)
    refresh()
  }

  const onLongPress = (lat: number, lng: number) => {
    if (isEditor) setAdding({ lat, lng, accuracy: null })
  }

  const onMarkerTap = (p: Point) => setSelected(p)
  const onDelete = async (p: Point) => {
    await deletePoint(p.id)
    setSelected(null)
  }

  return (
    <div className="mappage">
      {guest && <div className="banner">Viewing as guest</div>}
      {tab === 'map' && (
        <MapView
          points={points}
          position={position}
          error={error}
          onMarkerTap={onMarkerTap}
          onLongPress={isEditor ? onLongPress : undefined}
          flyTo={flyTo}
        />
      )}
      {tab === 'points' && (
        <div className="panel">
          <PointsList
            points={points}
            onTap={(p) => {
              setFlyTo({ lat: p.lat, lng: p.lng, t: Date.now() })
              setTab('map')
            }}
          />
        </div>
      )}
      {tab === 'members' && (
        <div className="panel">
          <ul className="list">
            {members.map((m) => (
              <li key={m.user_id} className="card">
                <span className="dot" style={{ background: m.colour }} />
                <strong>{m.display_name || 'Member'}</strong>
                <span className="muted">{m.role}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isEditor && !guest && tab === 'map' && !adding && (
        <button
          className="fab"
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
      )}

      {adding && (
        <AddPointSheet
          lat={adding.lat}
          lng={adding.lng}
          accuracy={adding.accuracy}
          points={points}
          onSave={savePoint}
          onClose={() => setAdding(null)}
        />
      )}

      {selected && (
        <PointDetailSheet
          point={selected}
          position={position}
          isEditor={isEditor}
          onEdit={() => {}}
          onDelete={onDelete}
          onClose={() => setSelected(null)}
        />
      )}

      <nav className="tabbar">
        {(['map', 'points', 'members'] as Tab[]).map((t) => (
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
