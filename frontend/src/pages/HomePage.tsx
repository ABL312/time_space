import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGeolocation } from '../hooks/useGeolocation'
import { useCapsuleStore } from '../stores/capsuleStore'
import { useUserStore } from '../stores/userStore'
import MapView from '../components/MapView'

export default function HomePage() {
  const navigate = useNavigate()
  const { latitude, longitude, error: geoError } = useGeolocation()
  const { user } = useUserStore()
  const { fetchNearby, nearby, recommendedCapsules, otherCapsules, isLoadingNearby } = useCapsuleStore()
  const [isRefreshing, setIsRefreshing] = useState(false)

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

  const handleRefreshNearby = async () => {
    if (latitude && longitude && user) {
      setIsRefreshing(true)
      await fetchNearby({
        lat: latitude,
        lng: longitude,
        radius: 1200,
        user_id: user.id,
      })
      setIsRefreshing(false)
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg">
      {/* Map fills the entire screen */}
      <MapView
        latitude={latitude ?? 31.03}
        longitude={longitude ?? 121.21}
        capsules={[...recommendedCapsules, ...otherCapsules]}
      />

      {/* Bottom panel */}
      <div className="absolute bottom-0 left-0 right-0 glass rounded-t-2xl p-4 pb-8 animate-slide-up">
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
          {recommendedCapsules.length > 0 && (
            <span className="text-xs text-primary-light">
              {recommendedCapsules.length} 个和你相关 ✨
            </span>
          )}
        </div>

        {/* Recommended capsules section */}
        {recommendedCapsules.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center">
              ✨ 和你相关 <span className="ml-1 text-accent">({recommendedCapsules.length})</span>
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {recommendedCapsules.map((capsule) => (
                <div
                  key={capsule.id}
                  onClick={() => navigate(`/capsule/${capsule.id}`)}
                  className="w-full p-3 rounded-lg bg-surface border-l-4 border-accent cursor-pointer hover:bg-surface-light transition-all duration-200"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Emotion tags */}
                      <div className="flex flex-wrap gap-1 mb-1">
                        {capsule.emotion_tags?.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      {/* Message preview */}
                      <p className="text-xs text-white mb-1 line-clamp-2">
                        {capsule.message?.length > 30 
                          ? `${capsule.message.slice(0, 30)}...` 
                          : capsule.message}
                      </p>
                      
                      {/* Match reasons */}
                      {capsule.match_reasons && capsule.match_reasons.length > 0 && (
                        <p className="text-[10px] text-accent italic mb-1">
                          {capsule.match_reasons[0]}
                        </p>
                      )}
                      
                      {/* Footer info */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">
                          {capsule.author?.name || '匿名用户'}
                        </span>
                        {capsule.distance_m != null && (
                          <span className="text-[10px] text-slate-400">
                            {Math.round(capsule.distance_m)}m
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Match score indicator */}
                    {capsule.match_score != null && (
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-8 bg-surface-light rounded-full overflow-hidden">
                          <div 
                            className="bg-accent rounded-full w-full transition-all duration-300"
                            style={{ height: `${capsule.match_score * 100}%` }}
                          />
                        </div>
                        <span className="text-[8px] text-slate-400 mt-0.5">
                          {(capsule.match_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleRefreshNearby}
            disabled={isRefreshing || isLoadingNearby}
            className={`flex-1 py-3 rounded-xl transition-colors text-sm font-medium ${
              isRefreshing || isLoadingNearby
                ? 'bg-surface text-slate-500'
                : 'bg-surface hover:bg-surface-light text-white'
            }`}
          >
            {isRefreshing || isLoadingNearby ? '🔍 探索中...' : '🔍 探索附近'}
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
      {(isLoadingNearby || isRefreshing) && (
        <div className="absolute top-4 right-4 glass rounded-full px-3 py-1.5 text-xs text-slate-300">
          加载中...
        </div>
      )}
    </div>
  )
}
