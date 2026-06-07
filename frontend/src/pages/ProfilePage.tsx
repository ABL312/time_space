import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../stores/userStore'
import { ApiError, profileApi } from '../lib/api'
import type { Capsule } from '../types'
import { useAchievements } from '../hooks/useAchievements'
import { PageShell, Card, LoadingState, EmptyState, ErrorState, SectionLabel } from '../components/ui'

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
      interactive
      onClick={onClick}
      className="border-primary/10 hover:border-primary/30 transition-colors bg-bg shadow-sm rounded-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary font-serif line-clamp-2 mb-2 leading-relaxed">{capsule.message}</p>
          {capsule.emotion_tags && capsule.emotion_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {capsule.emotion_tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] font-serif text-primary border border-primary/10 bg-primary/5 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}
        </div>
        {capsule.media && capsule.media.length > 0 && (
          <div className="w-12 h-12 border border-primary/10 rounded-md flex-shrink-0 overflow-hidden bg-primary/5 shadow-sm">
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
        if (err instanceof ApiError && err.status === 404) {
          setStats({
            created_count: 0,
            opened_count: 0,
            favorited_count: 0,
            total_capsules: 0,
            recent_opened: [],
            recent_created: [],
          })
          setLoading(false)
          return
        }
        setError(err?.message || '加载失败')
        setLoading(false)
      })
  }, [user])

  if (!user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center font-serif">
        <EmptyState
          title="请先登录"
          description="登录后可以查看个人主页"
          action={{ label: '去登录', onClick: () => navigate('/onboarding') }}
        />
      </div>
    )
  }

  if (loading) {
    return <LoadingState fullscreen message="正在漫步回忆中..." />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center font-serif">
        <ErrorState message={error} retry={() => window.location.reload()} />
      </div>
    )
  }

  return (
    <PageShell title="个人中心" backTo="/">
      <div className="max-w-lg mx-auto px-4 py-4 pb-28 font-serif">
        {/* User Info */}
        <section className="mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 border border-primary/20 flex items-center justify-center bg-primary/10 rounded-full shadow-sm text-2xl">
              👤
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary mb-1">{user.name}</h1>
              <p className="text-xs text-text-secondary font-sans">信使编号: {user.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="grid grid-cols-3 gap-3 mb-6">
          <Card className="text-center border-primary/15 bg-surface/30 p-3">
            <p className="text-2xl font-bold text-primary mb-1">{stats?.created_count || 0}</p>
            <p className="text-xs text-text-secondary">寄出来信</p>
          </Card>
          <Card className="text-center border-primary/15 bg-surface/30 p-3">
            <p className="text-2xl font-bold text-primary mb-1">{stats?.opened_count || 0}</p>
            <p className="text-xs text-text-secondary">开启来信</p>
          </Card>
          <Card className="text-center border-primary/15 bg-surface/30 p-3">
            <p className="text-2xl font-bold text-primary mb-1">{stats?.favorited_count || 0}</p>
            <p className="text-xs text-text-secondary">收藏来信</p>
          </Card>
        </section>

        {/* Achievements */}
        <section className="mb-6">
          <SectionLabel className="mb-3 flex items-center gap-2">
            <span className="inline-block w-2 h-px bg-primary" />
            已获勋章
          </SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {achievements.slice(0, 4).map((achievement) => (
              <Card key={achievement.id} padding="sm" className="border-primary/10 bg-surface/10">
                <div className="flex items-center gap-2.5">
                  <span className={`text-xl ${achievement.unlocked ? '' : 'grayscale opacity-30'}`}>{achievement.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate">{achievement.title}</p>
                    <p className="text-[10px] text-text-secondary mt-0.5 font-sans">进度: {achievement.progress}/{achievement.target}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Recent Opened */}
        {stats?.recent_opened && stats.recent_opened.length > 0 && (
          <section className="mb-6">
            <SectionLabel className="mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-px bg-primary" />
              最近开启的来信
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
              <span className="inline-block w-2 h-px bg-primary" />
              最近寄出的来信
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
