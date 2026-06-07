import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCapsuleStore } from '../stores/capsuleStore'
import type { Capsule } from '../types'

export default function RecommendPanel() {
  const navigate = useNavigate()
  const { nearby, isLoadingNearby, fetchNearby } = useCapsuleStore()
  const [expanded, setExpanded] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (d?.lat && d?.lng) {
        fetchNearby({ lat: d.lat, lng: d.lng, radius: d.radius ?? 1200, user_id: d.user_id })
      }
    }
    window.addEventListener('scene-changed', handler)
    return () => window.removeEventListener('scene-changed', handler)
  }, [fetchNearby])

  const recommended = nearby?.recommended ?? []
  const others = nearby?.others ?? []
  const total = nearby?.total ?? 0
  const top3 = recommended.slice(0, 3)

  const go = useCallback((c: Capsule) => navigate(`/capsule/${c.id}`), [navigate])

  const getThumb = (c: Capsule) => {
    const p = c.media?.find((m) => m.type === 'photo')
    return p?.thumbnail_url || p?.url || null
  }

  return (
    <div
      ref={panelRef}
      className={`absolute bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[32rem] z-[1000] transition-all duration-300 ease-out ${
        expanded ? 'max-h-[72vh]' : 'max-h-[56px]'
      }`}
      role="region"
      aria-label="附近来信"
    >
      <div className="bg-bg/95 border border-primary/20 shadow-lg rounded-lg overflow-hidden backdrop-blur-sm">
        {/* HEADER BAR */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-surface/30 transition-colors relative min-h-[44px] cursor-pointer"
          aria-expanded={expanded}
          aria-controls="recommend-panel-content"
        >
          {/* Drag handle */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary/20 rounded-full" />

          <div className="flex items-center gap-3">
            {/* Signal indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${total > 0 ? 'bg-primary animate-pulse' : 'bg-text-muted'}`} />
              <span className="text-sm font-serif font-bold text-text-primary">
                附近有 <span className="text-primary">{total}</span> 封时空来信
              </span>
            </div>
            {recommended.length > 0 && (
              <span className="text-xs font-serif px-2 py-0.5 border border-primary/20 bg-primary/5 text-primary rounded-full font-medium">
                {recommended.length} 封心声契合
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isLoadingNearby && (
              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent animate-spin rounded-full" />
            )}
            <svg
              className={`w-4 h-4 text-primary transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
          </div>
        </button>

        {/* EXPANDED CONTENT */}
        {expanded && (
          <div id="recommend-panel-content" className="px-4 pb-6 overflow-y-auto max-h-[55vh] border-t border-primary/10">
            {/* Location context */}
            {nearby?.location_context && (
              <div className="my-4 p-3 border border-dashed border-primary/20 bg-surface/40 rounded-md">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-primary font-bold font-serif">当前区域</span>
                  {(nearby.location_context as Record<string, string | undefined>).scene_type && (
                    <span className="text-xs font-serif font-bold text-primary">
                      📬 {(nearby.location_context as Record<string, string | undefined>).scene_type}
                    </span>
                  )}
                </div>
                <p className="text-sm font-serif font-bold text-text-primary mb-1">{nearby.location_context.name}</p>
                {nearby.location_context.description && (
                  <p className="text-xs text-text-secondary leading-relaxed font-serif">{nearby.location_context.description}</p>
                )}
              </div>
            )}

            {/* Top recommended */}
            {top3.length > 0 ? (
              <div className="mt-4">
                <div className="text-xs uppercase tracking-wider text-primary font-serif font-bold mb-3 flex items-center gap-2">
                  <span className="inline-block w-2 h-px bg-primary" />
                  最契合的来信
                </div>
                <div className="space-y-3 mb-4">
                  {top3.map((c, i) => (
                    <CapsuleRow key={c.id} capsule={c} rank={i + 1} thumb={getThumb(c)} onClick={() => go(c)} />
                  ))}
                </div>
              </div>
            ) : (
              !isLoadingNearby && <EmptyPanel hasLoc={!!nearby?.location_context} />
            )}

            {/* Others */}
            {others.length > 0 && (
              <div className="mt-4 border-t border-primary/10 pt-4">
                <div className="text-xs uppercase tracking-wider text-text-secondary font-serif font-bold mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-2 h-px bg-text-muted" />
                    附近的其他来信
                  </span>
                  <span className="text-text-muted font-normal">{others.length} 封</span>
                </div>
                <div className="space-y-2">
                  {others.slice(0, 5).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => go(c)}
                      className="w-full text-left p-3 border border-border/40 hover:border-primary/30 rounded-md hover:bg-surface/20 transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-sm mt-0.5">✉️</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-text-secondary font-serif line-clamp-2 leading-relaxed">{c.message}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1.5">
                              {c.emotion_tags?.slice(0, 2).map((t) => (
                                <span key={t} className="text-[10px] font-serif text-primary border border-primary/10 bg-primary/5 px-1.5 py-0.5 rounded">{t}</span>
                              ))}
                            </div>
                            {c.distance_m != null && (
                              <span className="text-[10px] text-text-muted font-serif">{fmtDist(c.distance_m)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// CAPSULE ROW
// ═══════════════════════════════════════════

function CapsuleRow({ capsule, rank, thumb, onClick }: {
  capsule: Capsule; rank: number; thumb: string | null; onClick: () => void
}) {
  const score = capsule.match_score != null ? Math.round(capsule.match_score) : null

  return (
    <button onClick={onClick} className="w-full text-left flex overflow-hidden rounded-md border border-primary/15 bg-surface/30 hover:border-primary/30 hover:bg-surface/50 transition-colors cursor-pointer">
      {/* Thumbnail / Rank */}
      <div className="relative w-16 h-16 flex-shrink-0 bg-primary/5 flex items-center justify-center border-r border-primary/10">
        {thumb ? (
          <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-xl font-serif text-primary font-bold">📬</span>
        )}
        {/* Rank overlay */}
        <div className="absolute top-0 left-0 bg-primary px-1.5 py-0.5 rounded-br-md">
          <span className="text-[9px] font-serif font-bold text-white">#{rank}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-2.5 min-w-0">
        {/* Score bar */}
        {score != null && (
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex-1 flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-sm ${i < Math.round(score / 10) ? 'bg-primary' : 'bg-primary/10'}`}
                />
              ))}
            </div>
            <span className="text-[10px] font-serif font-bold text-primary">{score}% 契合度</span>
          </div>
        )}

        <p className="text-xs text-text-primary font-serif truncate mb-1.5">{capsule.message}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {capsule.emotion_tags?.slice(0, 2).map((t) => (
              <span key={t} className="text-[10px] font-serif text-primary border border-primary/10 bg-primary/5 px-1.5 py-0.5 rounded">{t}</span>
            ))}
          </div>
          {capsule.distance_m != null && (
            <span className="text-[10px] text-text-muted font-serif">{fmtDist(capsule.distance_m)}</span>
          )}
        </div>
      </div>
    </button>
  )
}

// ═══════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════

function EmptyPanel({ hasLoc }: { hasLoc: boolean }) {
  return (
    <div className="py-8 text-center">
      <div className="text-sm font-serif font-bold text-text-secondary mb-2">📬 静待回音</div>
      <p className="text-xs text-text-muted font-serif">
        {hasLoc ? '此地空余清风，尚无与你心声契合的信件' : '正在探寻物理空间中的时空信件...'}
      </p>
    </div>
  )
}

function fmtDist(m: number): string {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`
}
