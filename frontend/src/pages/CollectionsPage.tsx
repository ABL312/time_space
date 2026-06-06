import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collectionsApi } from '../lib/api'
import type { CapsuleCollection } from '../types'

export default function CollectionsPage() {
  const navigate = useNavigate()
  const [collections, setCollections] = useState<CapsuleCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    collectionsApi.list()
      .then((data: CapsuleCollection[]) => {
        setCollections(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err?.message || '加载失败')
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-signal border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-400">正在加载合集...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
        <div className="label mb-3 text-data-bad">加载失败</div>
        <p className="data text-center mb-1">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="btn mt-4 px-5 py-2 border border-surface-light text-slate-400 text-xs font-mono tracking-wider"
        >
          重新加载
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 hud px-4 py-3 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)} 
          className="btn flex items-center gap-2 text-slate-400 hover:text-signal transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <span className="text-xs font-mono tracking-wider">返回</span>
        </button>
        <span className="label">胶囊合集</span>
        <div className="w-16"></div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 pb-28">
        {collections.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border border-border mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-slate-500 mb-4">暂无合集</p>
          </div>
        ) : (
          <div className="space-y-4">
            {collections.map((collection) => (
              <div 
                key={collection.id}
                onClick={() => navigate(`/collections/${collection.id}`)}
                className="panel p-4 cursor-pointer hover:border-signal/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-white mb-1">{collection.title}</h3>
                    <p className="text-sm text-slate-400 line-clamp-2 mb-2">
                      {collection.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="data text-xs">
                        {collection.capsule_ids?.length || 0} 个胶囊
                      </span>
                      <span className="data text-xs">
                        更新于 {formatDate(collection.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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