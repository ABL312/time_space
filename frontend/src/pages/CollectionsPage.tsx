import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, collectionsApi } from '../lib/api'
import type { CapsuleCollection } from '../types'
import { PageShell, Card, LoadingState, EmptyState, ErrorState } from '../components/ui'

export default function CollectionsPage() {
  const navigate = useNavigate()
  const [collections, setCollections] = useState<CapsuleCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    collectionsApi.list()
      .then((data) => {
        setCollections(data.collections)
        setLoading(false)
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setCollections([])
          setLoading(false)
          return
        }
        setError(err?.message || '加载失败')
        setLoading(false)
      })
  }, [])

  return (
    <PageShell title="时空信箱合集" backTo="/">
      <div className="max-w-lg mx-auto px-4 py-4 pb-28 font-serif">
        {loading ? (
          <LoadingState message="正在轻启合集册页..." />
        ) : error ? (
          <ErrorState message={error} retry={() => window.location.reload()} className="font-serif" />
        ) : collections.length === 0 ? (
          <EmptyState
            icon={
              <span className="text-4xl">📚</span>
            }
            title="暂无集册"
            description="你可以根据特定主题或路线，将不同地点、不同情感的岁月来信整理成册。"
            action={{ label: '返回地图', onClick: () => navigate('/') }}
            className="font-serif"
          />
        ) : (
          <div className="space-y-3 stagger">
            {collections.map((collection) => (
              <Card
                key={collection.id}
                interactive
                onClick={() => navigate(`/collections/${collection.id}`)}
                className="border-primary/10 hover:border-primary/30 transition-colors bg-bg shadow-sm rounded-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-text-primary mb-1.5">{collection.title}</h3>
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-2 mb-3">
                      {collection.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-primary border border-primary/10 bg-primary/5 px-2 py-0.5 rounded-full font-bold">
                        📁 {collection.capsule_ids?.length || 0} 封信件
                      </span>
                      <span className="text-[10px] text-text-muted">
                        更新于 {formatDate(collection.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}

function formatDate(dateString: string): string {
  if (!dateString) return '未知时间'
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays}天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
  return date.toLocaleDateString('zh-CN')
}
