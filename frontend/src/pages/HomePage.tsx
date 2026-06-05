import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGeolocation } from '../hooks/useGeolocation'
import { useCapsuleStore } from '../stores/capsuleStore'
import { useUserStore } from '../stores/userStore'
import { useCapabilityCheck } from '../hooks/useCapabilityCheck'
import MapView from '../components/MapView'
import RecommendPanel from '../components/RecommendPanel'

export default function HomePage() {
  const navigate = useNavigate()
  const { latitude, longitude, error: geoError } = useGeolocation()
  const { user } = useUserStore()
  const { fetchNearby, nearby, isLoadingNearby } = useCapsuleStore()
  const cap = useCapabilityCheck()

  const radius = cap.useExpandedGPS ? 5000 : 1200

  useEffect(() => {
    if (latitude && longitude && user) {
      fetchNearby({ lat: latitude, lng: longitude, radius, user_id: user.id })
    }
  }, [latitude, longitude, user, fetchNearby, radius])

  const handleExplore = () => {
    if (cap.shouldSkipAR) {
      const first = nearby?.recommended[0] || nearby?.others[0]
      if (first) navigate(`/capsule/${first.id}`)
    } else {
      navigate('/ar')
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-void">
      {/* Map */}
      <MapView
        latitude={latitude ?? 31.03}
        longitude={longitude ?? 121.21}
        capsules={nearby ? [...nearby.recommended, ...nearby.others] : []}
      />

      {/* ── TOP HUD OVERLAY ── */}
      <div className="absolute top-3 left-3 right-3 z-20 space-y-2">
        {/* Coordinate readout */}
        {latitude && longitude && (
          <div className="hud px-3 py-2 inline-flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 ${cap.isOnline ? 'bg-data-good breathe' : 'bg-data-bad'}`} />
              <span className="data">
                {latitude.toFixed(4)}°N <span className="text-slate-600">/</span> {longitude.toFixed(4)}°E
              </span>
            </div>
            {cap.useExpandedGPS && (
              <span className="data text-data-warn border border-data-warn/30 px-1.5 py-0.5">
                GPS DEGRADED
              </span>
            )}
          </div>
        )}

        {/* Warning banners */}
        {!cap.isOnline && (
          <div className="hud px-3 py-2 border-data-warn/20 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-data-warn breathe" />
            <span className="data text-data-warn">OFFLINE — DISPLAYING CACHED DATA</span>
          </div>
        )}
        {geoError && (
          <div className="hud px-3 py-2 border-data-bad/20 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-data-bad" />
            <span className="data text-data-bad">{geoError}</span>
          </div>
        )}
      </div>

      {/* ── LOADING INDICATOR ── */}
      {isLoadingNearby && (
        <div className="absolute top-3 right-3 z-20 hud px-3 py-1.5 flex items-center gap-2">
          <div className="w-2.5 h-2.5 border border-signal border-t-transparent animate-spin" />
          <span className="data text-signal">SCANNING</span>
        </div>
      )}

      {/* ── FLOATING ACTION BUTTONS ── */}
      <div className="absolute bottom-24 right-3 z-10 flex flex-col gap-2">
        <button
          onClick={handleExplore}
          className="btn w-11 h-11 hud flex items-center justify-center text-signal border-signal/20"
          title={cap.shouldSkipAR ? 'Browse' : 'AR Explore'}
        >
          {cap.shouldSkipAR ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
        <button
          onClick={() => navigate('/create')}
          className="btn w-11 h-11 border border-capsule/25 bg-capsule/5 flex items-center justify-center text-capsule"
          title="Create Capsule"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* ── RECOMMEND PANEL ── */}
      <RecommendPanel />
    </div>
  )
}
