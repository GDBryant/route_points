import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useSearchParams,
} from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { useAuth } from '@/features/auth/useAuth'
import { RequireAuth } from '@/features/auth/RequireAuth'
import LoginPage from '@/features/auth/LoginPage'
import SettingsPage from '@/features/auth/SettingsPage'
import AdventuresPage from '@/features/adventures/AdventuresPage'
import JoinPage from '@/features/adventures/JoinPage'
import MapPage from '@/features/map/MapPage'

function Home() {
  const { user, loading } = useAuth()
  if (loading) return null
  return <Navigate to={user ? '/adventures' : '/login'} replace />
}

function MapRoute() {
  const [params] = useSearchParams()
  if (params.get('token')) return <MapPage />
  return (
    <RequireAuth>
      <MapPage />
    </RequireAuth>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/join/:token" element={<JoinPage />} />
          <Route
            path="/adventures"
            element={
              <RequireAuth>
                <AdventuresPage />
              </RequireAuth>
            }
          />
          <Route path="/a/:id" element={<MapRoute />} />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
