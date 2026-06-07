import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, favoritesApi, getErrorMessage } from '../lib/api'
import { useUserStore } from '../stores/userStore'
import type { FavoriteCapsule } from '../types'
import { PageShell, Card, LoadingState, EmptyState, ErrorState } from '../components/ui'

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
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 404) {
          setFavorites([])
          return
        }
        setError(getErrorMessage(err, '获取收藏失败'))
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
      <div className="min-h-screen bg-bg flex items-center justify-center font-serif">
        <EmptyState
          icon={
            <span className="text-4xl">👤</span>
          }
          title="请先登录"
          description="登录后可以查看收藏的来信"
          action={{ label: '去登录', onClick: () => navigate('/onboarding') }}
        />
      </div>
    )
  }

  return (
    <PageShell title="我的收藏" backTo="/">
      <div className="max-w-lg mx-auto px-4 py-4 pb-28 font-serif">
        <div className="text-xs uppercase tracking-wider text-primary font-bold mb-4 flex items-center gap-2">
          <span className="inline-block w-2 h-px bg-primary" />
          收藏的来信 [{favorites.length}]
        </div>

        {isLoading ? (
          <LoadingState message="正在轻启收藏信册..." />
        ) : error ? (
          <ErrorState message={error} retry={() => window.location.reload()} className="font-serif" />
        ) : favorites.length === 0 ? (
          <EmptyState
            icon={
              <span className="text-4xl">❤️</span>
            }
            title="暂无收藏"
            description="你在探寻时收藏的岁月来信将会安全地留存在这里。"
            action={{ label: '去发现时空来信', onClick: () => navigate('/') }}
            className="font-serif"
          />
        ) : (
          <div className="space-y-3 stagger">
            {favorites.map((fav) => {
              const c = fav.capsule
              return (
                <Card
                  key={fav.id}
                  interactive
                  onClick={() => navigate(`/capsule/${c.id}`)}
                  className="border-primary/10 hover:border-primary/30 transition-colors bg-bg shadow-sm rounded-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold text-text-primary truncate">
                          {c.author?.name || '匿名信使'}
                        </span>
                        <span className="text-[10px] text-text-muted">{formatDate(fav.created_at)}</span>
                      </div>
                      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                        {c.message}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px] text-text-muted font-sans">
                          {c.latitude.toFixed(4)}°N, {c.longitude.toFixed(4)}°E
                        </span>
                        {c.emotion_tags && c.emotion_tags.length > 0 && (
                          <span className="text-[10px] text-primary border border-primary/10 bg-primary/5 px-2 py-0.5 rounded-full">{c.emotion_tags[0]}</span>
                        )}
                      </div>
                    </div>
                    {c.media && c.media.length > 0 && (
                      <div className="w-16 h-16 border border-primary/10 rounded-md flex-shrink-0 overflow-hidden bg-primary/5 shadow-sm">
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
