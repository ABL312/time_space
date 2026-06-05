import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCapsuleStore } from '../stores/capsuleStore'
import type { Capsule, Media } from '../types'

export default function CapsuleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { selectedCapsule, fetchCapsule, isLoadingDetail } = useCapsuleStore()
  const [isUnfolded, setIsUnfolded] = useState(false)

  // Fullscreen photo viewer
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null)

  // Custom audio player
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressBarRef = useRef<HTMLDivElement | null>(null)

  // Photo carousel
  const carouselRef = useRef<HTMLDivElement | null>(null)
  const photoItemRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (id) {
      fetchCapsule(id)
    }
  }, [id, fetchCapsule])

  useEffect(() => {
    // Trigger unfold animation after data loads
    if (selectedCapsule) {
      const timer = setTimeout(() => setIsUnfolded(true), 100)
      return () => clearTimeout(timer)
    }
  }, [selectedCapsule])

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => setDuration(audio.duration)
    const onEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
    }
  }, [selectedCapsule])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const seekAudio = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    const bar = progressBarRef.current
    if (!audio || !bar) return
    const rect = bar.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = Math.max(0, Math.min(1, x / rect.width))
    audio.currentTime = pct * duration
    setCurrentTime(audio.currentTime)
  }, [duration])

  const formatTime = (t: number): string => {
    if (!t || isNaN(t)) return '0:00'
    const mins = Math.floor(t / 60)
    const secs = Math.floor(t % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Photo carousel navigation
  const photos = selectedCapsule?.media?.filter((m) => m.type === 'photo') || []
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  const scrollToPhoto = useCallback((index: number) => {
    const el = photoItemRefs.current[index]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      setCurrentPhotoIndex(index)
    }
  }, [])

  // Fullscreen photo navigation
  const openFullscreen = useCallback((index: number) => {
    setFullscreenIndex(index)
  }, [])

  const closeFullscreen = useCallback(() => {
    setFullscreenIndex(null)
  }, [])

  const nextPhoto = useCallback(() => {
    setFullscreenIndex((prev) => {
      if (prev === null) return null
      return (prev + 1) % photos.length
    })
  }, [photos.length])

  const prevPhoto = useCallback(() => {
    setFullscreenIndex((prev) => {
      if (prev === null) return null
      return (prev - 1 + photos.length) % photos.length
    })
  }, [photos.length])

  // Keyboard navigation for fullscreen
  useEffect(() => {
    if (fullscreenIndex === null) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFullscreen()
      if (e.key === 'ArrowRight') nextPhoto()
      if (e.key === 'ArrowLeft') prevPhoto()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [fullscreenIndex, closeFullscreen, nextPhoto, prevPhoto])

  if (isLoadingDetail) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <div className="text-4xl mb-3 float-animation">✉️</div>
          <p className="text-sm text-slate-400">正在打开时空胶囊...</p>
        </div>
      </div>
    )
  }

  if (!selectedCapsule) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg">
        <p className="text-slate-400">胶囊未找到</p>
      </div>
    )
  }

  const capsule: Capsule = selectedCapsule

  return (
    <div className="min-h-screen bg-bg px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          ← 返回
        </button>
        <h1 className="text-sm text-slate-400">时空胶囊</h1>
        <div className="w-12" />
      </div>

      <div className="max-w-lg mx-auto">
        {/* Envelope icon animation */}
        <div className={`text-center mb-4 transition-all duration-500 ${isUnfolded ? 'envelope-icon-appear' : 'opacity-0'}`}>
          <span className="text-4xl inline-block">✉️</span>
        </div>

        {/* Envelope unfold animation */}
        <div className={`mb-6 ${isUnfolded ? 'envelope-unfold' : 'opacity-0'}`}>
          {/* Author info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-lg">
              {capsule.author?.name?.charAt(0) || '👤'}
            </div>
            <div>
              <p className="text-sm text-white font-medium">
                {capsule.author?.name || '匿名用户'}
              </p>
              <p className="text-xs text-slate-400">
                {capsule.created_at
                  ? new Date(capsule.created_at).toLocaleDateString('zh-CN')
                  : '未知时间'}
                {' · '}
                已被打开 {capsule.open_count} 次
              </p>
            </div>
          </div>

          {/* Message */}
          <div className="glass rounded-2xl p-5 mb-4">
            <p className="text-base text-white leading-relaxed whitespace-pre-wrap">
              {capsule.message}
            </p>
          </div>

          {/* Emotion tags with stagger animation */}
          {capsule.emotion_tags && capsule.emotion_tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {capsule.emotion_tags.map((tag, i) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs bg-primary/20 text-primary-light border border-primary/30 tag-stagger"
                  style={{ animationDelay: `${i * 0.12}s` }}
                >
                  {tag}
                </span>
              ))}
              {capsule.emotion_summary && (
                <span
                  className="px-3 py-1 rounded-full text-xs bg-surface text-slate-400 tag-stagger"
                  style={{ animationDelay: `${capsule.emotion_tags!.length * 0.12}s` }}
                >
                  💭 {capsule.emotion_summary}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Photos carousel with arrows and indicators */}
        {photos.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm text-slate-300 mb-2">📷 照片</h3>
            <div className="relative">
              {/* Left arrow */}
              {photos.length > 1 && currentPhotoIndex > 0 && (
                <button
                  onClick={() => scrollToPhoto(currentPhotoIndex - 1)}
                  className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  ‹
                </button>
              )}
              {/* Right arrow */}
              {photos.length > 1 && currentPhotoIndex < photos.length - 1 && (
                <button
                  onClick={() => scrollToPhoto(currentPhotoIndex + 1)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  ›
                </button>
              )}
              {/* Carousel container */}
              <div
                ref={carouselRef}
                className="flex gap-2 overflow-x-auto pb-2 snap-x scroll-smooth"
                onScroll={() => {
                  if (!carouselRef.current) return
                  const el = carouselRef.current
                  const scrollLeft = el.scrollLeft
                  const itemWidth = el.firstElementChild?.clientWidth || 192
                  const gap = 8
                  const idx = Math.round(scrollLeft / (itemWidth + gap))
                  setCurrentPhotoIndex(idx)
                }}
              >
                {photos.map((photo: Media, i: number) => (
                  <div
                    key={photo.id}
                    ref={(el) => { photoItemRefs.current[i] = el }}
                    className="flex-shrink-0 w-48 h-48 rounded-xl overflow-hidden snap-center cursor-pointer hover:scale-[1.02] transition-transform"
                    onClick={() => openFullscreen(i)}
                  >
                    <img
                      src={photo.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              {/* Indicators */}
              {photos.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-2">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => scrollToPhoto(i)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === currentPhotoIndex ? 'bg-accent w-4' : 'bg-slate-500'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom Voice player */}
        {(capsule.voice_clone_url || capsule.voice_url) && (
          <div className="mb-6">
            <h3 className="text-sm text-slate-300 mb-2">
              🎙 {capsule.voice_clone_url ? 'AI克隆语音' : '语音留言'}
            </h3>
            <div className="glass rounded-xl p-4">
              <audio
                ref={audioRef}
                src={capsule.voice_clone_url || capsule.voice_url || ''}
                preload="metadata"
              />
              <div className="flex items-center gap-3">
                {/* Play/Pause button */}
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-accent hover:bg-accent-light flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <span className="text-black text-lg">
                    {isPlaying ? '⏸' : '▶'}
                  </span>
                </button>
                {/* Progress bar */}
                <div className="flex-1">
                  <div
                    ref={progressBarRef}
                    className="h-2 bg-surface-light rounded-full cursor-pointer relative"
                    onClick={seekAudio}
                  >
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-100"
                      style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow transition-all duration-100"
                      style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%`, marginLeft: '-6px' }}
                    />
                  </div>
                  {/* Time display */}
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-400">{formatTime(currentTime)}</span>
                    <span className="text-xs text-slate-400">{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Location info */}
        <div className="glass rounded-xl p-3 mb-6">
          <p className="text-xs text-slate-400">📍 封存位置</p>
          <p className="text-sm text-white mt-1">
            {capsule.location_name || `${capsule.latitude.toFixed(4)}, ${capsule.longitude.toFixed(4)}`}
          </p>
        </div>

        {/* Reply button */}
        <button
          onClick={() => navigate(`/create?reply_to=${capsule.id}`)}
          className="w-full py-4 rounded-xl bg-accent hover:bg-accent-light text-black text-sm font-bold transition-all"
        >
          ✏️ 在这里留下回应
        </button>
      </div>

      {/* Fullscreen Photo Viewer */}
      {fullscreenIndex !== null && photos[fullscreenIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeFullscreen}
        >
          {/* Close button */}
          <button
            onClick={closeFullscreen}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl transition-colors z-10"
          >
            ×
          </button>

          {/* Left arrow */}
          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prevPhoto() }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-2xl transition-colors z-10"
            >
              ‹
            </button>
          )}

          {/* Right arrow */}
          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); nextPhoto() }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-2xl transition-colors z-10"
            >
              ›
            </button>
          )}

          {/* Photo */}
          <img
            src={photos[fullscreenIndex].url}
            alt=""
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Photo counter */}
          {photos.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-sm text-white">
              {fullscreenIndex + 1} / {photos.length}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
