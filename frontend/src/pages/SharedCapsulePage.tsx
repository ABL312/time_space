import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { shareApi } from '../lib/api'
import type { Capsule } from '../types'

export default function SharedCapsulePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
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
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-signal border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-400">正在解码胶囊...</p>
        </div>
      </div>
    )
  }

  if (error || !capsule) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
        <div className="label mb-3 text-data-bad">SIGNAL LOST</div>
        <p className="data text-center mb-1">{error || '胶囊不存在'}</p>
        <p className="data text-slate-600 mb-6">链接可能已失效或胶囊已被删除</p>
        <button 
          onClick={() => navigate('/')} 
          className="btn px-5 py-2 border border-surface-light text-slate-400 text-xs font-mono tracking-wider"
        >
          RETURN TO MAP
        </button>
      </div>
    )
  }

  const photos = capsule.media?.filter((m) => m.type === 'photo') ?? []

  return (
    <div className="min-h-screen bg-bg page-in">
      {/* NAV BAR */}
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
        <span className="label">SHARED CAPSULE</span>
        <div className="w-8"></div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 pb-28 stagger">
        {/* ── AUTHOR BLOCK ── */}
        <section className="mb-6 decode-in">
          <div className="flex items-center gap-3">
            {/* Avatar - geometric, no rounded-full */}
            <div className="w-10 h-10 border border-signal-dim/30 flex items-center justify-center bg-signal/5">
              <span className="text-sm font-semibold text-signal font-mono">
                {capsule.author?.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">
                {capsule.author?.name || '匿名发送者'}
              </p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="data">{formatDate(capsule.created_at)}</span>
              </div>
            </div>
            {capsule.sentiment && (
              <span className={`data px-2 py-0.5 border ${
                capsule.sentiment === 'positive' ? 'border-data-good/30 text-data-good' :
                capsule.sentiment === 'negative' ? 'border-data-bad/30 text-data-bad' :
                'border-slate-600/30 text-slate-400'
              }`}>
                {capsule.sentiment.toUpperCase()}
              </span>
            )}
          </div>
        </section>

        {/* ── MESSAGE ARCHIVE ── */}
        <section className="mb-6 decode-in" style={{ animationDelay: '0.2s' }}>
          <div className="label mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-px bg-signal-dim" />
            MESSAGE_CONTENT
          </div>
          <div className="panel corners p-5">
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-slate-200">
              {capsule.message}
            </p>
            {capsule.emotion_intensity != null && (
              <div className="mt-4 pt-3 border-t border-border">
                <div className="flex items-center gap-3">
                  <span className="label">INTENSITY</span>
                  <div className="flex-1 h-px bg-surface-light relative">
                    <div
                      className="absolute left-0 top-0 h-px bg-gradient-to-r from-signal to-capsule"
                      style={{ width: `${Math.round(capsule.emotion_intensity * 100)}%` }}
                    />
                  </div>
                  <span className="data-value text-xs font-mono">
                    {Math.round(capsule.emotion_intensity * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── EMOTION TAGS ── */}
        {capsule.emotion_tags && capsule.emotion_tags.length > 0 && (
          <section className="mb-6 decode-in" style={{ animationDelay: '0.3s' }}>
            <div className="label mb-2 flex items-center gap-2">
              <span className="inline-block w-2 h-px bg-signal-dim" />
              EMOTION_ANALYSIS
            </div>
            <div className="flex flex-wrap gap-1.5">
              {capsule.emotion_tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 text-xs font-mono border border-primary/20 text-primary-light bg-primary/5 hover:bg-primary/10 transition-colors cursor-default"
                >
                  {tag}
                </span>
              ))}
              {capsule.emotion_summary && (
                <span className="px-2.5 py-1 text-xs font-mono border border-surface-light text-slate-400 bg-surface/50">
                  {capsule.emotion_summary}
                </span>
              )}
            </div>
          </section>
        )}

        {/* ── PHOTO ARCHIVE ── */}
        {photos.length > 0 && (
          <section className="mb-6 decode-in" style={{ animationDelay: '0.4s' }}>
            <div className="label mb-2 flex items-center gap-2">
              <span className="inline-block w-2 h-px bg-signal-dim" />
              PHOTO_ARCHIVE [{photos.length}]
            </div>
            <PhotoCarousel photos={photos} />
          </section>
        )}

        {/* ── VOICE DATA ── */}
        {(capsule.voice_clone_url || capsule.voice_url) && (
          <section className="mb-6 decode-in" style={{ animationDelay: '0.5s' }}>
            {capsule.voice_clone_url && (
              <div className="mb-3">
                <div className="label mb-2 flex items-center gap-2">
                  <span className="inline-block w-2 h-px bg-capsule-dim" />
                  VOICE_CLONE_AI
                </div>
                <VoicePlayer src={capsule.voice_clone_url} variant="capsule" />
              </div>
            )}
            {capsule.voice_url && (
              <div>
                <div className="label mb-2 flex items-center gap-2">
                  <span className="inline-block w-2 h-px bg-signal-dim" />
                  VOICE_ORIGINAL
                </div>
                <VoicePlayer src={capsule.voice_url} variant="signal" />
              </div>
            )}
          </section>
        )}

        {/* ── LOCATION DATA ── */}
        <section className="mb-6 decode-in" style={{ animationDelay: '0.6s' }}>
          <div className="label mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-px bg-signal-dim" />
            LOCATION_DATA
          </div>
          <div className="panel p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">
                  {capsule.location_name || '未标记地点'}
                </p>
                <p className="data mt-1">
                  {capsule.latitude.toFixed(6)}°N, {capsule.longitude.toFixed(6)}°E
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// PHOTO CAROUSEL
// ═══════════════════════════════════════════

function PhotoCarousel({ photos }: { photos: Array<{ id: string; url: string }> }) {

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto carousel-track pb-2 -mx-1 px-1">
        {photos.map((photo, i) => (
          <div key={photo.id} className="flex-shrink-0 w-[80vw] max-w-72 aspect-[4/3] relative border border-border overflow-hidden">
            <img src={photo.url} alt="" className="w-full h-full object-cover" loading="lazy" />
            {/* Frame counter */}
            <div className="absolute bottom-2 right-2 data px-1.5 py-0.5 bg-void/80">
              {String(i + 1).padStart(2, '0')}/{String(photos.length).padStart(2, '0')}
            </div>
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-1 mt-2">
          {photos.map((_, i) => (
            <div key={i} className={`h-px flex-1 transition-all duration-300 bg-surface-light`} />
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
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const toggle = () => {
    if (!audioRef.current) return
    playing ? audioRef.current.pause() : audioRef.current.play()
    setPlaying(!playing)
  }

  const pct = duration > 0 ? (progress / duration) * 100 : 0
  const isCapsule = variant === 'capsule'

  return (
    <div className={`panel p-3 ${isCapsule ? 'border-capsule/15' : 'border-signal/15'}`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={() => audioRef.current && setProgress(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={() => { setPlaying(false); setProgress(0) }}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className={`btn w-9 h-9 flex items-center justify-center flex-shrink-0 ${
            isCapsule
              ? 'border border-capsule/25 bg-capsule/5 text-capsule'
              : 'border border-signal/25 bg-signal/5 text-signal'
          }`}
        >
          {playing ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z" /></svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
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
        <span className="data tabular-nums flex-shrink-0">
          {fmtTime(progress)}<span className="text-slate-600 mx-0.5">/</span>{fmtTime(duration)}
        </span>
      </div>
    </div>
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

function fmtTime(s: number): string {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}