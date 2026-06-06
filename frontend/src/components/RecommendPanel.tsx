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
      className={`absolute bottom-0 left-0 right-0 z-[1000] transition-all duration-400 ease-out ${
        expanded ? 'max-h-[72vh]' : 'max-h-20'
      }`}
      role="region"
      aria-label="Nearby capsules"
    >
      <div className="hud overflow-hidden">
        {/* HEADER BAR */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3 flex items-center justify-between row-hover min-h-[44px]"
          aria-expanded={expanded}
          aria-controls="recommend-panel-content"
        >
          {/* Drag handle */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-surface-light" />

          <div className="flex items-center gap-3">
            {/* Signal indicator */}
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 ${total > 0 ? 'bg-signal breathe' : 'bg-slate-600'}`} />
              <span className="data">
                <span className="data-value">{total}</span> CAPSULES
              </span>
            </div>
            {recommended.length > 0 && (
              <span className="data px-1.5 py-0.5 border border-signal/20 text-signal">
                {recommended.length} MATCHED
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isLoadingNearby && (
              <div className="w-3 h-3 border border-signal border-t-transparent animate-spin" />
            )}
            <svg
              className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
          </div>
        </button>

        {/* EXPANDED CONTENT */}
        {expanded && (
          <div id="recommend-panel-content" className="px-4 pb-6 overflow-y-auto max-h-[60vh] stagger" role="list">
            {/* Location context */}
            {nearby?.location_context && (
              <div className="mb-3 p-2.5 border border-border bg-surface/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="label">SECTOR</span>
                  {(nearby.location_context as Record<string, string | undefined>).scene_type && (
                    <span className="data text-signal">
                      {(nearby.location_context as Record<string, string | undefined>).scene_type}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300">{nearby.location_context.name}</p>
                {nearby.location_context.description && (
                  <p className="data mt-1 line-clamp-2">{nearby.location_context.description}</p>
                )}
              </div>
            )}

            {/* Top recommended */}
            {top3.length > 0 ? (
              <>
                <div className="label mb-2 flex items-center gap-2">
                  <span className="inline-block w-2 h-px bg-signal" />
                  TOP MATCHES
                </div>
                <div className="space-y-1.5 mb-4">
                  {top3.map((c, i) => (
                    <CapsuleRow key={c.id} capsule={c} rank={i + 1} thumb={getThumb(c)} onClick={() => go(c)} />
                  ))}
                </div>
              </>
            ) : (
              !isLoadingNearby && <EmptyPanel hasLoc={!!nearby?.location_context} />
            )}

            {/* Others */}
            {others.length > 0 && (
              <>
                <div className="divider my-3" />
                <div className="label mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-2 h-px bg-slate-600" />
                    NEARBY
                  </span>
                  <span className="data">{others.length}</span>
                </div>
                <div className="space-y-1">
                  {others.slice(0, 5).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => go(c)}
                      className="w-full text-left p-2 border border-transparent hover:border-border row-hover transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-1.5 h-1.5 bg-capsule-dim flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-300 truncate">{c.message?.slice(0, 40)}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {c.emotion_tags?.slice(0, 2).map((t) => (
                              <span key={t} className="data text-[9px] text-primary-light">{t}</span>
                            ))}
                            {c.distance_m != null && (
                              <span className="data text-[9px]">{fmtDist(c.distance_m)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
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
    <button onClick={onClick} className="w-full text-left panel row-hover flex overflow-hidden">
      {/* Thumbnail / Rank */}
      <div className="relative w-16 h-16 flex-shrink-0 bg-surface-light/30 flex items-center justify-center border-r border-border">
        {thumb ? (
          <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="data text-lg text-slate-600 font-mono">{String(rank).padStart(2, '0')}</span>
        )}
        {/* Rank overlay */}
        <div className="absolute top-0 left-0 bg-capsule/90 px-1">
          <span className="text-[9px] font-mono font-bold text-void">#{rank}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-2.5 min-w-0">
        {/* Score bar */}
        {score != null && (
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex-1 flex gap-px">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 ${i < Math.round(score / 10) ? 'bg-signal' : 'bg-surface-light'}`}
                />
              ))}
            </div>
            <span className="data-value text-[10px] font-mono">{score}%</span>
          </div>
        )}

        <p className="text-xs text-slate-200 truncate mb-1">{capsule.message?.slice(0, 50)}</p>

        <div className="flex items-center gap-2">
          {capsule.emotion_tags?.slice(0, 2).map((t) => (
            <span key={t} className="data text-[9px] text-primary-light border border-primary/15 px-1">{t}</span>
          ))}
          {capsule.distance_m != null && (
            <span className="data text-[9px]">{fmtDist(capsule.distance_m)}</span>
          )}
          {capsule.match_reasons?.[0] && (
            <span className="data text-[9px] text-signal/70 truncate flex-1">{capsule.match_reasons[0]}</span>
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
      <div className="label mb-2 text-slate-600">NO SIGNAL</div>
      <p className="data">
        {hasLoc ? 'No matching capsules in range' : 'Acquiring position data...'}
      </p>
    </div>
  )
}

function fmtDist(m: number): string {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`
}
