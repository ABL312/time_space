import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'
import { useUserStore } from './stores/userStore'
import { useTimeTheme } from './hooks/useTimeTheme'
import LoadingState from './components/ui/LoadingState'
import OfflineBanner from './components/ui/OfflineBanner'
import AchievementUnlockPopup from './components/AchievementUnlockPopup'
import type { Achievement } from './hooks/useAchievements'

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
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  useEffect(() => {
    const handleUnlock = (e: Event) => {
      const ach = (e as CustomEvent).detail as Achievement
      setUnlockedAchievement(ach)
    }
    window.addEventListener('achievement-unlocked', handleUnlock)
    return () => window.removeEventListener('achievement-unlocked', handleUnlock)
  }, [])

  // Register service worker for PWA support
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failure is non-critical
      })
    }
  }, [])

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
      <a href="#main-content" className="skip-link">Skip to content</a>
      <OfflineBanner />
      <Suspense fallback={<PageLoader />}>
        <main id="main-content">
        <Routes>
          <Route
            path="/onboarding"
            element={user ? <Navigate to="/" replace /> : <OnboardingPage />}
          />
          <Route
            path="/login"
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
        </main>
      </Suspense>
      <AchievementUnlockPopup
        achievement={unlockedAchievement}
        onClose={() => setUnlockedAchievement(null)}
      />
    </BrowserRouter>
  )
}

export default App
