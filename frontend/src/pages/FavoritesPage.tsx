import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { favoritesApi } from '../lib/api'
import { useUserStore } from '../stores/userStore'
import type { FavoriteCapsule } from '../types'

export default function FavoritesPage() {
  const navigate = useNavigate()
  const { user } = useUserStore()
  const [favorites, setFavorites] = useState<FavoriteCapsule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const fetchFavorites = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await favoritesApi.list(user.id)
        setFavorites(data)
      } catch (err: any) {
        setError(err.message || '获取收藏失败')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFavorites()
  }, [user])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return '今天'
    if (diffInDays === 1) return '昨天'
    if (diffInDays < 7) return `${diffInDays}天前`
    return date.toLocaleDateString('zh-CN')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <p className="data text-data-bad">请先登录</p>
          <button 
            onClick={() => navigate('/onboarding')}
            className="btn mt-4 px-4 py-2 border border-signal/30 text-signal text-sm"
          >
            去登录
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg page-in">
      {/* Header */}
      <header className="sticky top-0 z-30 hud px-4 py-3 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)} 
          className="btn flex items-center gap-2 text-slate-400 hover:text-signal transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <span className="text-xs font-mono tracking-wider">RETURN</span>
        </button>
        <span className="label">我的收藏</span>
        <div className="w-16" />
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 pb-28">
        <div className="label mb-4 flex items-center gap-2">
          <span className="inline-block w-2 h-px bg-signal-dim" />
          FAVORITES [{favorites.length}]
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border border-signal border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <div className="panel p-4 text-center">
            <p className="data text-data-bad">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="btn mt-3 px-3 py-1.5 border border-signal/30 text-signal text-xs"
            >
              重新加载
            </button>
          </div>
        ) : favorites.length === 0 ? (
          <div className="panel p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 text-slate-600">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </div>
            <p className="text-slate-500">暂无收藏</p>
            <button 
              onClick={() => navigate('/')}
              className="btn mt-4 px-4 py-2 border border-surface-light text-slate-400 text-sm"
            >
              去发现胶囊
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {favorites.map((fav) => {
              const c = fav.capsule
              return (
                <div 
                  key={fav.id}
                  onClick={() => navigate(`/capsule/${c.id}`)}
                  className="panel p-4 cursor-pointer hover:border-signal/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white truncate">
                          {c.author?.name || '匿名发送者'}
                        </span>
                        <span className="data text-xs">{formatDate(fav.created_at)}</span>
                      </div>
                      <p className="text-sm text-slate-300 line-clamp-2">
                        {c.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="data text-xs">
                          {c.latitude.toFixed(4)}°N, {c.longitude.toFixed(4)}°E
                        </span>
                        {c.emotion_tags && c.emotion_tags.length > 0 && (
                          <span className="data text-xs border border-primary/20 text-primary-light px-1.5">
                            {c.emotion_tags[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    {c.media && c.media.length > 0 && (
                      <div className="w-16 h-16 border border-border flex-shrink-0">
                        <img 
                          src={c.media[0].thumbnail_url || c.media[0].url} 
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
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}