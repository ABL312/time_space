import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGeolocation } from '../hooks/useGeolocation'
import { useUserStore } from '../stores/userStore'
import { capsulesApi, aiApi, getErrorMessage } from '../lib/api'
import { EMOTION_TAGS } from '../types'
import { PageShell, Card, Badge, Button, SectionLabel } from '../components/ui'

export default function CreatePage() {
  const navigate = useNavigate()
  const { user } = useUserStore()
  const { latitude: rawLat, longitude: rawLng, error: geoError } = useGeolocation()
  const latitude = rawLat ?? 31.0282
  const longitude = rawLng ?? 121.4346

  const [message, setMessage] = useState('')
  const [moodTags, setMoodTags] = useState<string[]>([])
  const [visibility, setVisibility] = useState<'public' | 'private' | 'link_only'>('public')
  const [photos, setPhotos] = useState<File[]>([])
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Time lock states
  const [useTimeLock, setUseTimeLock] = useState(false)
  const [unlockAt, setUnlockAt] = useState<string>('')
  
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
    } catch (err: unknown) {
      setError(getErrorMessage(err, '声音克隆失败'))
    } finally {
      setIsCloning(false)
    }
  }

  const canSubmit = message.length >= 10 && message.length <= 500 && latitude && longitude

  const getMinUnlockTime = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().slice(0, 16)
  }

  const handleSubmit = async () => {
      if (!canSubmit || !latitude || !longitude) return
      if (!user) { setError('请先登录'); return }
      if (useTimeLock && !unlockAt) { setError('请选择解锁时间'); return }
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
        if (useTimeLock && unlockAt) {
          const unlockDate = new Date(unlockAt)
          fd.append('unlock_at', unlockDate.toISOString())
        }
        photos.forEach((p) => fd.append('photos', p))
        if (voiceBlob) fd.append('voice', voiceBlob, 'recording.webm')
        if (voiceCloneUrl) fd.append('voice_clone_url', voiceCloneUrl)
        await capsulesApi.create(fd)
        navigate('/')
      } catch (err: unknown) { setError(getErrorMessage(err, '创建失败')) }
      finally { setIsSubmitting(false) }
    }

  return (
    <PageShell title="DEPLOY CAPSULE" backTo={-1}>
      <div className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-6 stagger">

        {/* GPS */}
        <section>
          <SectionLabel>LOCATION_LOCK</SectionLabel>
          <Card variant="default" padding="sm" className="mt-2">
            {latitude && longitude ? (
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-text-primary">{latitude.toFixed(6)}°N</span>
                <span className="text-sm font-mono text-text-primary">{longitude.toFixed(6)}°E</span>
                <Badge variant="success" dot>LOCKED</Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="warning" dot>{geoError || 'Acquiring position...'}</Badge>
              </div>
            )}
          </Card>
        </section>

        {/* MESSAGE */}
        <section>
          <SectionLabel>MESSAGE_PAYLOAD</SectionLabel>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="写下你想留在这里的话..."
            maxLength={500}
            rows={5}
            className="mt-2 w-full px-4 py-3 bg-surface border border-border rounded-[var(--radius-md)] text-white placeholder-slate-600 focus:outline-none focus:border-signal transition-colors resize-none text-sm leading-relaxed"
          />
          <div className="flex justify-between mt-1">
            <span className={`text-xs font-mono ${message.length < 10 ? 'text-data-warn' : 'text-data-good'}`}>
              {message.length < 10 ? `MIN ${10 - message.length} CHARS MORE` : 'VALID'}
            </span>
            <span className="text-xs font-mono text-text-tertiary">{message.length}/500</span>
          </div>
        </section>

        {/* PHOTOS */}
        <section>
          <SectionLabel>PHOTO_ARCHIVE [max 5]</SectionLabel>
          <div className="flex flex-wrap gap-2 mt-2">
            {photos.map((photo, i) => (
              <div key={i} className="relative w-20 h-20 border border-border rounded-[var(--radius-sm)] overflow-hidden">
                <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removePhoto(i)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-data-bad/90 text-white text-[10px] flex items-center justify-center rounded-full">×</button>
              </div>
            ))}
            {photos.length < 5 && (
              <button onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 border border-dashed border-surface-light rounded-[var(--radius-sm)] flex items-center justify-center text-slate-500 hover:border-signal hover:text-signal transition-colors">
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
          <SectionLabel>VOICE_RECORD [optional, max 60s]</SectionLabel>
          {voiceBlob ? (
            <Card variant="default" padding="sm" className="mt-2 flex items-center gap-3">
              <audio src={URL.createObjectURL(voiceBlob)} controls className="flex-1 h-8" />
              <Button variant="danger" size="sm" onClick={() => setVoiceBlob(null)}>CLEAR</Button>
            </Card>
          ) : (
            <Button
              variant={isRecording ? 'danger' : 'secondary'}
              size="lg"
              onClick={isRecording ? stopRecording : startRecording}
              className="w-full mt-2 font-mono tracking-wider"
            >
              {isRecording ? 'STOP RECORDING' : 'START RECORDING'}
            </Button>
          )}
        </section>

        {/* VOICE CLONE */}
        <section>
          <SectionLabel>AI_VOICE_CLONE [optional]</SectionLabel>
          <Card variant="default" padding="md" className="mt-2 space-y-4">
            <p className="text-sm text-text-secondary">上传 10 秒语音样本，AI 将用你的声音朗读留言</p>
            
            {/* Sample Recording */}
            <div>
              <SectionLabel>语音样本录制 [10秒]</SectionLabel>
              {voiceSampleBlob ? (
                <div className="flex items-center gap-3 mt-2">
                  <audio src={URL.createObjectURL(voiceSampleBlob)} controls className="flex-1 h-8" />
                  <Button variant="danger" size="sm" onClick={() => setVoiceSampleBlob(null)}>CLEAR</Button>
                </div>
              ) : (
                <Button
                  variant={isSampleRecording ? 'danger' : 'secondary'}
                  size="lg"
                  onClick={isSampleRecording ? stopSampleRecording : startSampleRecording}
                  className="w-full mt-2 font-mono tracking-wider"
                >
                  {isSampleRecording ? 'STOP RECORDING' : 'START RECORDING'}
                </Button>
              )}
            </div>
            
            {/* Text Input */}
            <div>
              <SectionLabel>朗读文本</SectionLabel>
              <textarea
                value={cloneText}
                onChange={(e) => setCloneText(e.target.value)}
                placeholder={message || "输入要朗读的文字..."}
                maxLength={500}
                rows={3}
                className="mt-2 w-full px-3 py-2 bg-surface border border-border rounded-[var(--radius-md)] text-white placeholder-slate-600 focus:outline-none focus:border-signal transition-colors resize-none text-sm"
              />
            </div>
            
            {/* Generate Button */}
            <Button
              variant="primary"
              size="md"
              onClick={handleVoiceClone}
              disabled={!voiceSampleBlob || isCloning}
              loading={isCloning}
              className="w-full font-mono tracking-wider"
            >
              GENERATE CLONED VOICE
            </Button>
            
            {/* Preview */}
            {voiceCloneUrl && (
              <div className="pt-2 border-t border-border">
                <SectionLabel>预览</SectionLabel>
                <audio src={voiceCloneUrl} controls className="w-full mt-2" />
              </div>
            )}
            
            {/* Error */}
            {error && !message.includes(error) && (
              <p className="text-xs font-mono text-data-bad text-center">{error}</p>
            )}
          </Card>
        </section>

        {/* MOOD TAGS */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>EMOTION_TAGS</SectionLabel>
            <span className="text-xs font-mono text-text-tertiary">{moodTags.length}/3</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EMOTION_TAGS.map((tag) => {
              const sel = moodTags.includes(tag)
              return (
                <Button
                  key={tag}
                  variant={sel ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => toggleMoodTag(tag)}
                  className={`font-mono ${sel ? '' : 'border border-border'}`}
                >
                  {tag}
                </Button>
              )
            })}
          </div>
        </section>

        {/* TIME LOCK */}
        <section>
          <SectionLabel>TIME_LOCK</SectionLabel>
          <Card variant="default" padding="md" className="mt-2 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-primary">设置开启时间</span>
              <button
                onClick={() => setUseTimeLock(!useTimeLock)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  useTimeLock ? 'bg-signal' : 'bg-surface-light'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useTimeLock ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {useTimeLock && (
              <div className="pt-2 border-t border-border">
                <label className="block text-xs font-mono text-text-tertiary mb-2">
                  解锁时间 (至少明天)
                </label>
                <input
                  type="datetime-local"
                  value={unlockAt}
                  onChange={(e) => setUnlockAt(e.target.value)}
                  min={getMinUnlockTime()}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-[var(--radius-md)] text-white focus:outline-none focus:border-signal transition-colors text-sm"
                />
                <p className="mt-2 text-xs text-text-muted">
                  胶囊将在设定的时间自动解锁，之前无法查看内容
                </p>
              </div>
            )}
          </Card>
        </section>

        {/* VISIBILITY */}
        <section>
          <SectionLabel>ACCESS_LEVEL</SectionLabel>
          <div className="flex gap-1.5 mt-2">
            {([
              { value: 'public' as const, label: 'PUBLIC' },
              { value: 'private' as const, label: 'PRIVATE' },
              { value: 'link_only' as const, label: 'LINK ONLY' },
            ]).map((opt) => (
              <Button
                key={opt.value}
                variant={visibility === opt.value ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setVisibility(opt.value)}
                className={`flex-1 font-mono tracking-wider ${visibility === opt.value ? '' : 'border border-border'}`}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </section>

        {/* ERROR */}
        {error && <p className="text-xs font-mono text-data-bad text-center">{error}</p>}

        {/* DEPLOY */}
        <div className="border-t border-border-subtle my-4" />
        <Button
          variant="capsule"
          size="lg"
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          loading={isSubmitting}
          className="w-full font-mono tracking-widest"
        >
          DEPLOY CAPSULE
        </Button>
      </div>
    </PageShell>
  )
}
