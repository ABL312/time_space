import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../stores/userStore'
import { useOnline } from '../hooks/useOnline'
import { ApiError, capsulesApi } from '../lib/api'
import { PageShell, Card, LoadingState, EmptyState, ErrorState } from '../components/ui'
import type { Capsule } from '../types'

export default function MyCapsulesPage() {
  const navigate = useNavigate()
  const { user } = useUserStore()
  const { isOnline, wasOffline } = useOnline()
  const [capsules, setCapsules] = useState<Capsule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    queueMicrotask(() => { if (!cancelled) setIsLoading(true) })
    capsulesApi
      .getMine(user.id)
      .then((res) => { if (!cancelled) setCapsules(res.capsules) })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setCapsules([])
          return
        }
        setError(err.message)
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [user])

  const handleRetry = () => {
    setError(null)
    if (user) {
      setIsLoading(true)
      capsulesApi.getMine(user.id)
        .then((r) => setCapsules(r.capsules))
        .catch((err) => {
          if (err instanceof ApiError && err.status === 404) {
            setCapsules([])
            return
          }
          setError(err.message)
        })
        .finally(() => setIsLoading(false))
    }
  }

  return (
    <PageShell title="我的时空来信" backTo="/">
      <div className="max-w-lg mx-auto px-4 py-6 pb-28 font-serif">
        {/* Offline banner */}
        {!isOnline && (
          <Card padding="sm" className="mb-4 border-data-bad/20 flex items-center gap-2 bg-red-500/5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-data-bad font-serif">处于离线状态 (显示本地缓存信件)</span>
          </Card>
        )}
        {wasOffline && isOnline && (
          <Card padding="sm" className="mb-4 border-data-good/20 flex items-center gap-2 bg-green-500/5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-data-good font-serif">连接已恢复</span>
          </Card>
        )}

        {/* Stats */}
        <Card padding="md" className="mb-6 border-primary/15 bg-surface/30">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-text-secondary font-serif uppercase tracking-wider font-bold">累计寄出信件</span>
              <p className="text-3xl font-bold text-primary mt-1">
                {isLoading ? '--' : capsules.length} <span className="text-xs font-normal text-text-secondary">封</span>
              </p>
            </div>
            <div className="w-12 h-12 border border-primary/20 bg-primary/10 flex items-center justify-center rounded-full text-xl">
              ✉️
            </div>
          </div>
        </Card>

        {/* Loading */}
        {isLoading && <LoadingState message="正在轻启时光信箱..." />}

        {/* Error */}
        {error && !isLoading && (
          <ErrorState title="加载失败" message={error} retry={handleRetry} className="font-serif" />
        )}

        {/* Empty */}
        {!isLoading && !error && capsules.length === 0 && (
          <EmptyState
            icon={<span className="text-4xl">📬</span>}
            title="尚无寄出的时空来信"
            description="当你在某个地点写下属于那里的故事与回忆，它们便会在岁月长河里静候后来人的开启。"
            action={{ label: '书写第一封时空来信', onClick: () => navigate('/create') }}
            className="font-serif"
          />
        )}

        {/* Capsule list */}
        {!isLoading && capsules.length > 0 && (
          <div className="space-y-3 stagger">
            {capsules.map((c) => {
              const thumb = c.media?.find((m) => m.type === 'photo')
              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`/capsule/${c.id}`)}
                  className="w-full text-left flex overflow-hidden rounded-md border border-primary/15 bg-surface/30 hover:border-primary/30 hover:bg-surface/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="relative w-20 h-20 flex-shrink-0 bg-primary/5 flex items-center justify-center border-r border-primary/10">
                    {thumb ? (
                      <img src={thumb.thumbnail_url || thumb.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-xl">✉️</span>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/30" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-text-secondary">{formatDate(c.created_at)}</span>
                      <span className="text-xs text-primary font-bold">已被开启 {c.open_count} 次</span>
                    </div>
                    <p className="text-xs text-text-primary line-clamp-1 mb-2 font-serif font-medium leading-relaxed">{c.message}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {c.emotion_tags?.slice(0, 2).map((t) => (
                          <span key={t} className="text-[10px] text-primary border border-primary/10 bg-primary/5 px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                        {c.mood_tag && !c.emotion_tags?.length && (
                          <span className="text-[10px] text-primary border border-primary/10 bg-primary/5 px-2 py-0.5 rounded-full">{c.mood_tag}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-text-muted font-sans">
                        {c.latitude.toFixed(3)}°N {c.longitude.toFixed(3)}°E
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </PageShell>
  )
}

function formatDate(d: string): string {
  if (!d) return '未知时间'
  const date = new Date(d)
  const now = new Date()
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000)
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}
