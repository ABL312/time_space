import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCapsuleStore } from '../stores/capsuleStore'
import type { Capsule } from '../types'

export default function CapsuleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { selectedCapsule, fetchCapsule, isLoadingDetail } = useCapsuleStore()
  const [isUnfolded, setIsUnfolded] = useState(false)

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

          {/* Emotion tags */}
          {capsule.emotion_tags && capsule.emotion_tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {capsule.emotion_tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs bg-primary/20 text-primary-light border border-primary/30"
                >
                  {tag}
                </span>
              ))}
              {capsule.emotion_summary && (
                <span className="px-3 py-1 rounded-full text-xs bg-surface text-slate-400">
                  💭 {capsule.emotion_summary}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Photos carousel */}
        {capsule.media && capsule.media.filter((m) => m.type === 'photo').length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm text-slate-300 mb-2">📷 照片</h3>
            <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
              {capsule.media
                .filter((m) => m.type === 'photo')
                .map((photo) => (
                  <div
                    key={photo.id}
                    className="flex-shrink-0 w-48 h-48 rounded-xl overflow-hidden snap-center"
                  >
                    <img
                      src={photo.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Voice player */}
        {(capsule.voice_clone_url || capsule.voice_url) && (
          <div className="mb-6">
            <h3 className="text-sm text-slate-300 mb-2">
              🎙 {capsule.voice_clone_url ? 'AI克隆语音' : '语音留言'}
            </h3>
            <div className="glass rounded-xl p-3">
              <audio
                src={capsule.voice_clone_url || capsule.voice_url || ''}
                controls
                className="w-full h-10"
              />
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
    </div>
  )
}
