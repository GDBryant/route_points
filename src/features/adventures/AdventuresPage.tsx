import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  createAdventure,
  listAdventures,
  type Adventure,
} from './api'
import ShareSheet from './ShareSheet'
import { useInstallPrompt } from '@/features/pwa/useInstallPrompt'

function InstallHint() {
  const { canInstall, ios, installed, prompt } = useInstallPrompt()
  if (installed) return null
  if (canInstall)
    return (
      <button className="primary" style={{ marginTop: 16 }} onClick={prompt}>
        Install app
      </button>
    )
  if (ios)
    return (
      <p className="muted" style={{ marginTop: 16 }}>
        Share → Add to Home Screen to install
      </p>
    )
  return null
}

export default function AdventuresPage() {
  const [adventures, setAdventures] = useState<Adventure[]>([])
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [share, setShare] = useState<Adventure | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    listAdventures()
      .then(setAdventures)
      .catch((e) => setError(e.message))
  }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = await createAdventure(name).catch((err: Error) => {
      setError(err.message)
      return null
    })
    if (id) navigate(`/a/${id}`)
  }

  return (
    <div className="page">
      <h1>Adventures</h1>
      {error && <p className="error">{error}</p>}
      <ul className="list">
        {adventures.map((a, i) => (
          <li key={a.id} className={i === 0 ? 'card latest' : 'card'}>
            <Link to={`/a/${a.id}`}>
              <strong>{a.name}</strong>
              <span className="muted"> · {a.role}</span>
            </Link>
            <button onClick={() => setShare(a)}>Share</button>
          </li>
        ))}
      </ul>
      {creating ? (
        <form onSubmit={create} className="stack bottom-actions">
          <input
            autoFocus
            required
            placeholder="Adventure name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="primary">
            Create
          </button>
          <button type="button" onClick={() => setCreating(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="bottom-actions">
          <button className="primary" onClick={() => setCreating(true)}>
            Start New Adventure
          </button>
        </div>
      )}
      {share && (
        <ShareSheet
          token={share.share_token}
          name={share.name}
          onClose={() => setShare(null)}
        />
      )}
      <InstallHint />
    </div>
  )
}
