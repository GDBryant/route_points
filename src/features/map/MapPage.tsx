import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import MapView from './MapView'
import { touchAdventure } from '@/features/adventures/api'
import { useAuth } from '@/features/auth/useAuth'

export default function MapPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const guest = !user && params.get('token')

  useEffect(() => {
    if (user && id) touchAdventure(id)
  }, [user, id])

  return (
    <>
      {guest && <div className="banner">Viewing as guest</div>}
      <MapView />
    </>
  )
}
