import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { favoritesApi } from '../lib/api'
import { useUserStore } from '../stores/userStore'
import type { FavoriteCapsule } from '../types'
import { PageShell, Card, Badge, LoadingState, EmptyState, ErrorState } from '../components/ui'

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
        <EmptyState
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          }
          title="请先登录"
          description="登录后可以收藏喜欢的胶囊"
          action={{ label: '去登录', onClick: () => navigate('/onboarding') }}
        />
      </div>
    )
  }

  return (
    <PageShell title="我的收藏" backTo="/">
      <div className="max-w-lg mx-auto py-4 pb-28">
        <div className="label mb-4 flex items-center gap-2">
          <span className="inline-block w-2 h-px bg-signal-dim" />
          FAVORITES [{favorites.length}]
        </div>

        {isLoading ? (
          <LoadingState message="加载中" />
        ) : error ? (
          <ErrorState message={error} retry={() => window.location.reload()} />
        ) : favorites.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            }
            title="暂无收藏"
            description="浏览胶囊时点击收藏按钮，会出现在这里"
            action={{ label: '去发现胶囊', onClick: () => navigate('/') }}
          />
        ) : (
          <div className="space-y-3 stagger">
            {favorites.map((fav) => {
              const c = fav.capsule
              return (
                <Card
                  key={fav.id}
                  variant="default"
                  className="cursor-pointer hover:border-signal/30 transition-colors"
                  onClick={() => navigate(`/capsule/${c.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {c.author?.name || '匿名发送者'}
                        </span>
                        <Badge variant="default">{formatDate(fav.created_at)}</Badge>
                      </div>
                      <p className="text-sm text-text-secondary line-clamp-2">
                        {c.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="data text-xs">
                          {c.latitude.toFixed(4)}°N, {c.longitude.toFixed(4)}°E
                        </span>
                        {c.emotion_tags && c.emotion_tags.length > 0 && (
                          <Badge variant="signal">{c.emotion_tags[0]}</Badge>
                        )}
                      </div>
                    </div>
                    {c.media && c.media.length > 0 && (
                      <div className="w-16 h-16 border border-border rounded-[var(--radius-sm)] flex-shrink-0 overflow-hidden">
                        <img 
                          src={c.media[0].thumbnail_url || c.media[0].url} 
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </PageShell>
  )
}
