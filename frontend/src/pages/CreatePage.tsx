import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGeolocation } from '../hooks/useGeolocation'
import { useUserStore } from '../stores/userStore'
import { capsulesApi, aiApi } from '../lib/api'
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
  
  // Voice clone states
  const [voiceSampleBlob, setVoiceSampleBlob] = useState<Blob | null>(null)
  const [isSampleRecording, setIsSampleRecording] = useState(false)
  const [cloneText, setCloneText] = useState('')
  const [isCloning, setIsCloning] = useState(false)
  const [voiceCloneUrl, setVoiceCloneUrl] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const voiceSampleRecorderRef = useRef<MediaRecorder | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleMoodTag = (tag: string) => {
    setMoodTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 3 ? [...prev, tag] : prev
    )
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + photos.length > 5) { setError('最多上传5张照片'); return }
    setPhotos((prev) => [...prev, ...files])
  }

  const removePhoto = (index: number) => setPhotos((prev) => prev.filter((_, i) => i !== index))

  const startRecording = useCallback(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        const chunks: Blob[] = []
        mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
        mr.onstop = () => {
          setVoiceBlob(new Blob(chunks, { type: 'audio/webm' }))
          stream.getTracks().forEach((t) => t.stop())
        }
        mr.start()
        mediaRecorderRef.current = mr
        setIsRecording(true)
        setTimeout(() => { if (mr.state === 'recording') { mr.stop(); setIsRecording(false) } }, 60000)
      } catch { setError('无法访问麦克风') }
    }, [])

    const startSampleRecording = useCallback(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        const chunks: Blob[] = []
        mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
        mr.onstop = () => {
          setVoiceSampleBlob(new Blob(chunks, { type: 'audio/webm' }))
          stream.getTracks().forEach((t) => t.stop())
        }
        mr.start()
        voiceSampleRecorderRef.current = mr
        setIsSampleRecording(true)
        // 10 second limit for voice sample
        setTimeout(() => { if (mr.state === 'recording') { mr.stop(); setIsSampleRecording(false) } }, 10000)
      } catch { setError('无法访问麦克风') }
    }, [])

    const stopRecording = useCallback(() => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
        setIsRecording(false)
      }
    }, [])

    const stopSampleRecording = useCallback(() => {
      if (voiceSampleRecorderRef.current?.state === 'recording') {
        voiceSampleRecorderRef.current.stop()
        setIsSampleRecording(false)
      }
    }, [])

  const handleVoiceClone = async () => {
    if (!voiceSampleBlob) { 
      setError('请先录制语音样本')
      return 
    }
    
    setIsCloning(true)
    setError(null)
    
    try {
      const res = await aiApi.cloneVoice(voiceSampleBlob, cloneText || message)
      setVoiceCloneUrl(res.audio_url)
    } catch (err: any) {
      setError(err.message || '声音克隆失败')
    } finally {
      setIsCloning(false)
    }
  }

  const canSubmit = message.length >= 10 && message.length <= 500 && latitude && longitude

  const handleSubmit = async () => {
      if (!canSubmit || !latitude || !longitude) return
      if (!user) { setError('请先登录'); return }
      setIsSubmitting(true)
      setError(null)
      try {
        const fd = new FormData()
        fd.append('author_id', user.id)
        fd.append('message', message)
        fd.append('latitude', String(latitude))
        fd.append('longitude', String(longitude))
        fd.append('visibility', visibility)
        if (moodTags.length > 0) fd.append('mood_tag', moodTags[0])
        photos.forEach((p) => fd.append('photos', p))
        if (voiceBlob) fd.append('voice', voiceBlob, 'recording.webm')
        if (voiceCloneUrl) fd.append('voice_clone_url', voiceCloneUrl)
        await capsulesApi.create(fd)
        navigate('/')
      } catch (err: any) { setError(err.message || '创建失败') }
      finally { setIsSubmitting(false) }
    }

  return (
    <div className="min-h-screen bg-bg page-in">
      {/* NAV */}
      <header className="sticky top-0 z-30 hud px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="btn flex items-center gap-2 text-slate-400 hover:text-signal transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <span className="text-xs font-mono tracking-wider">RETURN</span>
        </button>
        <span className="label">DEPLOY CAPSULE</span>
        <div className="w-16" />
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-6 stagger">

        {/* GPS */}
        <section>
          <div className="label mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-px bg-signal-dim" />
            LOCATION_LOCK
          </div>
          <div className="panel p-3">
            {latitude && longitude ? (
              <div className="flex items-center justify-between">
                <span className="data-value text-sm font-mono">{latitude.toFixed(6)}°N</span>
                <span className="data-value text-sm font-mono">{longitude.toFixed(6)}°E</span>
                <div className="w-2 h-2 bg-data-good" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-data-warn breathe" />
                <span className="data text-data-warn">{geoError || 'Acquiring position...'}</span>
              </div>
            )}
          </div>
        </section>

        {/* MESSAGE */}
        <section>
          <div className="label mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-px bg-signal-dim" />
            MESSAGE_PAYLOAD
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="写下你想留在这里的话..."
            maxLength={500}
            rows={5}
            className="w-full px-4 py-3 bg-surface border border-border text-white placeholder-slate-600 focus:outline-none focus:border-signal transition-colors resize-none text-sm leading-relaxed"
          />
          <div className="flex justify-between mt-1">
            <span className={`data ${message.length < 10 ? 'text-data-warn' : 'text-data-good'}`}>
              {message.length < 10 ? `MIN ${10 - message.length} CHARS MORE` : 'VALID'}
            </span>
            <span className="data">{message.length}/500</span>
          </div>
        </section>

        {/* PHOTOS */}
        <section>
          <div className="label mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-px bg-signal-dim" />
            PHOTO_ARCHIVE [max 5]
          </div>
          <div className="flex flex-wrap gap-2">
            {photos.map((photo, i) => (
              <div key={i} className="relative w-20 h-20 border border-border overflow-hidden">
                <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removePhoto(i)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-data-bad/90 text-white text-[10px] flex items-center justify-center">×</button>
              </div>
            ))}
            {photos.length < 5 && (
              <button onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 border border-dashed border-surface-light flex items-center justify-center text-slate-500 hover:border-signal hover:text-signal transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" multiple onChange={handlePhotoSelect} className="hidden" />
        </section>

        {/* VOICE */}
                <section>
                  <div className="label mb-2 flex items-center gap-2">
                    <span className="inline-block w-2 h-px bg-signal-dim" />
                    VOICE_RECORD [optional, max 60s]
                  </div>
                  {voiceBlob ? (
                    <div className="panel p-3 flex items-center gap-3">
                      <audio src={URL.createObjectURL(voiceBlob)} controls className="flex-1 h-8" />
                      <button onClick={() => setVoiceBlob(null)} className="data text-data-bad hover:text-red-300 transition-colors">CLEAR</button>
                    </div>
                  ) : (
                    <button onClick={isRecording ? stopRecording : startRecording}
                      className={`btn w-full py-3 border text-xs font-mono tracking-wider transition-all ${
                        isRecording
                          ? 'border-data-bad/30 bg-data-bad/5 text-data-bad'
                          : 'border-border bg-surface/50 text-slate-400 hover:border-surface-light'
                      }`}>
                      {isRecording ? 'STOP RECORDING' : 'START RECORDING'}
                    </button>
                  )}
                </section>

                {/* VOICE CLONE */}
                <section>
                  <div className="label mb-2 flex items-center gap-2">
                    <span className="inline-block w-2 h-px bg-signal-dim" />
                    AI_VOICE_CLONE [optional]
                  </div>
                  <div className="panel p-4 space-y-4">
                    <p className="text-sm text-slate-400">上传 10 秒语音样本，AI 将用你的声音朗读留言</p>
            
                    {/* Sample Recording */}
                    <div>
                      <div className="label mb-2">语音样本录制 [10秒]</div>
                      {voiceSampleBlob ? (
                        <div className="flex items-center gap-3">
                          <audio src={URL.createObjectURL(voiceSampleBlob)} controls className="flex-1 h-8" />
                          <button 
                            onClick={() => setVoiceSampleBlob(null)}
                            className="data text-data-bad hover:text-red-300 transition-colors"
                          >
                            CLEAR
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={isSampleRecording ? stopSampleRecording : startSampleRecording}
                          className={`btn w-full py-3 border text-xs font-mono tracking-wider transition-all ${
                            isSampleRecording
                              ? 'border-data-bad/30 bg-data-bad/5 text-data-bad'
                              : 'border-border bg-surface/50 text-slate-400 hover:border-surface-light'
                          }`}
                        >
                          {isSampleRecording ? 'STOP RECORDING' : 'START RECORDING'}
                        </button>
                      )}
                    </div>
            
                    {/* Text Input */}
                    <div>
                      <div className="label mb-2">朗读文本</div>
                      <textarea
                        value={cloneText}
                        onChange={(e) => setCloneText(e.target.value)}
                        placeholder={message || "输入要朗读的文字..."}
                        maxLength={500}
                        rows={3}
                        className="w-full px-3 py-2 bg-surface border border-border text-white placeholder-slate-600 focus:outline-none focus:border-signal transition-colors resize-none text-sm"
                      />
                    </div>
            
                    {/* Generate Button */}
                    <button
                      onClick={handleVoiceClone}
                      disabled={!voiceSampleBlob || isCloning}
                      className={`btn w-full py-2.5 text-xs font-mono tracking-wider border transition-all ${
                        voiceSampleBlob && !isCloning
                          ? 'border-primary/40 bg-primary/5 text-primary-light hover:bg-primary/10'
                          : 'border-border text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {isCloning ? 'GENERATING...' : 'GENERATE CLONED VOICE'}
                    </button>
            
                    {/* Preview */}
                    {voiceCloneUrl && (
                      <div className="pt-2 border-t border-border">
                        <div className="label mb-2">预览</div>
                        <audio src={voiceCloneUrl} controls className="w-full" />
                      </div>
                    )}
            
                    {/* Error */}
                    {error && !message.includes(error) && (
                      <p className="data text-data-bad text-center">{error}</p>
                    )}
                  </div>
                </section>

        {/* MOOD TAGS */}
        <section>
          <div className="label mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="inline-block w-2 h-px bg-signal-dim" />
              EMOTION_TAGS
            </span>
            <span className="data">{moodTags.length}/3</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EMOTION_TAGS.map((tag) => {
              const sel = moodTags.includes(tag)
              return (
                <button key={tag} onClick={() => toggleMoodTag(tag)}
                  className={`btn px-2.5 py-1 text-xs font-mono border transition-all ${
                    sel ? 'border-primary/40 bg-primary/5 text-primary-light' : 'border-border text-slate-500 hover:text-slate-300'
                  }`}>
                  {tag}
                </button>
              )
            })}
          </div>
        </section>

        {/* VISIBILITY */}
        <section>
          <div className="label mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-px bg-signal-dim" />
            ACCESS_LEVEL
          </div>
          <div className="flex gap-1.5">
            {([
              { value: 'public' as const, label: 'PUBLIC' },
              { value: 'private' as const, label: 'PRIVATE' },
              { value: 'link_only' as const, label: 'LINK ONLY' },
            ]).map((opt) => (
              <button key={opt.value} onClick={() => setVisibility(opt.value)}
                className={`btn flex-1 py-2.5 text-[10px] font-mono tracking-wider border transition-all ${
                  visibility === opt.value
                    ? 'border-signal/40 bg-signal/5 text-signal'
                    : 'border-border text-slate-500'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* ERROR */}
        {error && <p className="data text-data-bad text-center">{error}</p>}

        {/* DEPLOY */}
        <div className="divider mb-4" />
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className={`btn w-full py-4 text-xs font-mono tracking-widest border transition-all ${
            canSubmit && !isSubmitting
              ? 'border-capsule/40 bg-capsule/5 text-capsule hover:bg-capsule/10'
              : 'border-border text-slate-600 cursor-not-allowed'
          }`}>
          {isSubmitting ? 'DEPLOYING...' : 'DEPLOY CAPSULE'}
        </button>
      </div>
    </div>
  )
}
