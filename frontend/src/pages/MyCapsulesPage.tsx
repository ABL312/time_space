import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../stores/userStore'
import { capsulesApi } from '../lib/api'
import type { Capsule } from '../types'

export default function MyCapsulesPage() {
  const navigate = useNavigate()
  const { user } = useUserStore()
  const [capsules, setCapsules] = useState<Capsule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setIsLoading(true)
    capsulesApi
      .getMine(user.id)
      .then((res) => setCapsules(res.capsules))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [user])

  return (
    <div className="min-h-screen bg-bg page-in">
      {/* NAV */}
      <header className="sticky top-0 z-30 hud px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="btn flex items-center gap-2 text-slate-400 hover:text-signal transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <span className="text-xs font-mono tracking-wider">RETURN</span>
        </button>
        <span className="label">MY CAPSULES</span>
        <div className="w-16" />
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 pb-28">
        {/* Stats */}
        <div className="panel p-3 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="label">TOTAL DEPLOYED</span>
              <p className="text-2xl font-mono font-semibold text-signal mt-1">
                {isLoading ? '--' : capsules.length}
              </p>
            </div>
            <div className="w-10 h-10 border border-signal/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-signal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="panel p-4">
                <div className="skeleton w-3/4 h-3 mb-3" />
                <div className="skeleton w-full h-2 mb-2" />
                <div className="skeleton w-2/3 h-2" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="py-12 text-center">
            <div className="label text-data-bad mb-2">LOAD FAILED</div>
            <p className="data text-center mb-4">{error}</p>
            <button
              onClick={() => { setError(null); if (user) capsulesApi.getMine(user.id).then((r) => setCapsules(r.capsules)).finally(() => setIsLoading(false)) }}
              className="btn px-4 py-2 border border-signal/30 text-signal text-xs font-mono tracking-wider"
            >
              RETRY
            </button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && capsules.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-3 h-3 bg-slate-600 mx-auto mb-4" />
            <div className="label text-slate-600 mb-2">NO CAPSULES DEPLOYED</div>
            <p className="data mb-6">You haven't created any time capsules yet</p>
            <button
              onClick={() => navigate('/create')}
              className="btn px-5 py-2.5 border border-capsule/30 bg-capsule/5 text-capsule text-xs font-mono tracking-wider"
            >
              + DEPLOY FIRST CAPSULE
            </button>
          </div>
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
                  className="w-full text-left panel row-hover flex overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div className="relative w-20 h-20 flex-shrink-0 bg-surface-light/30 flex items-center justify-center border-r border-border">
                    {thumb ? (
                      <img src={thumb.thumbnail_url || thumb.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="data text-lg text-slate-600 font-mono">{String(i + 1).padStart(2, '0')}</span>
                    )}
                    {/* Status indicator */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-data-good" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-3 min-w-0">
                    {/* Date + opens */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="data">{formatDate(c.created_at)}</span>
                      <span className="data text-signal">OPENED {c.open_count}x</span>
                    </div>

                    {/* Message */}
                    <p className="text-xs text-slate-200 truncate mb-2">{c.message}</p>

                    {/* Tags + location */}
                    <div className="flex items-center gap-2">
                      {c.emotion_tags?.slice(0, 2).map((t) => (
                        <span key={t} className="data text-[9px] text-primary-light border border-primary/15 px-1">{t}</span>
                      ))}
                      {c.mood_tag && !c.emotion_tags?.length && (
                        <span className="data text-[9px] text-primary-light border border-primary/15 px-1">{c.mood_tag}</span>
                      )}
                      <span className="data text-[9px] ml-auto">
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
    </div>
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
