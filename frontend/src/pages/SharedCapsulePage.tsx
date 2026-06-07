import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { shareApi } from '../lib/api'
import { useOnline } from '../hooks/useOnline'
import { PageShell, Card, Badge, Button, LoadingState, ErrorState, SectionLabel } from '../components/ui'
import type { Capsule } from '../types'

export default function SharedCapsulePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { isOnline } = useOnline()
  const [capsule, setCapsule] = useState<Capsule | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    shareApi.getByToken(token)
      .then((data: Capsule) => {
        setCapsule(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err?.message || '加载失败')
        setLoading(false)
      })
  }, [token])

  if (loading) {
    return <LoadingState message="正在轻启分享的信件..." fullscreen />
  }

  if (error || !capsule) {
    return (
      <ErrorState
        title="信箱连接中断"
        message={error || '该信件不存在或已失效'}
        retry={() => navigate('/')}
        className="min-h-screen font-serif"
      />
    )
  }

  const photos = capsule.media?.filter((m) => m.type === 'photo') ?? []

  return (
    <PageShell title="分享的时空来信" backTo="/">
      {/* Offline banner */}
      {!isOnline && (
        <Card padding="sm" className="mx-4 mt-2 mb-2 border-data-bad/20 flex items-center gap-2 bg-red-500/5 font-serif">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
          <span className="text-xs text-data-bad">处于离线状态 (显示本地缓存信件)</span>
        </Card>
      )}

      <div className="max-w-lg mx-auto px-4 py-6 pb-28 stagger font-serif">
        {/* ── AUTHOR BLOCK ── */}
        <section className="mb-6 decode-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-primary/20 flex items-center justify-center bg-primary/10 rounded-full text-lg">
              👤
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary">
                {capsule.author?.name || '匿名信使'}
              </p>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-text-secondary">
                <span>{formatDate(capsule.created_at)}</span>
              </div>
            </div>
            {capsule.sentiment && (
              <Badge variant={capsule.sentiment === 'positive' ? 'success' : capsule.sentiment === 'negative' ? 'error' : 'default'} className="font-serif">
                {capsule.sentiment === 'positive' ? '积极' : capsule.sentiment === 'negative' ? '低落' : '中性'}
              </Badge>
            )}
          </div>
        </section>

        {/* ── MESSAGE ARCHIVE ── */}
        <section className="mb-6 decode-in" style={{ animationDelay: '0.2s' }}>
          <SectionLabel>✉️ 信件正文</SectionLabel>
          <Card padding="md" className="mt-2 border-primary/15 bg-surface/30 shadow-sm">
            <p className="text-base leading-relaxed whitespace-pre-wrap text-text-primary font-serif">
              {capsule.message}
            </p>
            {capsule.emotion_intensity != null && (
              <div className="mt-4 pt-3 border-t border-primary/10">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary">情感浓度</span>
                  <div className="flex-1 h-1 bg-primary/10 rounded-full relative">
                    <div
                      className="absolute left-0 top-0 h-1 bg-primary rounded-full"
                      style={{ width: `${Math.round(capsule.emotion_intensity * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-primary">
                    {Math.round(capsule.emotion_intensity * 100)}%
                  </span>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* ── EMOTION TAGS ── */}
        {capsule.emotion_tags && capsule.emotion_tags.length > 0 && (
          <section className="mb-6 decode-in" style={{ animationDelay: '0.3s' }}>
            <SectionLabel>🔖 情感归档</SectionLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {capsule.emotion_tags.map((tag) => (
                <span key={tag} className="text-xs text-primary border border-primary/10 bg-primary/5 px-2.5 py-1 rounded-full font-serif font-bold shadow-sm">{tag}</span>
              ))}
              {capsule.emotion_summary && (
                <span className="text-xs text-text-secondary border border-border bg-surface/50 px-2.5 py-1 rounded-full font-serif font-bold shadow-sm">{capsule.emotion_summary}</span>
              )}
            </div>
          </section>
        )}

        {/* ── PHOTO ARCHIVE ── */}
        {photos.length > 0 && (
          <section className="mb-6 decode-in" style={{ animationDelay: '0.4s' }}>
            <SectionLabel>📸 寄情影像 [{photos.length}]</SectionLabel>
            <div className="mt-2">
              <PhotoCarousel photos={photos} />
            </div>
          </section>
        )}

        {/* ── VOICE DATA ── */}
        {(capsule.voice_clone_url || capsule.voice_url) && (
          <section className="mb-6 decode-in" style={{ animationDelay: '0.5s' }}>
            {capsule.voice_clone_url && (
              <div className="mb-4">
                <SectionLabel>🗣️ 声音回忆 (AI模拟)</SectionLabel>
                <div className="mt-2">
                  <VoicePlayer src={capsule.voice_clone_url} variant="capsule" />
                </div>
              </div>
            )}
            {capsule.voice_url && (
              <div>
                <SectionLabel>🎙️ 原声留念</SectionLabel>
                <div className="mt-2">
                  <VoicePlayer src={capsule.voice_url} variant="signal" />
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── LOCATION DATA ── */}
        <section className="mb-6 decode-in" style={{ animationDelay: '0.6s' }}>
          <SectionLabel>📍 寄出地点</SectionLabel>
          <Card padding="sm" className="mt-2 border-primary/15 bg-surface/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-text-primary">
                  {capsule.location_name || '未标记地点'}
                </p>
                <p className="text-xs text-text-secondary mt-1 font-sans">
                  {capsule.latitude.toFixed(6)}°N, {capsule.longitude.toFixed(6)}°E
                </p>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </PageShell>
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
      <div ref={ref} onScroll={onScroll} className="flex gap-2.5 overflow-x-auto carousel-track pb-2 -mx-1 px-1">
        {photos.map((photo, i) => (
          <div key={photo.id} className="flex-shrink-0 w-[80vw] max-w-72 aspect-[4/3] relative border border-primary/15 rounded-md overflow-hidden bg-primary/5 shadow-sm">
            <img src={photo.url} alt="" className="w-full h-full object-cover" loading="lazy" />
            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-bg/85 border border-primary/10 text-[10px] text-text-secondary font-sans font-medium">
              {i + 1} / {photos.length}
            </span>
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-1.5 mt-2 max-w-[200px] mx-auto">
          {photos.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i === active ? 'bg-primary' : 'bg-primary/10'}`} />
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
    <Card padding="sm" className={`border-primary/15 bg-surface/30 shadow-sm ${isCapsule ? 'border-primary/20 bg-primary/5' : ''}`}>
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
          className={`border w-9 h-9 flex items-center justify-center rounded-full shadow-sm cursor-pointer ${
            isCapsule
              ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
              : 'border-primary/20 bg-bg text-primary hover:bg-surface'
          }`}
        >
          {playing ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z" /></svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          )}
        </Button>
        <div className="flex-1">
          <div className="h-1 bg-primary/10 rounded-full relative">
            <div className="absolute left-0 top-0 h-1 bg-primary rounded-full" style={{ width: `${pct}%` }} />
          </div>
          {playing && (
            <div className="flex items-end gap-0.5 h-3 mt-1.5 justify-center">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`w-0.5 h-full rounded-sm bg-primary/60 animate-[pulse_1s_infinite]`} style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          )}
        </div>
        <span className="text-xs text-text-secondary font-sans font-medium flex-shrink-0 tabular-nums">
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
  if (!d) return '未知时间'
  const date = new Date(d)
  const now = new Date()
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000)
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}

function fmtTime(s: number): string {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}