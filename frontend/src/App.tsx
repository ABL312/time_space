import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useUserStore } from './stores/userStore'
import { useTimeTheme } from './hooks/useTimeTheme'

// Pages
import HomePage from './pages/HomePage'
import OnboardingPage from './pages/OnboardingPage'
import CreatePage from './pages/CreatePage'
import ARPage from './pages/ARPage'
import CapsuleDetailPage from './pages/CapsuleDetailPage'
import MyCapsulesPage from './pages/MyCapsulesPage'
import FavoritesPage from './pages/FavoritesPage'

function App() {
  const { user, loadUser, isLoading } = useUserStore()
  const theme = useTimeTheme()

  useEffect(() => {
    // Apply theme to document element
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
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
