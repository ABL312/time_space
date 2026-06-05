import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGeolocation } from '../hooks/useGeolocation'
import { useVirtualLocation } from '../hooks/useVirtualLocation'
import { useCapsuleStore } from '../stores/capsuleStore'
import { useUserStore } from '../stores/userStore'
import { useCapabilityCheck } from '../hooks/useCapabilityCheck'
import { searchApi } from '../lib/api'
import MapView from '../components/MapView'
import RecommendPanel from '../components/RecommendPanel'
import { useProximityAlert } from '../hooks/useProximityAlert'
import ProximityAlert from '../components/ProximityAlert'
import { useAchievements } from '../hooks/useAchievements'
import AchievementPanel from '../components/AchievementPanel'
import DanmakuLayer from '../components/DanmakuLayer'
import type { Capsule } from '../types'

export default function HomePage() {
  const navigate = useNavigate()
  const { latitude, longitude, error: geoError } = useGeolocation()
  const { virtualLocation, setVirtual } = useVirtualLocation()
  const { user, clearUser } = useUserStore()
  const { fetchNearby, nearby, isLoadingNearby } = useCapsuleStore()
  const cap = useCapabilityCheck()
  const { achievements } = useAchievements()
  const [isAchievementPanelOpen, setIsAchievementPanelOpen] = useState(false)
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Capsule[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  
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

  const handleSearch = async () => {
    if (!searchQuery.trim() && !selectedTag) return
    
    setIsSearching(true)
    setSearchError(null)
    
    try {
      const params: any = {}
      if (searchQuery.trim()) params.q = searchQuery.trim()
      if (selectedTag) params.tag = selectedTag
      if (effectiveLatitude && effectiveLongitude) {
        params.lat = effectiveLatitude
        params.lng = effectiveLongitude
        params.radius = radius
      }
      
      const results = await searchApi.search(params)
      setSearchResults(results)
    } catch (err: any) {
      setSearchError(err.message || '搜索失败')
      console.error('Search error:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSelectedTag(null)
    setSearchResults([])
    setSearchError(null)
  }

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
      {searchResults.length === 0 && (
        <MapView
          latitude={effectiveLatitude ?? 31.0282}
          longitude={effectiveLongitude ?? 121.4346}
          capsules={nearby ? [...nearby.recommended, ...nearby.others] : []}
        />
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="absolute inset-0 pt-24 pb-24 px-3 z-10 overflow-y-auto">
          <div className="space-y-3">
            {searchResults.map((capsule) => (
              <div 
                key={capsule.id}
                onClick={() => navigate(`/capsule/${capsule.id}`)}
                className="panel p-4 cursor-pointer hover:border-signal/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white truncate">
                        {capsule.author?.name || '匿名发送者'}
                      </span>
                      <span className="data text-xs">
                        {capsule.distance_m != null ? (
                          `${capsule.distance_m < 1000 ? `${Math.round(capsule.distance_m)}m` : `${(capsule.distance_m / 1000).toFixed(1)}km`}`
                        ) : (
                          '未知距离'
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-2">
                      {capsule.message}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {capsule.emotion_tags?.slice(0, 3).map((tag) => (
                        <span 
                          key={tag}
                          className="px-1.5 py-0.5 text-xs font-mono border border-primary/20 text-primary-light bg-primary/5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  {capsule.media && capsule.media.length > 0 && (
                    <div className="w-16 h-16 border border-border flex-shrink-0">
                      <img 
                        src={capsule.media[0].thumbnail_url || capsule.media[0].url} 
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danmaku Layer */}
      <DanmakuLayer />

      {/* ── TOP HUD OVERLAY ── */}
      <div className="absolute top-3 left-3 right-3 z-20 space-y-2">
        {/* Search bar */}
        <div className="hud p-2 flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索胶囊..."
            className="flex-1 bg-transparent border-none text-white placeholder-slate-500 focus:outline-none text-sm"
          />
          {searchQuery || selectedTag || searchResults.length > 0 ? (
            <button 
              onClick={clearSearch}
              className="btn w-6 h-6 flex items-center justify-center text-slate-400 hover:text-signal"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button 
              onClick={handleSearch}
              disabled={isSearching || (!searchQuery.trim() && !selectedTag)}
              className="btn w-6 h-6 flex items-center justify-center text-slate-400 hover:text-signal disabled:opacity-50"
            >
              {isSearching ? (
                <div className="w-4 h-4 border border-signal border-t-transparent animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              )}
            </button>
          )}
        </div>
        
        {/* Search error */}
        {searchError && (
          <div className="hud px-3 py-2 border-data-bad/20 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-data-bad" />
            <span className="data text-data-bad">{searchError}</span>
          </div>
        )}
        
        {/* Tag filters */}
        {searchResults.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {['怀旧', '温暖', '感恩', '浪漫', '思念', '快乐', '遗憾', '鼓励'].map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setSelectedTag(selectedTag === tag ? null : tag)
                  setTimeout(handleSearch, 0)
                }}
                className={`btn flex-shrink-0 px-2.5 py-1 text-xs border transition-all ${
                  selectedTag === tag
                    ? 'border-primary/40 bg-primary/5 text-primary-light'
                    : 'border-border text-slate-400 hover:text-slate-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
        
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
          onClick={() => navigate('/favorites')}
          className="btn hud px-2.5 py-1.5 flex items-center gap-1.5 text-slate-400 hover:text-red-400 transition-colors"
          title="我的收藏"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          <span className="data">收藏</span>
        </button>
        <button
          onClick={() => setIsAchievementPanelOpen(true)}
          className="btn hud px-2.5 py-1.5 flex items-center gap-1.5 text-slate-400 hover:text-yellow-300 transition-colors"
          title="成就系统"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
          <span className="data">成就</span>
        </button>
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

      {/* ── ACHIEVEMENT PANEL ── */}
      <AchievementPanel 
        achievements={achievements} 
        isOpen={isAchievementPanelOpen} 
        onClose={() => setIsAchievementPanelOpen(false)} 
      />
    </div>
  )
}
