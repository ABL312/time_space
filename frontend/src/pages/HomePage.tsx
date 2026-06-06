import { useEffect, useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGeolocation } from '../hooks/useGeolocation'
import { useVirtualLocation } from '../hooks/useVirtualLocation'
import { useCapsuleStore } from '../stores/capsuleStore'
import { useUserStore } from '../stores/userStore'
import { useCapabilityCheck } from '../hooks/useCapabilityCheck'
import { searchApi, dailyApi, getErrorMessage } from '../lib/api'
import { useProximityAlert } from '../hooks/useProximityAlert'
import ProximityAlert from '../components/ProximityAlert'
import { useAchievements } from '../hooks/useAchievements'
import AchievementPanel from '../components/AchievementPanel'
import DanmakuLayer from '../components/DanmakuLayer'
import { Card, Badge, Button, Input, BottomSheet } from '../components/ui'
import type { Capsule } from '../types'

const MapView = lazy(() => import('../components/MapView'))
const RecommendPanel = lazy(() => import('../components/RecommendPanel'))

export default function HomePage() {
  const navigate = useNavigate()
  const { latitude, longitude, error: geoError, locationSource } = useGeolocation()
  const { virtualLocation, setVirtual } = useVirtualLocation()
  const { user, clearUser } = useUserStore()
  const { fetchNearby, nearby, isLoadingNearby } = useCapsuleStore()
  const cap = useCapabilityCheck()
  const { achievements } = useAchievements()
  const [isAchievementPanelOpen, setIsAchievementPanelOpen] = useState(false)
  
  // Daily recommendation
  const [dailyRecommendation, setDailyRecommendation] = useState<Capsule | null>(null)
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Capsule[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  const effectiveLatitude = virtualLocation?.lat ?? latitude ?? 31.0282
  const effectiveLongitude = virtualLocation?.lng ?? longitude ?? 121.4346
  
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
      const params: { q?: string; tag?: string; lat?: number; lng?: number; radius?: number } = {}
      if (searchQuery.trim()) params.q = searchQuery.trim()
      if (selectedTag) params.tag = selectedTag
      if (effectiveLatitude && effectiveLongitude) {
        params.lat = effectiveLatitude
        params.lng = effectiveLongitude
        params.radius = radius
      }
      
      const results = await searchApi.search(params)
      setSearchResults(results.capsules)
    } catch (err: unknown) {
      setSearchError(getErrorMessage(err, '搜索失败'))
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

  useEffect(() => {
    dailyApi.getRecommend()
      .then((data) => {
        setDailyRecommendation(data.capsule)
      })
      .catch((err) => {
        console.error('Failed to fetch daily recommendation:', err)
      })
  }, [])

  const handleExplore = () => {
    if (cap.shouldSkipAR) {
      const first = nearby?.recommended[0] || nearby?.others[0]
      if (first) navigate(`/capsule/${first.id}`)
    } else {
      navigate(`/ar${window.location.search}`)
    }
  }

  const formatDistance = (m: number | null | undefined) => {
    if (m == null) return '未知距离'
    return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-void">
      {/* Map */}
      {searchResults.length === 0 && (
        <Suspense fallback={<div className="absolute inset-0 bg-void" />}>
          <MapView
            latitude={effectiveLatitude ?? 31.0282}
            longitude={effectiveLongitude ?? 121.4346}
            capsules={nearby ? [...nearby.recommended, ...nearby.others] : []}
          />
        </Suspense>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="absolute inset-0 pt-24 pb-24 px-3 z-10 overflow-y-auto">
          <div className="space-y-3">
            {searchResults.map((capsule) => (
              <Card
                key={capsule.id}
                variant="hud"
                padding="md"
                interactive
                onClick={() => navigate(`/capsule/${capsule.id}`)}
                className="hover:border-signal/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white truncate">
                        {capsule.author?.name || '匿名发送者'}
                      </span>
                      <span className="text-xs text-text-tertiary font-mono">
                        {formatDistance(capsule.distance_m)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-2">
                      {capsule.message}
                    </p>
                    {capsule.emotion_tags && capsule.emotion_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {capsule.emotion_tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="signal">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {capsule.media && capsule.media.length > 0 && (
                    <div className="w-16 h-16 border border-border flex-shrink-0 rounded-[var(--radius-sm)] overflow-hidden">
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
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Danmaku Layer */}
      <DanmakuLayer />

      {/* ── TOP HUD OVERLAY ── */}
      <div className="absolute top-3 left-3 right-[4.5rem] sm:right-auto sm:w-[min(28rem,calc(100vw-1.5rem))] z-[1000] space-y-2">
        {/* Search bar */}
        <Card variant="hud" padding="sm" className="flex items-center gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索胶囊..."
            className="flex-1 !border-none !bg-transparent !p-0 text-sm"
          />
          {searchQuery || selectedTag || searchResults.length > 0 ? (
            <Button variant="icon" size="icon-sm" onClick={clearSearch}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          ) : (
            <Button
              variant="icon"
              size="icon-sm"
              onClick={handleSearch}
              disabled={isSearching || (!searchQuery.trim() && !selectedTag)}
            >
              {isSearching ? (
                <span className="w-4 h-4 border border-signal border-t-transparent animate-spin rounded-full" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              )}
            </Button>
          )}
        </Card>
          
        {/* Daily Recommendation Card */}
        {dailyRecommendation && !searchResults.length && (
          <Card
            variant="hud"
            padding="md"
            interactive
            onClick={() => navigate(`/capsule/${dailyRecommendation.id}`)}
            className="hover:border-signal/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="signal" dot>今日推荐</Badge>
            </div>
            <p className="text-sm text-white mb-2 line-clamp-2">
              {dailyRecommendation.message?.substring(0, 30)}{dailyRecommendation.message && dailyRecommendation.message.length > 30 ? '...' : ''}
            </p>
            {dailyRecommendation.emotion_tags && dailyRecommendation.emotion_tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {dailyRecommendation.emotion_tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="signal">{tag}</Badge>
                ))}
              </div>
            )}
          </Card>
        )}
        
        {/* Search error */}
        {searchError && (
          <Card variant="hud" padding="sm" className="border-data-bad/20 flex items-center gap-2">
            <Badge variant="error" dot>{searchError}</Badge>
          </Card>
        )}
        
        {/* Tag filters */}
        {searchResults.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {['怀旧', '温暖', '感恩', '浪漫', '思念', '快乐', '遗憾', '鼓励'].map((tag) => (
              <Button
                key={tag}
                variant={selectedTag === tag ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => {
                  setSelectedTag(selectedTag === tag ? null : tag)
                  setTimeout(handleSearch, 0)
                }}
                className={`flex-shrink-0 ${selectedTag === tag ? '' : 'border border-border'}`}
              >
                {tag}
              </Button>
            ))}
          </div>
        )}
        
        {/* Coordinate readout */}
        {effectiveLatitude && effectiveLongitude && (
          <Card variant="hud" padding="sm" className="inline-flex items-center gap-3">
            <div className={`w-1.5 h-1.5 rounded-full ${cap.isOnline ? 'bg-data-good breathe' : 'bg-data-bad'}`} />
            <span className="text-xs font-mono text-text-secondary">
              {effectiveLatitude.toFixed(4)}°N <span className="text-text-muted">/</span> {effectiveLongitude.toFixed(4)}°E
            </span>
            {virtualLocation && <Badge variant="warning">VIRTUAL LOCATION</Badge>}
            {locationSource === 'ip' && <Badge variant="warning">IP定位 ≈5km</Badge>}
            {cap.useExpandedGPS && <Badge variant="warning">GPS DEGRADED</Badge>}
          </Card>
        )}

        {/* Warning banners */}
        {!cap.isOnline && (
          <Card variant="hud" padding="sm" className="border-data-warn/20 flex items-center gap-2">
            <Badge variant="warning" dot>OFFLINE — DISPLAYING CACHED DATA</Badge>
          </Card>
        )}
        {geoError && (
          <Card variant="hud" padding="sm" className={`flex items-center gap-2 ${geoError.includes('正在') ? 'border-data-warn/20' : 'border-data-bad/20'}`}>
            <Badge variant={geoError.includes('正在') ? 'warning' : 'error'} dot>
              {geoError}
            </Badge>
            {!geoError.includes('正在') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const lat = prompt('输入纬度 (例如: 31.0282)', '31.0282')
                  const lng = prompt('输入经度 (例如: 121.4346)', '121.4346')
                  if (lat && lng) {
                    setVirtual(parseFloat(lat), parseFloat(lng))
                  }
                }}
                className="text-signal border border-signal/20"
              >
                手动设置
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* ── TOP-RIGHT: Loading + Actions ── */}
      <div className="absolute top-3 right-3 z-[1001] flex items-center gap-2">
        {isLoadingNearby && (
          <Card variant="hud" padding="sm" className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 border border-signal border-t-transparent animate-spin rounded-full" />
            <span className="text-xs font-mono text-signal">SCANNING</span>
          </Card>
        )}
        {/* Desktop: show all buttons; Mobile: show hamburger */}
        <div className="hidden sm:flex items-center gap-2">
          <Button variant="icon" size="icon-md" onClick={() => navigate('/profile')} title="个人主页" className="hud">
            <div className="w-5 h-5 border border-signal-dim/30 flex items-center justify-center bg-signal/5 rounded">
              <span className="text-xs font-semibold text-signal font-mono">
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
          </Button>
          <Button variant="icon" size="icon-md" onClick={() => navigate('/collections')} title="胶囊合集" className="hud text-slate-400 hover:text-purple-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </Button>
          <Button variant="icon" size="icon-md" onClick={() => navigate('/favorites')} title="我的收藏" className="hud text-slate-400 hover:text-red-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </Button>
          <Button variant="icon" size="icon-md" onClick={() => setIsAchievementPanelOpen(true)} title="成就系统" className="hud text-slate-400 hover:text-yellow-300">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </Button>
          <Button variant="icon" size="icon-md" onClick={() => navigate('/mine')} title="我的胶囊" className="hud text-slate-400 hover:text-capsule">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </Button>
          <Button variant="icon" size="icon-md" onClick={clearUser} title={`退出 ${user?.name || ''}`} className="hud text-slate-400 hover:text-signal">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </Button>
        </div>
        {/* Mobile hamburger */}
        <Button variant="icon" size="icon-md" onClick={() => setIsMenuOpen(true)} title="菜单" className="hud sm:hidden">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </Button>
      </div>

      {/* ── FLOATING ACTION BUTTONS ── */}
      <div className="absolute bottom-24 right-3 z-[1000] flex flex-col gap-2">
        <Button
          variant="icon"
          size="icon-md"
          onClick={handleExplore}
          className="hud border border-signal/20 text-signal"
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
        </Button>
        <Button
          variant="icon"
          size="icon-md"
          onClick={() => navigate('/create')}
          className="border border-capsule/25 bg-capsule/5 text-capsule"
          title="Create Capsule"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </Button>
        <Button
          variant="icon"
          size="icon-md"
          onClick={() => {
            const lat = prompt('输入纬度 (例如: 31.0282)', '31.0282')
            const lng = prompt('输入经度 (例如: 121.4346)', '121.4346')
            if (lat && lng) {
              setVirtual(parseFloat(lat), parseFloat(lng))
            }
          }}
          className="border border-data-warn/25 bg-data-warn/5 text-data-warn"
          title="Set Virtual Location"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
          </svg>
        </Button>
      </div>

      {/* ── RECOMMEND PANEL ── */}
      <Suspense fallback={null}>
        <RecommendPanel />
      </Suspense>
      
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

      {/* ── MOBILE NAV MENU (BottomSheet) ── */}
      <BottomSheet isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} title="NAVIGATION">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: '个人主页', path: '/profile', color: 'text-signal', icon: user?.name?.charAt(0)?.toUpperCase() || '?' },
            { label: '胶囊合集', path: '/collections', color: 'text-purple-400', icon: '📚' },
            { label: '我的收藏', path: '/favorites', color: 'text-red-400', icon: '♥' },
            { label: '成就系统', action: () => { setIsMenuOpen(false); setIsAchievementPanelOpen(true) }, color: 'text-yellow-300', icon: '★' },
            { label: '我的胶囊', path: '/mine', color: 'text-capsule', icon: '✉' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                if (item.action) { item.action(); return }
                setIsMenuOpen(false)
                if (item.path) navigate(item.path)
              }}
              className="flex flex-col items-center gap-2 p-4 rounded-[var(--radius-md)] border border-border hover:border-border-active hover:bg-surface-light/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal/50"
            >
              <span className={`text-lg ${item.color}`}>{item.icon}</span>
              <span className="text-xs font-mono tracking-wider text-text-secondary">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => { setIsMenuOpen(false); clearUser() }}
            className="flex flex-col items-center gap-2 p-4 rounded-[var(--radius-md)] border border-data-bad/20 hover:bg-data-bad/5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal/50"
          >
            <span className="text-lg text-data-bad">⏻</span>
            <span className="text-xs font-mono tracking-wider text-data-bad">退出登录</span>
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
