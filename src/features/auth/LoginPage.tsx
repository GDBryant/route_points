import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [params] = useSearchParams()
  const next = params.get('next') ?? '/adventures'

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}${next}` },
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  const signInGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}${next}` },
    })

  return (
    <div className="page">
      <h1>Route Points</h1>
      {sent ? (
        <p>Check your email for the sign-in link.</p>
      ) : (
        <form onSubmit={sendMagicLink} className="stack">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="primary">
            Send magic link
          </button>
          <button type="button" onClick={signInGoogle}>
            Sign in with Google
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      )}
    </div>
  )
}
