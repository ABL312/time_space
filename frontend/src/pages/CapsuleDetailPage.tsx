import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCapsuleStore } from '../stores/capsuleStore'
import { useOfflineCache } from '../hooks/useCapabilityCheck'
import { responsesApi, favoritesApi } from '../lib/api'
import { getErrorMessage } from '../lib/client'
import type { Capsule, CapsuleResponse } from '../types'
import { useUserStore } from '../stores/userStore'
import { QRCodeSVG } from 'qrcode.react'
import { Card, Badge, Button, SectionLabel, LoadingState as UILoadingState, ErrorState as UIErrorState, EmptyState } from '../components/ui'

export default function CapsuleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { selectedCapsule, fetchCapsule, isLoadingDetail } = useCapsuleStore()
  const { cacheResponse, getCached } = useOfflineCache()
  const { user } = useUserStore()
  const [decoded, setDecoded] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  
  // Response states
  const [responses, setResponses] = useState<CapsuleResponse[]>([])
  const [newResponse, setNewResponse] = useState('')
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false)
  const [responseError, setResponseError] = useState<string | null>(null)
  
  // Favorite states
  const [isFavorite, setIsFavorite] = useState(false)
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)
  
  // Time lock states
  const [timeLockData, setTimeLockData] = useState<{
    locked: boolean
    unlock_at?: string
    countdown_seconds?: number
  } | null>(null)
  const [countdown, setCountdown] = useState<string>('')

  // Share states
  const [showSharePanel, setShowSharePanel] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

  useEffect(() => {
    if (!id) return
    queueMicrotask(() => setFetchError(null))
    const cached = getCached<Capsule>(`capsule_${id}`, 10 * 60 * 1000)
    const current = useCapsuleStore.getState().selectedCapsule
    if (cached && !current) {
      useCapsuleStore.setState({ selectedCapsule: cached })
    }
    fetchCapsule(id)
      .then(() => {
        const fresh = useCapsuleStore.getState().selectedCapsule
        if (fresh) cacheResponse(`capsule_${id}`, fresh)
      })
      .catch((err) => setFetchError(err?.message || '加载失败'))
  }, [id, fetchCapsule, cacheResponse, getCached])

  useEffect(() => {
    if (id && selectedCapsule) {
      responsesApi.list(id)
        .then(setResponses)
        .catch((err) => console.error('Failed to fetch responses:', err))
    }
  }, [id, selectedCapsule])

  useEffect(() => {
    if (id && user && selectedCapsule) {
      favoritesApi.status(id, user.id)
        .then((res) => setIsFavorite(res.is_favorite))
        .catch((err) => console.error('Failed to fetch favorite status:', err))
    }
  }, [id, user, selectedCapsule])

  useEffect(() => {
    if (!selectedCapsule?.unlock_at) return

    const unlockTime = new Date(selectedCapsule.unlock_at).getTime()
    const locked = Date.now() < unlockTime

    queueMicrotask(() => {
      setTimeLockData({
        locked,
        unlock_at: selectedCapsule.unlock_at,
        countdown_seconds: locked
          ? Math.max(0, Math.floor((unlockTime - Date.now()) / 1000))
          : undefined
      })
    })

    if (locked) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((unlockTime - Date.now()) / 1000))
        setTimeLockData(prev => prev ? {...prev, countdown_seconds: remaining} : null)
        
        if (remaining <= 0) {
          setTimeLockData(prev => prev ? {...prev, locked: false} : null)
          clearInterval(interval)
          window.location.reload()
        } else {
          const days = Math.floor(remaining / 86400)
          const hours = Math.floor((remaining % 86400) / 3600)
          const minutes = Math.floor((remaining % 3600) / 60)
          const seconds = remaining % 60
          setCountdown(`${days.toString().padStart(2, '0')}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
        }
      }, 1000)
      
      return () => clearInterval(interval)
    }
  }, [selectedCapsule])

  useEffect(() => {
    if (selectedCapsule) {
      const timer = setTimeout(() => setDecoded(true), 150)
      return () => clearTimeout(timer)
    }
  }, [selectedCapsule])

  if (isLoadingDetail && !selectedCapsule) return <UILoadingState />
  if (fetchError && !selectedCapsule) return (
    <UIErrorState
      title="SIGNAL LOST"
      message={fetchError}
      retry={() => { setFetchError(null); if (id) fetchCapsule(id) }}
      className="min-h-screen"
    />
  )
  if (!selectedCapsule) return (
    <EmptyState
      icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>}
      title="NOT FOUND"
      description="Capsule record does not exist"
      action={{ label: 'RETURN TO MAP', onClick: () => navigate('/') }}
      className="min-h-screen"
    />
  )

  const handleResponseSubmit = async () => {
    if (!id || !newResponse.trim()) return
    
    setIsSubmittingResponse(true)
    setResponseError(null)
    
    try {
      const response = await responsesApi.create(id, newResponse.trim())
      setResponses(prev => [...prev, response])
      setNewResponse('')
    } catch (err: unknown) {
      setResponseError(getErrorMessage(err, '发送失败'))
    } finally {
      setIsSubmittingResponse(false)
    }
  }

  const toggleFavorite = async () => {
    if (!id || !user) return
    
    setIsTogglingFavorite(true)
    
    try {
      if (isFavorite) {
        await favoritesApi.remove(id, user.id)
        setIsFavorite(false)
      } else {
        await favoritesApi.add(id, user.id)
        setIsFavorite(true)
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    } finally {
      setIsTogglingFavorite(false)
    }
  }

  const c: Capsule = selectedCapsule
  const photos = c.media?.filter((m) => m.type === 'photo') ?? []

  return (
    <div className="min-h-screen bg-bg page-in">
      {/* NAV BAR */}
      <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <Button variant="icon" size="icon-sm" onClick={() => navigate(-1)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Button>
        <span className="text-xs font-mono text-text-secondary tracking-wider">CAPSULE // {c.id?.toString().padStart(4, '0')}</span>
        <div className="flex gap-1">
          <Button
            variant="icon"
            size="icon-sm"
            onClick={() => {
              setShareUrl(`${window.location.origin}/s/${c.id}`)
              setShowSharePanel(true)
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
          </Button>
          <Button
            variant="icon"
            size="icon-sm"
            onClick={toggleFavorite}
            disabled={isTogglingFavorite}
            loading={isTogglingFavorite}
          >
            {isFavorite ? (
              <svg className="w-4 h-4 text-red-500 fill-current" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            )}
          </Button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 pb-28 stagger">

        {/* ── AUTHOR BLOCK ── */}
        <section className={`mb-6 ${decoded ? 'decode-in' : 'opacity-0'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-signal-dim/30 flex items-center justify-center bg-signal/5">
              <span className="text-sm font-semibold text-signal font-mono">
                {c.author?.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">
                {c.author?.name || '匿名发送者'}
              </p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs font-mono text-text-tertiary">{formatDate(c.created_at)}</span>
                <span className="text-xs font-mono text-text-tertiary">
                  OPENED <span className="text-text-primary">{c.open_count}x</span>
                </span>
              </div>
            </div>
            {c.sentiment && (
              <Badge variant={c.sentiment === 'positive' ? 'success' : c.sentiment === 'negative' ? 'error' : 'default'}>
                {c.sentiment.toUpperCase()}
              </Badge>
            )}
          </div>
        </section>

        {/* ── TIME LOCK ── */}
        {timeLockData?.locked && (
          <section className={`mb-6 text-center ${decoded ? 'decode-in' : 'opacity-0'}`} style={{ animationDelay: '0.1s' }}>
            <SectionLabel>TIME_LOCKED</SectionLabel>
            <Card variant="default" padding="lg" className="mt-2">
              <div className="w-16 h-16 mx-auto mb-4 text-slate-600">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">胶囊已锁定</h3>
              <p className="text-text-secondary mb-4">
                将于 {formatUnlockTime(timeLockData.unlock_at!)} 解锁
              </p>
              <div className="text-2xl font-mono font-bold text-signal mb-2">
                {countdown}
              </div>
              <p className="text-xs text-text-muted">
                倒计时结束后自动解锁
              </p>
            </Card>
          </section>
        )}

        {/* ── MESSAGE ARCHIVE ── */}
        {(!timeLockData || !timeLockData.locked) && (
          <section className={`mb-6 ${decoded ? 'decode-in' : 'opacity-0'}`} style={{ animationDelay: '0.2s' }}>
            <SectionLabel>MESSAGE_CONTENT</SectionLabel>
            <Card variant="default" padding="md" className="mt-2">
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-text-primary">
                {c.message}
              </p>
              {c.emotion_intensity != null && (
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-text-tertiary">INTENSITY</span>
                    <div className="flex-1 h-px bg-surface-light relative">
                      <div
                        className="absolute left-0 top-0 h-px bg-gradient-to-r from-signal to-capsule"
                        style={{ width: `${Math.round(c.emotion_intensity * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-text-primary">
                      {Math.round(c.emotion_intensity * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </section>
        )}

        {/* ── EMOTION TAGS ── */}
        {(!timeLockData || !timeLockData.locked) && c.emotion_tags && c.emotion_tags.length > 0 && (
          <section className={`mb-6 ${decoded ? 'decode-in' : 'opacity-0'}`} style={{ animationDelay: '0.3s' }}>
            <SectionLabel>EMOTION_ANALYSIS</SectionLabel>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {c.emotion_tags.map((tag) => (
                <Badge key={tag} variant="signal" size="md">{tag}</Badge>
              ))}
              {c.emotion_summary && (
                <Badge variant="default" size="md">{c.emotion_summary}</Badge>
              )}
            </div>
          </section>
        )}

        {/* ── PHOTO ARCHIVE ── */}
        {(!timeLockData || !timeLockData.locked) && photos.length > 0 && (
          <section className={`mb-6 ${decoded ? 'decode-in' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
            <SectionLabel>PHOTO_ARCHIVE [{photos.length}]</SectionLabel>
            <div className="mt-2">
              <PhotoCarousel photos={photos} />
            </div>
          </section>
        )}

        {/* ── VOICE DATA ── */}
        {(!timeLockData || !timeLockData.locked) && (c.voice_clone_url || c.voice_url) && (
          <section className={`mb-6 ${decoded ? 'decode-in' : 'opacity-0'}`} style={{ animationDelay: '0.5s' }}>
            {c.voice_clone_url && (
              <div className="mb-3">
                <SectionLabel>VOICE_CLONE_AI</SectionLabel>
                <div className="mt-2">
                  <VoicePlayer src={c.voice_clone_url} variant="capsule" />
                </div>
              </div>
            )}
            {c.voice_url && (
              <div>
                <SectionLabel>VOICE_ORIGINAL</SectionLabel>
                <div className="mt-2">
                  <VoicePlayer src={c.voice_url} variant="signal" />
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── LOCATION DATA ── */}
        <section className={`mb-6 ${decoded ? 'decode-in' : 'opacity-0'}`} style={{ animationDelay: '0.6s' }}>
          <SectionLabel>LOCATION_DATA</SectionLabel>
          <Card variant="default" padding="sm" className="mt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">
                  {c.location_name || '未标记地点'}
                </p>
                <p className="text-xs font-mono text-text-tertiary mt-1">
                  {c.latitude.toFixed(6)}°N, {c.longitude.toFixed(6)}°E
                </p>
              </div>
              {c.distance_m != null && (
                <div className="text-right">
                  <span className="text-lg font-mono text-text-primary">{formatDist(c.distance_m)}</span>
                  <p className="text-xs font-mono text-text-tertiary mt-0.5">FROM YOU</p>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* ── RESPONSES ── */}
        {(!timeLockData || !timeLockData.locked) && (
          <section className={`mb-6 ${decoded ? 'decode-in' : 'opacity-0'}`} style={{ animationDelay: '0.7s' }}>
            <SectionLabel>RESPONSES [{responses.length}]</SectionLabel>
            <div className="space-y-4 mt-2">
              {responses.length > 0 ? (
                responses.map((response) => (
                  <Card key={response.id} variant="default" padding="md">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-white">{response.nickname}</span>
                      <span className="text-xs font-mono text-text-tertiary">{formatDate(response.created_at)}</span>
                    </div>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">{response.content}</p>
                  </Card>
                ))
              ) : (
                <Card variant="default" padding="md" className="text-center">
                  <p className="text-text-muted">还没有人回应，来做第一个留言的人吧！</p>
                </Card>
              )}

              {/* Response input */}
              <Card variant="default" padding="md">
                <textarea
                  value={newResponse}
                  onChange={(e) => setNewResponse(e.target.value)}
                  placeholder="写下你的回应..."
                  maxLength={500}
                  rows={3}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-[var(--radius-sm)] text-white placeholder-slate-600 focus:outline-none focus:border-signal transition-colors resize-none text-sm"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs font-mono text-text-tertiary">{newResponse.length}/500</span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleResponseSubmit}
                    disabled={!newResponse.trim() || isSubmittingResponse}
                    loading={isSubmittingResponse}
                  >
                    SEND
                  </Button>
                </div>
                {responseError && <p className="text-xs font-mono text-data-bad mt-2 text-center">{responseError}</p>}
              </Card>
            </div>
          </section>
        )}

        {/* ── ACTION ── */}
        {(!timeLockData || !timeLockData.locked) && (
          <div className={`${decoded ? 'decode-in' : 'opacity-0'}`} style={{ animationDelay: '0.8s' }}>
            <div className="border-t border-border-subtle my-5" />
            <Button
              variant="capsule"
              size="lg"
              onClick={() => navigate(`/create?reply_to=${c.id}`)}
              className="w-full"
            >
              LEAVE A RESPONSE
            </Button>
          </div>
        )}

        {/* Share Panel */}
        <SharePanel 
          isOpen={showSharePanel} 
          onClose={() => setShowSharePanel(false)} 
          shareUrl={shareUrl} 
        />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// PHOTO CAROUSEL
// ═══════════════════════════════════════════

function PhotoCarousel({ photos }: { photos: Array<{ id: string; url: string }> }) {
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const onScroll = useCallback(() => {
    if (!ref.current) return
    const el = ref.current
    const idx = Math.round(el.scrollLeft / (el.offsetWidth * 0.8))
    setActive(Math.min(idx, photos.length - 1))
  }, [photos.length])

  return (
    <div>
      <div ref={ref} onScroll={onScroll} className="flex gap-2 overflow-x-auto carousel-track pb-2 -mx-1 px-1">
        {photos.map((photo, i) => (
          <div key={photo.id} className="flex-shrink-0 w-[80vw] max-w-72 aspect-[4/3] relative border border-border rounded-[var(--radius-sm)] overflow-hidden">
            <img src={photo.url} alt="" className="w-full h-full object-cover" loading="lazy" />
            <Badge variant="default" className="absolute bottom-2 right-2 bg-void/80 backdrop-blur-sm">
              {String(i + 1).padStart(2, '0')}/{String(photos.length).padStart(2, '0')}
            </Badge>
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-1 mt-2">
          {photos.map((_, i) => (
            <div key={i} className={`h-px flex-1 transition-all duration-300 ${i === active ? 'bg-signal' : 'bg-surface-light'}`} />
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
// VOICE PLAYER
// ═══════════════════════════════════════════

function VoicePlayer({ src, variant }: { src: string; variant: 'signal' | 'capsule' }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(!playing)
  }

  const pct = duration > 0 ? (progress / duration) * 100 : 0
  const isCapsule = variant === 'capsule'

  return (
    <Card variant="default" padding="sm" className={isCapsule ? 'border-capsule/15' : 'border-signal/15'}>
      <audio
        ref={audioRef} src={src} preload="metadata"
        onTimeUpdate={() => audioRef.current && setProgress(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={() => { setPlaying(false); setProgress(0) }}
      />
      <div className="flex items-center gap-3">
        <Button
          variant="icon"
          size="icon-sm"
          onClick={toggle}
          className={isCapsule
            ? 'border border-capsule/25 bg-capsule/5 text-capsule'
            : 'border border-signal/25 bg-signal/5 text-signal'
          }
        >
          {playing ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z" /></svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          )}
        </Button>
        <div className="flex-1">
          <div className="h-px bg-surface-light relative">
            <div className={`absolute left-0 top-0 h-px ${isCapsule ? 'bg-capsule' : 'bg-signal'}`} style={{ width: `${pct}%` }} />
          </div>
          {playing && (
            <div className="flex items-end gap-0.5 h-4 mt-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`wave-bar ${isCapsule ? 'bg-capsule/60' : ''}`} />
              ))}
            </div>
          )}
        </div>
        <span className="text-xs font-mono text-text-tertiary tabular-nums flex-shrink-0">
          {fmtTime(progress)}<span className="text-text-muted mx-0.5">/</span>{fmtTime(duration)}
        </span>
      </div>
    </Card>
  )
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

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

function formatDist(m: number): string {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`
}

function fmtTime(s: number): string {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

function formatUnlockTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ═══════════════════════════════════════════
// SHARE PANEL
// ═══════════════════════════════════════════

function SharePanel({ 
  isOpen, 
  onClose, 
  shareUrl 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  shareUrl: string;
}) {
  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        // Could add a toast notification here
      })
      .catch(err => {
        console.error('Failed to copy: ', err)
      })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <Card variant="default" padding="lg" className="w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-white">分享胶囊</h3>
          <Button variant="icon" size="icon-sm" onClick={onClose}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
        
        <div className="flex flex-col items-center py-6">
          <div className="mb-6 p-4 bg-white rounded-[var(--radius-md)]">
            <QRCodeSVG value={shareUrl} size={200} />
          </div>
          
          <div className="w-full">
            <p className="text-xs font-mono text-text-tertiary mb-2">分享链接</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-surface border border-border rounded-[var(--radius-sm)] text-white text-sm truncate"
              />
              <Button variant="primary" size="sm" onClick={handleCopy}>
                复制
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
