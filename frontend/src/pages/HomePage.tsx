import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGeolocation } from '../hooks/useGeolocation'
import { useVirtualLocation } from '../hooks/useVirtualLocation'
import { useCapsuleStore } from '../stores/capsuleStore'
import { useUserStore } from '../stores/userStore'
import { useCapabilityCheck } from '../hooks/useCapabilityCheck'
import MapView from '../components/MapView'
import RecommendPanel from '../components/RecommendPanel'
import { useProximityAlert } from '../hooks/useProximityAlert'
import ProximityAlert from '../components/ProximityAlert'

export default function HomePage() {
  const navigate = useNavigate()
  const { latitude, longitude, error: geoError } = useGeolocation()
  const { virtualLocation, setVirtual } = useVirtualLocation()
  const { user, clearUser } = useUserStore()
  const { fetchNearby, nearby, isLoadingNearby } = useCapsuleStore()
  const cap = useCapabilityCheck()
  
  // 优先使用虚拟位置，否则使用真实位置，最后使用默认演示位置
  const effectiveLatitude = virtualLocation?.lat ?? latitude ?? 31.0282
  const effectiveLongitude = virtualLocation?.lng ?? longitude ?? 121.4346
  
  // Proximity alert hook
  const { triggeredCapsule, distance, dismiss } = useProximityAlert({
    userLat: effectiveLatitude,
    userLng: effectiveLongitude,
    nearbyCapsules: nearby ? [...nearby.recommended, ...nearby.others] : []
  })

  const radius = cap.useExpandedGPS ? 5000 : 1200

  useEffect(() => {
    if (effectiveLatitude && effectiveLongitude && user) {
      fetchNearby({ lat: effectiveLatitude, lng: effectiveLongitude, radius, user_id: user.id })
    }
  }, [effectiveLatitude, effectiveLongitude, user, fetchNearby, radius])

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
        latitude={effectiveLatitude ?? 31.0282}
        longitude={effectiveLongitude ?? 121.4346}
        capsules={nearby ? [...nearby.recommended, ...nearby.others] : []}
      />

      {/* ── TOP HUD OVERLAY ── */}
      <div className="absolute top-3 left-3 right-3 z-20 space-y-2">
        {/* Coordinate readout */}
        {effectiveLatitude && effectiveLongitude && (
          <div className="hud px-3 py-2 inline-flex items-center gap-3">
            <div className={`w-1.5 h-1.5 ${cap.isOnline ? 'bg-data-good breathe' : 'bg-data-bad'}`} />
            <span className="data">
              {effectiveLatitude.toFixed(4)}°N <span className="text-slate-600">/</span> {effectiveLongitude.toFixed(4)}°E
            </span>
            {virtualLocation && (
              <span className="data text-data-warn border border-data-warn/30 px-1.5 py-0.5">
                VIRTUAL LOCATION
              </span>
            )}
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

      {/* ── TOP-RIGHT: Loading + Logout ── */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        {isLoadingNearby && (
          <div className="hud px-3 py-1.5 flex items-center gap-2">
            <div className="w-2.5 h-2.5 border border-signal border-t-transparent animate-spin" />
            <span className="data text-signal">SCANNING</span>
          </div>
        )}
        <button
          onClick={() => navigate('/mine')}
          className="btn hud px-2.5 py-1.5 flex items-center gap-1.5 text-slate-400 hover:text-capsule transition-colors"
          title="我的胶囊"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          <span className="data">MINE</span>
        </button>
        <button
          onClick={clearUser}
          className="btn hud px-2.5 py-1.5 flex items-center gap-1.5 text-slate-400 hover:text-signal transition-colors"
          title={`退出 ${user?.name || ''}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          <span className="data">{user?.name?.slice(0, 6) || 'EXIT'}</span>
        </button>
      </div>

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
        {/* 虚拟定位设置按钮 */}
        <button
          onClick={() => {
            const lat = prompt('输入纬度 (例如: 31.0282)', '31.0282')
            const lng = prompt('输入经度 (例如: 121.4346)', '121.4346')
            if (lat && lng) {
              setVirtual(parseFloat(lat), parseFloat(lng))
            }
          }}
          className="btn w-11 h-11 border border-data-warn/25 bg-data-warn/5 flex items-center justify-center text-data-warn"
          title="Set Virtual Location"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
          </svg>
        </button>
      </div>

      {/* ── RECOMMEND PANEL ── */}
      <RecommendPanel />
      
      {/* ── PROXIMITY ALERT ── */}
      {triggeredCapsule && distance !== null && (
        <ProximityAlert
          capsule={triggeredCapsule}
          distance={distance}
          onDismiss={dismiss}
          onView={() => navigate(`/capsule/${triggeredCapsule.id}`)}
        />
      )}
    </div>
  )
}
