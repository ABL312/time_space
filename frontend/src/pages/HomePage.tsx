import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGeolocation } from '../hooks/useGeolocation'
import { useCapsuleStore } from '../stores/capsuleStore'
import { useUserStore } from '../stores/userStore'
import MapView from '../components/MapView'

export default function HomePage() {
  const navigate = useNavigate()
  const { latitude, longitude, error: geoError } = useGeolocation()
  const { user } = useUserStore()
  const { fetchNearby, nearby, isLoadingNearby } = useCapsuleStore()

  // Fetch nearby capsules when location is available
  useEffect(() => {
    if (latitude && longitude && user) {
      fetchNearby({
        lat: latitude,
        lng: longitude,
        radius: 1200,
        user_id: user.id,
      })
    }
  }, [latitude, longitude, user, fetchNearby])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg">
      {/* Map fills the entire screen */}
      <MapView
        latitude={latitude ?? 31.03}
        longitude={longitude ?? 121.21}
        capsules={nearby ? [...nearby.recommended, ...nearby.others] : []}
      />

      {/* Bottom panel */}
      <div className="absolute bottom-0 left-0 right-0 glass rounded-t-2xl p-4 pb-8">
        {/* Location context */}
        <div className="mb-3">
          <p className="text-xs text-slate-400">📍 当前位置</p>
          <p className="text-sm text-white font-medium">
            {nearby?.location_context?.name || '获取位置中...'}
          </p>
          {nearby?.location_context?.description && (
            <p className="text-xs text-slate-300 mt-1 line-clamp-2">
              {nearby.location_context.description}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-300">
            附近 <span className="text-accent font-bold">{nearby?.total ?? 0}</span> 个时空胶囊
          </span>
          {nearby && nearby.recommended.length > 0 && (
            <span className="text-xs text-primary-light">
              {nearby.recommended.length} 个和你相关 ✨
            </span>
          )}
        </div>

        {/* Recommended capsules list */}
        {nearby?.recommended && nearby.recommended.length > 0 && (
          <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
            {nearby.recommended.slice(0, 3).map((capsule) => (
              <button
                key={capsule.id}
                onClick={() => navigate(`/capsule/${capsule.id}`)}
                className="w-full text-left p-2 rounded-lg bg-surface/50 hover:bg-surface transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-accent text-lg">✉️</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">
                      {capsule.message?.slice(0, 30)}...
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {capsule.emotion_tags?.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary-light"
                        >
                          {tag}
                        </span>
                      ))}
                      {capsule.distance_m != null && (
                        <span className="text-[10px] text-slate-400">
                          {Math.round(capsule.distance_m)}m
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/ar')}
            className="flex-1 py-3 rounded-xl bg-surface hover:bg-surface-light transition-colors text-sm font-medium"
          >
            🔍 探索附近
          </button>
          <button
            onClick={() => navigate('/create')}
            className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-light transition-colors text-sm font-medium"
          >
            ✏️ 留下胶囊
          </button>
        </div>
      </div>

      {/* GPS error toast */}
      {geoError && (
        <div className="absolute top-4 left-4 right-4 glass rounded-lg p-3 text-xs text-amber-400">
          ⚠️ {geoError}
        </div>
      )}

      {/* Loading indicator */}
      {isLoadingNearby && (
        <div className="absolute top-4 right-4 glass rounded-full px-3 py-1.5 text-xs text-slate-300">
          加载中...
        </div>
      )}
    </div>
  )
}
