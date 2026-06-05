import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGeolocation } from '../hooks/useGeolocation'
import { useUserStore } from '../stores/userStore'
import { capsulesApi } from '../lib/api'
import { EMOTION_TAGS } from '../types'

export default function CreatePage() {
  const navigate = useNavigate()
  const { user } = useUserStore()
  const { latitude, longitude, error: geoError } = useGeolocation()

  const [message, setMessage] = useState('')
  const [moodTags, setMoodTags] = useState<string[]>([])
  const [visibility, setVisibility] = useState<'public' | 'private' | 'link_only'>('public')
  const [photos, setPhotos] = useState<File[]>([])
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleMoodTag = (tag: string) => {
    setMoodTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : prev.length < 3
          ? [...prev, tag]
          : prev
    )
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + photos.length > 5) {
      setError('最多上传5张照片')
      return
    }
    setPhotos((prev) => [...prev, ...files])
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      const chunks: Blob[] = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setVoiceBlob(blob)
        stream.getTracks().forEach((t) => t.stop())
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)

      // Auto-stop after 60 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
          setIsRecording(false)
        }
      }, 60000)
    } catch {
      setError('无法访问麦克风，请检查权限')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [])

  const canSubmit = message.length >= 10 && message.length <= 500 && latitude && longitude

  const handleSubmit = async () => {
    if (!canSubmit || !latitude || !longitude || !user) return
    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('message', message)
      formData.append('latitude', String(latitude))
      formData.append('longitude', String(longitude))
      formData.append('visibility', visibility)
      if (moodTags.length > 0) {
        formData.append('mood_tag', moodTags[0])
      }
      photos.forEach((photo) => {
        formData.append('photos', photo)
      })
      if (voiceBlob) {
        formData.append('voice', voiceBlob, 'recording.webm')
      }

      await capsulesApi.create(formData)
      navigate('/')
    } catch (err: any) {
      setError(err.message || '创建失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

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
        <h1 className="text-lg font-bold text-white">留下时空胶囊</h1>
        <div className="w-12" />
      </div>

      <div className="max-w-lg mx-auto space-y-6">
        {/* GPS Location */}
        <div className="glass rounded-xl p-3">
          <p className="text-xs text-slate-400 mb-1">📍 当前位置</p>
          {latitude && longitude ? (
            <p className="text-sm text-green-400">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </p>
          ) : (
            <p className="text-sm text-amber-400">
              {geoError || '正在获取位置...'}
            </p>
          )}
        </div>

        {/* Message input */}
        <div>
          <label className="block text-sm text-slate-300 mb-2">留言内容 *</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="写下你想留在这里的话..."
            maxLength={500}
            rows={5}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors resize-none"
          />
          <div className="flex justify-between mt-1">
            <p className={`text-xs ${message.length < 10 ? 'text-amber-400' : 'text-slate-500'}`}>
              {message.length < 10 ? `至少还需要${10 - message.length}个字` : '✓'}
            </p>
            <p className="text-xs text-slate-500">{message.length}/500</p>
          </div>
        </div>

        {/* Photo upload */}
        <div>
          <label className="block text-sm text-slate-300 mb-2">
            照片 (最多5张)
          </label>
          <div className="flex flex-wrap gap-2">
            {photos.map((photo, index) => (
              <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden">
                <img
                  src={URL.createObjectURL(photo)}
                  alt={`photo-${index}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-500 flex items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-colors"
              >
                +
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            onChange={handlePhotoSelect}
            className="hidden"
          />
        </div>

        {/* Voice recording */}
        <div>
          <label className="block text-sm text-slate-300 mb-2">语音留言 (可选, 最长60秒)</label>
          {voiceBlob ? (
            <div className="flex items-center gap-3 glass rounded-xl p-3">
              <audio src={URL.createObjectURL(voiceBlob)} controls className="flex-1 h-8" />
              <button
                onClick={() => setVoiceBlob(null)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                删除
              </button>
            </div>
          ) : (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`
                w-full py-3 rounded-xl text-sm font-medium transition-all
                ${isRecording
                  ? 'bg-red-500/20 border border-red-500 text-red-400'
                  : 'bg-surface hover:bg-surface-light text-slate-300'
                }
              `}
            >
              {isRecording ? '⏹ 停止录制' : '🎙 开始录音'}
            </button>
          )}
        </div>

        {/* Mood tags */}
        <div>
          <label className="block text-sm text-slate-300 mb-2">
            心情标签 (可选, 最多3个)
          </label>
          <div className="flex flex-wrap gap-2">
            {EMOTION_TAGS.map((tag) => {
              const isSelected = moodTags.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => toggleMoodTag(tag)}
                  className={`
                    px-3 py-1.5 rounded-full text-xs transition-all
                    ${isSelected
                      ? 'bg-primary/20 border border-primary text-primary-light'
                      : 'bg-surface border border-transparent text-slate-400 hover:text-white'
                    }
                  `}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-sm text-slate-300 mb-2">可见范围</label>
          <div className="flex gap-2">
            {[
              { value: 'public' as const, label: '🌍 所有人' },
              { value: 'private' as const, label: '👤 仅指定人' },
              { value: 'link_only' as const, label: '🔗 仅链接' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setVisibility(opt.value)}
                className={`
                  flex-1 py-2 rounded-lg text-xs transition-all
                  ${visibility === opt.value
                    ? 'bg-primary/20 border border-primary text-primary-light'
                    : 'bg-surface text-slate-400'
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400 text-center">{error}</p>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className={`
            w-full py-4 rounded-xl text-sm font-bold transition-all
            ${canSubmit && !isSubmitting
              ? 'bg-accent hover:bg-accent-light text-black'
              : 'bg-surface text-slate-500 cursor-not-allowed'
            }
          `}
        >
          {isSubmitting ? '封存中...' : '📮 封存时空胶囊'}
        </button>
      </div>
    </div>
  )
}
