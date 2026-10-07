import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { getByToken, joinByToken, type AdventureStub } from './api'

export default function JoinPage() {
  const { token = '' } = useParams()
  const { user, loading } = useAuth()
  const [stub, setStub] = useState<AdventureStub | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    getByToken(token)
      .then((s) => (s ? setStub(s) : setError('Invalid or expired link')))
      .catch((e) => setError(e.message))
  }, [token])

  useEffect(() => {
    if (!loading && user && stub) {
      joinByToken(token)
        .then((id) => navigate(`/a/${id}`, { replace: true }))
        .catch((e) => setError(e.message))
    }
  }, [loading, user, stub, token, navigate])

  if (error) return <div className="page"><p className="error">{error}</p></div>
  if (!stub || loading) return <div className="page"><p>Loading…</p></div>
  if (user) return <div className="page"><p>Joining {stub.name}…</p></div>

  return (
    <div className="page">
      <h1>{stub.name}</h1>
      <p className="muted">{stub.description}</p>
      <div className="stack bottom-actions">
        <button
          className="primary"
          onClick={() => navigate(`/a/${stub.id}?token=${token}`)}
        >
          View as guest
        </button>
        <button
          onClick={() => navigate(`/login?next=${encodeURIComponent(`/join/${token}`)}`)}
        >
          Log in to join
        </button>
      </div>
    </div>
  )
}
