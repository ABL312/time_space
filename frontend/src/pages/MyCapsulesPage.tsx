import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../stores/userStore'
import { useOnline } from '../hooks/useOnline'
import { capsulesApi } from '../lib/api'
import { PageShell, Card, Badge, LoadingState, EmptyState, ErrorState } from '../components/ui'
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
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [user])

  const handleRetry = () => {
    setError(null)
    if (user) {
      setIsLoading(true)
      capsulesApi.getMine(user.id)
        .then((r) => setCapsules(r.capsules))
        .catch((err) => setError(err.message))
        .finally(() => setIsLoading(false))
    }
  }

  return (
    <PageShell title="MY CAPSULES" backTo="/">
      <div className="max-w-lg mx-auto px-4 py-6 pb-28">
        {/* Offline banner */}
        {!isOnline && (
          <Card variant="hud" padding="sm" className="mb-4 border-data-bad/20 flex items-center gap-2">
            <Badge variant="error" dot>OFFLINE — DISPLAYING CACHED DATA</Badge>
          </Card>
        )}
        {wasOffline && isOnline && (
          <Card variant="hud" padding="sm" className="mb-4 border-data-good/20 flex items-center gap-2">
            <Badge variant="success" dot>CONNECTION RESTORED</Badge>
          </Card>
        )}

        {/* Stats */}
        <Card variant="default" padding="md" className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono tracking-wider text-text-tertiary uppercase">Total Deployed</span>
              <p className="text-2xl font-mono font-semibold text-signal mt-1">
                {isLoading ? '--' : capsules.length}
              </p>
            </div>
            <div className="w-10 h-10 border border-signal/20 flex items-center justify-center rounded-[var(--radius-sm)]">
              <svg className="w-5 h-5 text-signal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
          </div>
        </Card>

        {/* Loading */}
        {isLoading && <LoadingState message="Loading capsules..." />}

        {/* Error */}
        {error && !isLoading && (
          <ErrorState title="LOAD FAILED" message={error} retry={handleRetry} />
        )}

        {/* Empty */}
        {!isLoading && !error && capsules.length === 0 && (
          <EmptyState
            icon={<div className="w-3 h-3 bg-slate-600" />}
            title="NO CAPSULES DEPLOYED"
            description="You haven't created any time capsules yet"
            action={{ label: '+ DEPLOY FIRST CAPSULE', onClick: () => navigate('/create') }}
          />
        )}

        {/* Capsule list */}
        {!isLoading && capsules.length > 0 && (
          <div className="space-y-2 stagger">
            {capsules.map((c, i) => {
              const thumb = c.media?.find((m) => m.type === 'photo')
              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`/capsule/${c.id}`)}
                  className="w-full text-left row-hover flex overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface hover:border-border-active transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal/50"
                >
                  {/* Thumbnail */}
                  <div className="relative w-20 h-20 flex-shrink-0 bg-surface-light/30 flex items-center justify-center border-r border-border">
                    {thumb ? (
                      <img src={thumb.thumbnail_url || thumb.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-lg font-mono text-slate-600">{String(i + 1).padStart(2, '0')}</span>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-data-good" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-mono text-text-tertiary">{formatDate(c.created_at)}</span>
                      <span className="text-xs font-mono text-signal">OPENED {c.open_count}x</span>
                    </div>
                    <p className="text-xs text-slate-200 truncate mb-2">{c.message}</p>
                    <div className="flex items-center gap-2">
                      {c.emotion_tags?.slice(0, 2).map((t) => (
                        <Badge key={t} variant="signal">{t}</Badge>
                      ))}
                      {c.mood_tag && !c.emotion_tags?.length && (
                        <Badge variant="signal">{c.mood_tag}</Badge>
                      )}
                      <span className="text-[9px] font-mono text-text-tertiary ml-auto">
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
  if (!d) return 'UNKNOWN'
  const date = new Date(d)
  const now = new Date()
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000)
  if (days === 0) return 'TODAY'
  if (days === 1) return '1D AGO'
  if (days < 7) return `${days}D AGO`
  if (days < 30) return `${Math.floor(days / 7)}W AGO`
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}
