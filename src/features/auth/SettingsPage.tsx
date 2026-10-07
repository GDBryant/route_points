import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth, type Profile } from './useAuth'

export default function SettingsPage() {
  const { profile, signOut } = useAuth()

  return (
    <div className="page">
      <h1>Settings</h1>
      {profile && <SettingsForm key={profile.id} profile={profile} />}
      <button onClick={signOut}>Sign out</button>
    </div>
  )
}

function SettingsForm({ profile }: { profile: Profile }) {
  const { refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [colour, setColour] = useState(profile.colour)
  const [saved, setSaved] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    await supabase
      .from('profiles')
      .update({ display_name: displayName, colour })
      .eq('id', profile.id)
    await refreshProfile()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form onSubmit={save} className="stack">
      <label>
        Display name
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </label>
      <label>
        Colour
        <input
          type="color"
          value={colour}
          onChange={(e) => setColour(e.target.value)}
        />
      </label>
      <button type="submit" className="primary">
        {saved ? 'Saved' : 'Save'}
      </button>
    </form>
  )
}
