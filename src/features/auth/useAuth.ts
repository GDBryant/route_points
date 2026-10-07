import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export interface Profile {
  id: string
  display_name: string
  colour: string
}

export interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}
