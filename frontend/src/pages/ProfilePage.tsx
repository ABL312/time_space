import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../stores/userStore'
import { profileApi } from '../lib/api'
import type { Capsule } from '../types'
import AchievementPanel from '../components/AchievementPanel'
import { useAchievements } from '../hooks/useAchievements'

interface UserStats {
  created_count: number
  opened_count: number
  favorited_count: number
  total_capsules: number
  recent_opened: Capsule[]
  recent_created: Capsule[]
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user } = useUserStore()
  const { achievements } = useAchievements()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    profileApi.getStats(user.id)
      .then((data: UserStats) => {
        setStats(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err?.message || '加载失败')
        setLoading(false)
      })
  }, [user])

  if (!user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">请先登录</p>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-signal border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-400">正在加载个人资料...</p>
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
        <span className="label">个人主页</span>
        <div className="w-16"></div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 pb-28">
        {/* User Info */}
        <section className="mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 border border-signal-dim/30 flex items-center justify-center bg-signal/5 rounded-lg">
              <span className="text-xl font-semibold text-signal font-mono">
                {user.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-medium text-white mb-1">{user.name}</h1>
              <p className="data">ID: {user.id.slice(0, 8)}</p>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="grid grid-cols-3 gap-3 mb-8">
          <div className="panel p-4 text-center">
            <p className="text-2xl font-bold text-signal mb-1">{stats?.created_count || 0}</p>
            <p className="data text-xs">创建胶囊</p>
          </div>
          <div className="panel p-4 text-center">
            <p className="text-2xl font-bold text-capsule mb-1">{stats?.opened_count || 0}</p>
            <p className="data text-xs">打开胶囊</p>
          </div>
          <div className="panel p-4 text-center">
            <p className="text-2xl font-bold text-primary mb-1">{stats?.favorited_count || 0}</p>
            <p className="data text-xs">收藏数量</p>
          </div>
        </section>

        {/* Achievements */}
        <section className="mb-8">
          <div className="label mb-3 flex items-center gap-2">
            <span className="inline-block w-2 h-px bg-signal-dim" />
            成就徽章
          </div>
          <AchievementPanel achievements={achievements} isOpen={true} onClose={() => {}} minimal={true} />
        </section>

        {/* Recent Opened */}
        {stats?.recent_opened && stats.recent_opened.length > 0 && (
          <section className="mb-8">
            <div className="label mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-px bg-signal-dim" />
              最近打开
            </div>
            <div className="space-y-3">
              {stats.recent_opened.map((capsule) => (
                <div 
                  key={capsule.id}
                  onClick={() => navigate(`/capsule/${capsule.id}`)}
                  className="panel p-4 cursor-pointer hover:border-signal/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white line-clamp-2 mb-2">
                        {capsule.message}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
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
                      <div className="w-12 h-12 border border-border flex-shrink-0">
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
          </section>
        )}

        {/* Recent Created */}
        {stats?.recent_created && stats.recent_created.length > 0 && (
          <section>
            <div className="label mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-px bg-signal-dim" />
              最近创建
            </div>
            <div className="space-y-3">
              {stats.recent_created.map((capsule) => (
                <div 
                  key={capsule.id}
                  onClick={() => navigate(`/capsule/${capsule.id}`)}
                  className="panel p-4 cursor-pointer hover:border-signal/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white line-clamp-2 mb-2">
                        {capsule.message}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
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
                      <div className="w-12 h-12 border border-border flex-shrink-0">
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
          </section>
        )}
      </div>
    </div>
  )
}