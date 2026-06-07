import { useEffect, useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGeolocation } from '../hooks/useGeolocation'
import { useVirtualLocation } from '../hooks/useVirtualLocation'
import { useCapsuleStore } from '../stores/capsuleStore'
import { useUserStore } from '../stores/userStore'
import { useCapabilityCheck } from '../hooks/useCapabilityCheck'
import { searchApi, dailyApi } from '../lib/api'
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
  const [showDaily, setShowDaily] = useState(true)
  const [dismissGPSWarning, setDismissGPSWarning] = useState(false)
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Capsule[]>([])
  const [isSearching, setIsSearching] = useState(false)
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
      console.error('Search error:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSelectedTag(null)
    setSearchResults([])
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
    return m < 1000 ? `${Math.round(m)}米` : `${(m / 1000).toFixed(1)}公里`
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
        <div className="absolute inset-0 pt-28 pb-24 px-4 z-10 overflow-y-auto bg-bg/90 backdrop-blur-sm">
          <div className="max-w-lg mx-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-primary/10">
              <h2 className="text-lg font-serif font-bold text-text-primary">搜索到 {searchResults.length} 封信件</h2>
              <Button variant="ghost" size="sm" onClick={clearSearch} className="text-primary font-serif">返回地图</Button>
            </div>
            {searchResults.map((capsule) => (
              <Card
                key={capsule.id}
                padding="md"
                interactive
                onClick={() => navigate(`/capsule/${capsule.id}`)}
                className="border-primary/10 hover:border-primary/30 transition-colors bg-bg shadow-sm rounded-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-serif font-bold text-text-primary truncate">
                        {capsule.author?.name || '匿名信使'}
                      </span>
                      <span className="text-xs text-text-muted font-serif">
                        📍 {formatDistance(capsule.distance_m)}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed font-serif">
                      {capsule.message}
                    </p>
                    {capsule.emotion_tags && capsule.emotion_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {capsule.emotion_tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[10px] font-serif text-primary border border-primary/10 bg-primary/5 px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {capsule.media && capsule.media.length > 0 && (
                    <div className="w-16 h-16 border border-primary/10 flex-shrink-0 rounded-md overflow-hidden bg-primary/5 shadow-sm">
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

      {/* ── TOP FLOATING NAVIGATION HUD ── */}
      <div className="absolute top-4 left-4 right-4 sm:right-auto sm:w-[26rem] z-[1000] space-y-2">
        {/* Search bar card */}
        <Card padding="sm" className="flex items-center gap-3 bg-bg/95 border border-primary/20 shadow-md rounded-lg backdrop-blur-sm">
          {/* Hamburger menu for mobile */}
          <button 
            onClick={() => setIsMenuOpen(true)} 
            className="p-1 hover:bg-surface rounded-full text-primary sm:hidden cursor-pointer"
            aria-label="打开菜单"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索时空信件或情感标签..."
            className="flex-1 !border-none !bg-transparent !p-0 text-sm font-serif text-text-primary placeholder-text-muted focus:ring-0"
          />
          
          {searchQuery || selectedTag || searchResults.length > 0 ? (
            <Button variant="icon" size="icon-sm" onClick={clearSearch} className="text-text-muted hover:text-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          ) : (
            <Button
              variant="icon"
              size="icon-sm"
              onClick={handleSearch}
              disabled={isSearching || (!searchQuery.trim() && !selectedTag)}
              className="text-primary disabled:text-text-muted"
            >
              {isSearching ? (
                <span className="w-4 h-4 border-2 border-primary border-t-transparent animate-spin rounded-full" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              )}
            </Button>
          )}
        </Card>

        {/* Tag filters under search bar (shown only in search results mode) */}
        {searchResults.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
            {['怀旧', '温暖', '感恩', '浪漫', '思念', '快乐', '遗憾', '鼓励'].map((tag) => (
              <Button
                key={tag}
                variant={selectedTag === tag ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => {
                  setSelectedTag(selectedTag === tag ? null : tag)
                  setTimeout(handleSearch, 0)
                }}
                className={`flex-shrink-0 font-serif text-xs rounded-full border border-primary/20 ${selectedTag === tag ? 'bg-primary text-white' : 'bg-bg text-text-secondary hover:bg-surface'}`}
              >
                {tag}
              </Button>
            ))}
          </div>
        )}

        {/* Unified Status Pill row */}
        <div className="flex flex-wrap gap-1.5 items-center z-[1000]">
          {effectiveLatitude && effectiveLongitude && (
            <div className="px-2.5 py-1 text-[10px] font-serif rounded-full bg-bg/95 border border-primary/10 shadow-sm text-text-secondary flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${cap.isOnline ? 'bg-data-good animate-pulse' : 'bg-data-bad'}`} />
              <span>{effectiveLatitude.toFixed(4)}°N, {effectiveLongitude.toFixed(4)}°E</span>
              {virtualLocation && <span className="px-1.5 py-0.2 bg-primary/10 text-primary rounded text-[9px] font-bold">漫游模式</span>}
              {locationSource === 'ip' && <span className="px-1.5 py-0.2 bg-primary/10 text-primary rounded text-[9px] font-bold">IP定位</span>}
              {cap.useExpandedGPS && <span className="px-1.5 py-0.2 bg-data-warn/10 text-data-warn rounded text-[9px] font-bold">定位偏弱</span>}
            </div>
          )}

          {isLoadingNearby && (
            <div className="px-2.5 py-1 text-[10px] font-serif rounded-full bg-bg/95 border border-primary/10 shadow-sm text-primary flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
              <span>正在寻信...</span>
            </div>
          )}

          {!cap.isOnline && (
            <div className="px-2.5 py-1 text-[10px] font-serif rounded-full bg-data-warn/10 border border-data-warn/25 shadow-sm text-data-warn">
              离线模式 (显示缓存信件)
            </div>
          )}

          {geoError && (
            <div className={`px-2.5 py-1 text-[10px] font-serif rounded-full bg-bg/95 border shadow-sm flex items-center gap-1.5 ${geoError.includes('正在') ? 'border-data-warn/20 text-data-warn' : 'border-data-bad/20 text-data-bad'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${geoError.includes('正在') ? 'bg-data-warn' : 'bg-data-bad'}`} />
              <span>{geoError}</span>
              {!geoError.includes('正在') && (
                <button
                  onClick={() => {
                    const lat = prompt('输入纬度 (例如: 31.0282)', '31.0282')
                    const lng = prompt('输入经度 (例如: 121.4346)', '121.4346')
                    if (lat && lng) {
                      setVirtual(parseFloat(lat), parseFloat(lng))
                    }
                  }}
                  className="px-1 border border-primary/20 text-primary rounded text-[9px] hover:bg-primary/5 cursor-pointer"
                >
                  手动定位
                </button>
              )}
            </div>
          )}
        </div>

        {/* GPS Warning Card inside HUD */}
        {locationSource === 'ip' && !dismissGPSWarning && (
          <Card padding="sm" className="border-amber-500/20 bg-amber-500/5 flex items-start gap-2 rounded-lg max-w-sm relative z-[1000]">
            <span className="text-sm">📍</span>
            <div className="flex-1">
              <p className="text-xs font-serif font-bold text-amber-700">建议开启 GPS 定位</p>
              <p className="text-[10px] text-amber-600 font-serif mt-0.5 leading-relaxed">
                当前正使用近似的 IP 定位。请开启手机 GPS 并使用安全的 HTTPS 连接访问，以获取精准的附近来信。
              </p>
            </div>
            <button onClick={() => setDismissGPSWarning(true)} className="text-amber-500 hover:text-amber-700 text-xs font-bold px-1 cursor-pointer">
              ×
            </button>
          </Card>
        )}

        {/* Daily Recommendation Float Panel */}
        {dailyRecommendation && !searchResults.length && showDaily && (
          <Card
            padding="md"
            interactive
            onClick={() => navigate(`/capsule/${dailyRecommendation.id}`)}
            className="relative hover:border-primary/40 transition-colors border-primary/10 bg-bg/90 backdrop-blur-sm shadow-md rounded-lg max-w-sm"
          >
            <button 
              onClick={(e) => { e.stopPropagation(); setShowDaily(false) }} 
              className="absolute top-2 right-2 text-text-muted hover:text-primary text-xs px-1 cursor-pointer"
              title="关闭推荐"
            >
              ×
            </button>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="signal" className="font-serif">💌 今日推荐来信</Badge>
            </div>
            <p className="text-xs text-text-secondary font-serif leading-relaxed line-clamp-2">
              “{dailyRecommendation.message}”
            </p>
            {dailyRecommendation.emotion_tags && dailyRecommendation.emotion_tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {dailyRecommendation.emotion_tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="text-[9px] font-serif text-primary border border-primary/10 bg-primary/5 px-1.5 py-0.2 rounded">{tag}</span>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ── TOP-RIGHT DESKTOP ACTIONS ── */}
      <div className="hidden sm:flex absolute top-4 right-4 z-[1000] items-center gap-3">
        <Button variant="icon" size="icon-md" onClick={() => navigate('/profile')} title="个人中心" className="hud bg-bg/95 border border-primary/20 text-primary rounded-full hover:bg-surface shadow-sm">
          <div className="w-5 h-5 flex items-center justify-center bg-primary/10 rounded-full">
            <span className="text-xs font-bold text-primary font-serif">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
        </Button>
        <Button variant="icon" size="icon-md" onClick={() => navigate('/collections')} title="合集整理" className="hud bg-bg/95 border border-primary/20 text-primary rounded-full hover:bg-surface shadow-sm">
          📚
        </Button>
        <Button variant="icon" size="icon-md" onClick={() => navigate('/favorites')} title="我的收藏" className="hud bg-bg/95 border border-primary/20 text-primary rounded-full hover:bg-surface shadow-sm">
          ❤️
        </Button>
        <Button variant="icon" size="icon-md" onClick={() => setIsAchievementPanelOpen(true)} title="时光勋章" className="hud bg-bg/95 border border-primary/20 text-primary rounded-full hover:bg-surface shadow-sm">
          🏅
        </Button>
        <Button variant="icon" size="icon-md" onClick={() => navigate('/mine')} title="我的信箱" className="hud bg-bg/95 border border-primary/20 text-primary rounded-full hover:bg-surface shadow-sm">
          ✉️
        </Button>
        <Button variant="icon" size="icon-md" onClick={clearUser} title={`退出登录 (${user?.name || ''})`} className="hud bg-bg/95 border border-primary/20 text-primary rounded-full hover:bg-surface shadow-sm">
          🚪
        </Button>
      </div>

      {/* ── FLOATING ACTION BUTTONS (Lower-middle-right to avoid overlaps) ── */}
      <div className="absolute right-4 bottom-32 sm:bottom-28 z-[1001] flex flex-col gap-3">
        {/* AR Explore Button */}
        <Button
          variant="icon"
          size="icon-lg"
          onClick={handleExplore}
          className="bg-primary hover:bg-primary-dark border border-primary/20 text-white rounded-full shadow-lg flex items-center justify-center w-12 h-12 transition-transform active:scale-95"
          title={cap.shouldSkipAR ? '寻找信件' : '开启AR空间'}
        >
          {cap.shouldSkipAR ? (
            <span className="text-xl">📁</span>
          ) : (
            <span className="text-xl">👁️</span>
          )}
        </Button>
        
        {/* Create Capsule Button */}
        <Button
          variant="icon"
          size="icon-lg"
          onClick={() => navigate('/create')}
          className="bg-capsule hover:bg-capsule-dim border border-capsule/20 text-white rounded-full shadow-lg flex items-center justify-center w-12 h-12 transition-transform active:scale-95"
          title="写信留念"
        >
          <span className="text-xl">✍️</span>
        </Button>
        
        {/* Roaming Mode Button */}
        <Button
          variant="icon"
          size="icon-lg"
          onClick={() => {
            const lat = prompt('输入纬度 (例如: 31.0282)', '31.0282')
            const lng = prompt('输入经度 (例如: 121.4346)', '121.4346')
            if (lat && lng) {
              setVirtual(parseFloat(lat), parseFloat(lng))
            }
          }}
          className="bg-surface hover:bg-surface-light border border-primary/20 text-primary rounded-full shadow-lg flex items-center justify-center w-12 h-12 transition-transform active:scale-95"
          title="漫游模拟定位"
        >
          <span className="text-xl">🧭</span>
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
      <BottomSheet isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} title="时光菜单">
        <div className="grid grid-cols-2 gap-3 p-2">
          {[
            { label: '个人中心', path: '/profile', color: 'text-primary', icon: '👤' },
            { label: '合集整理', path: '/collections', color: 'text-primary', icon: '📚' },
            { label: '我的收藏', path: '/favorites', color: 'text-primary', icon: '❤️' },
            { label: '时光勋章', action: () => { setIsMenuOpen(false); setIsAchievementPanelOpen(true) }, color: 'text-primary', icon: '🏅' },
            { label: '我的信箱', path: '/mine', color: 'text-primary', icon: '✉️' },
            { label: cap.shouldSkipAR ? '寻找信件' : '开启AR空间', action: () => { setIsMenuOpen(false); handleExplore() }, color: 'text-primary', icon: cap.shouldSkipAR ? '📁' : '👁️' },
            { label: '写信留念', path: '/create', color: 'text-primary', icon: '✍️' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                if (item.action) { item.action(); return }
                setIsMenuOpen(false)
                if (item.path) navigate(item.path)
              }}
              className="flex flex-col items-center justify-center gap-2 p-5 rounded-lg border border-primary/10 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer font-serif text-text-primary"
            >
              <span className={`text-2xl ${item.color}`}>{item.icon}</span>
              <span className="text-xs font-bold">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => { setIsMenuOpen(false); clearUser() }}
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-lg border border-red-500/10 hover:bg-red-500/5 transition-all cursor-pointer font-serif text-red-500"
          >
            <span className="text-2xl">🚪</span>
            <span className="text-xs font-bold">退出登录</span>
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
