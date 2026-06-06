import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collectionsApi } from '../lib/api'
import type { CapsuleCollection } from '../types'
import { PageShell, Card, Badge, LoadingState, EmptyState, ErrorState } from '../components/ui'

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
        setError(err?.message || '加载失败')
        setLoading(false)
      })
  }, [])

  return (
    <PageShell title="胶囊合集" backTo="/">
      <div className="max-w-lg mx-auto py-4 pb-28">
        {loading ? (
          <LoadingState message="正在加载合集" />
        ) : error ? (
          <ErrorState message={error} retry={() => window.location.reload()} />
        ) : collections.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            }
            title="暂无合集"
            description="创建合集来组织你收藏的胶囊"
          />
        ) : (
          <div className="space-y-3 stagger">
            {collections.map((collection) => (
              <Card
                key={collection.id}
                variant="default"
                interactive
                onClick={() => navigate(`/collections/${collection.id}`)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-text-primary mb-1">{collection.title}</h3>
                    <p className="text-sm text-text-tertiary line-clamp-2 mb-2">
                      {collection.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="capsule">
                        {collection.capsule_ids?.length || 0} 个胶囊
                      </Badge>
                      <span className="data text-xs">
                        {formatDate(collection.updated_at)}
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
