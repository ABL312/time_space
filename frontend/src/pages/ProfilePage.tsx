import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../stores/userStore'
import { profileApi } from '../lib/api'
import type { Capsule } from '../types'
import AchievementPanel from '../components/AchievementPanel'
import { useAchievements } from '../hooks/useAchievements'
import { PageShell, Card, Badge, LoadingState, EmptyState, ErrorState, SectionLabel } from '../components/ui'

interface UserStats {
  created_count: number
  opened_count: number
  favorited_count: number
  total_capsules: number
  recent_opened: Capsule[]
  recent_created: Capsule[]
}

/** Shared capsule row component */
function CapsuleRow({ capsule, onClick }: { capsule: Capsule; onClick: () => void }) {
  return (
    <Card
      variant="default"
      className="cursor-pointer hover:border-signal/30 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary line-clamp-2 mb-2">{capsule.message}</p>
          {capsule.emotion_tags && capsule.emotion_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {capsule.emotion_tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="signal">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
        {capsule.media && capsule.media.length > 0 && (
          <div className="w-12 h-12 border border-border rounded-[var(--radius-sm)] flex-shrink-0 overflow-hidden">
            <img
              src={capsule.media[0].thumbnail_url || capsule.media[0].url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
        )}
      </div>
    </Card>
  )
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
        <EmptyState
          title="请先登录"
          description="登录后可以查看个人主页"
          action={{ label: '去登录', onClick: () => navigate('/onboarding') }}
        />
      </div>
    )
  }

  if (loading) {
    return <LoadingState fullscreen message="正在加载" />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <ErrorState message={error} retry={() => window.location.reload()} />
      </div>
    )
  }

  return (
    <PageShell title="个人主页" backTo="/">
      <div className="max-w-lg mx-auto py-4 pb-28">
        {/* User Info */}
        <section className="mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 border border-signal-dim/30 flex items-center justify-center bg-signal/5 rounded-[var(--radius-md)]">
              <span className="text-xl font-semibold text-signal font-mono">
                {user.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-medium text-text-primary mb-1">{user.name}</h1>
              <p className="data">ID: {user.id.slice(0, 8)}</p>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="grid grid-cols-3 gap-3 mb-8">
          <Card variant="default" className="text-center">
            <p className="text-2xl font-bold text-signal mb-1">{stats?.created_count || 0}</p>
            <p className="data text-xs">创建胶囊</p>
          </Card>
          <Card variant="default" className="text-center">
            <p className="text-2xl font-bold text-capsule mb-1">{stats?.opened_count || 0}</p>
            <p className="data text-xs">打开胶囊</p>
          </Card>
          <Card variant="default" className="text-center">
            <p className="text-2xl font-bold text-primary mb-1">{stats?.favorited_count || 0}</p>
            <p className="data text-xs">收藏数量</p>
          </Card>
        </section>

        {/* Achievements */}
        <section className="mb-8">
          <SectionLabel className="mb-3 flex items-center gap-2">
            <span className="inline-block w-2 h-px bg-signal-dim" />
            成就徽章
          </SectionLabel>
          <AchievementPanel achievements={achievements} isOpen={true} onClose={() => {}} />
        </section>

        {/* Recent Opened */}
        {stats?.recent_opened && stats.recent_opened.length > 0 && (
          <section className="mb-8">
            <SectionLabel className="mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-px bg-signal-dim" />
              最近打开
            </SectionLabel>
            <div className="space-y-3 stagger">
              {stats.recent_opened.map((capsule) => (
                <CapsuleRow
                  key={capsule.id}
                  capsule={capsule}
                  onClick={() => navigate(`/capsule/${capsule.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Recent Created */}
        {stats?.recent_created && stats.recent_created.length > 0 && (
          <section>
            <SectionLabel className="mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-px bg-signal-dim" />
              最近创建
            </SectionLabel>
            <div className="space-y-3 stagger">
              {stats.recent_created.map((capsule) => (
                <CapsuleRow
                  key={capsule.id}
                  capsule={capsule}
                  onClick={() => navigate(`/capsule/${capsule.id}`)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </PageShell>
  )
}
