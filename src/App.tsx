import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useSearchParams,
} from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { useAuth } from "@/features/auth/useAuth";
import { RequireAuth } from "@/features/auth/RequireAuth";
import LoginPage from "@/features/auth/LoginPage";
import AdventuresPage from "@/features/adventures/AdventuresPage";
import JoinPage from "@/features/adventures/JoinPage";
import UpdateToast from "@/features/pwa/UpdateToast";
import ErrorBoundary from "@/features/pwa/ErrorBoundary";

const MapPage = lazy(() => import("@/features/map/MapPage"));
const SettingsPage = lazy(() => import("@/features/auth/SettingsPage"));
const PrivacyPage = lazy(() =>
  import("@/features/legal/LegalPage").then((m) => ({
    default: m.PrivacyPage,
  })),
);
const TermsPage = lazy(() =>
  import("@/features/legal/LegalPage").then((m) => ({
    default: m.TermsPage,
  })),
);

function Home() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? "/adventures" : "/login"} replace />;
}

function MapRoute() {
  const [params] = useSearchParams();
  if (params.get("token")) return <MapPage />;
  return (
    <RequireAuth>
      <MapPage />
    </RequireAuth>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/join/:token" element={<JoinPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
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
          </Suspense>
        </AuthProvider>
        <UpdateToast />
      </ErrorBoundary>
    </BrowserRouter>
  );
}
