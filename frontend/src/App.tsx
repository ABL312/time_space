import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { useUserStore } from './stores/userStore'
import { useTimeTheme } from './hooks/useTimeTheme'
import LoadingState from './components/ui/LoadingState'

// Lazy-loaded pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const CreatePage = lazy(() => import('./pages/CreatePage'))
const ARPage = lazy(() => import('./pages/ARPage'))
const CapsuleDetailPage = lazy(() => import('./pages/CapsuleDetailPage'))
const MyCapsulesPage = lazy(() => import('./pages/MyCapsulesPage'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'))
const SharedCapsulePage = lazy(() => import('./pages/SharedCapsulePage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const CollectionsPage = lazy(() => import('./pages/CollectionsPage'))
const CollectionDetailPage = lazy(() => import('./pages/CollectionDetailPage'))

/** Page-level loading fallback */
function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg">
      <LoadingState message="加载中" />
    </div>
  )
}

function App() {
  const { user, loadUser, isLoading } = useUserStore()
  const theme = useTimeTheme()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg">
        <div className="text-center">
          <div className="w-3 h-3 bg-signal breathe mx-auto mb-4" />
          <p className="data text-signal">INITIALIZING</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/onboarding"
            element={user ? <Navigate to="/" replace /> : <OnboardingPage />}
          />
          <Route
            path="/"
            element={user ? <HomePage /> : <Navigate to="/onboarding" replace />}
          />
          <Route
            path="/create"
            element={user ? <CreatePage /> : <Navigate to="/onboarding" replace />}
          />
          <Route
            path="/ar"
            element={user ? <ARPage /> : <Navigate to="/onboarding" replace />}
          />
          <Route
            path="/capsule/:id"
            element={user ? <CapsuleDetailPage /> : <Navigate to="/onboarding" replace />}
          />
          <Route
            path="/mine"
            element={user ? <MyCapsulesPage /> : <Navigate to="/onboarding" replace />}
          />
          <Route
            path="/favorites"
            element={user ? <FavoritesPage /> : <Navigate to="/onboarding" replace />}
          />
          <Route
            path="/s/:token"
            element={<SharedCapsulePage />}
          />
          <Route
            path="/profile"
            element={user ? <ProfilePage /> : <Navigate to="/onboarding" replace />}
          />
          <Route
            path="/collections"
            element={user ? <CollectionsPage /> : <Navigate to="/onboarding" replace />}
          />
          <Route
            path="/collections/:id"
            element={user ? <CollectionDetailPage /> : <Navigate to="/onboarding" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
