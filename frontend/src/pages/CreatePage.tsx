import { useState, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useGeolocation } from '../hooks/useGeolocation'
import { useUserStore } from '../stores/userStore'
import { capsulesApi, aiApi, getErrorMessage } from '../lib/api'
import { EMOTION_TAGS } from '../types'
import { PageShell, Card, Badge, Button, SectionLabel } from '../components/ui'

export default function CreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const replyTo = searchParams.get('reply_to')
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
      if (replyTo) {
        await capsulesApi.reply(replyTo, fd)
      } else {
        await capsulesApi.create(fd)
      }
      navigate('/')
    } catch (err: unknown) { setError(getErrorMessage(err, '创建失败')) }
    finally { setIsSubmitting(false) }
  }

  return (
    <PageShell title="书写岁月来信" backTo={-1}>
      <div className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-6 stagger font-serif">

        {/* GPS */}
        <section>
          <SectionLabel>📍 定位锁定</SectionLabel>
          <Card padding="sm" className="mt-2 border-primary/15 bg-surface/30">
            {latitude && longitude ? (
              <div className="flex items-center justify-between text-sm text-text-primary">
                <span>纬度: {latitude.toFixed(6)}°N</span>
                <span>经度: {longitude.toFixed(6)}°E</span>
                <Badge variant="success" className="font-serif font-bold">已锁定此地</Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="warning" className="font-serif">{geoError || '正在获取当前物理位置...'}</Badge>
              </div>
            )}
          </Card>
        </section>

        {/* MESSAGE */}
        <section>
          <SectionLabel>✉️ 来信内容</SectionLabel>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="在此刻的角落写下你想留给岁月的话，或者给后来路过此地之人的私语..."
            maxLength={500}
            rows={6}
            className="mt-2 w-full px-4 py-3 bg-bg border border-primary/20 rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-all resize-none text-sm leading-relaxed font-serif"
          />
          <div className="flex justify-between mt-1 text-xs">
            <span className={message.length < 10 ? 'text-data-warn' : 'text-data-good'}>
              {message.length < 10 ? `还差至少 ${10 - message.length} 个字` : '字数符合要求'}
            </span>
            <span className="text-text-muted">{message.length}/500</span>
          </div>
        </section>

        {/* PHOTOS */}
        <section>
          <SectionLabel>📸 附信照片 (最多 5 张)</SectionLabel>
          <div className="flex flex-wrap gap-2.5 mt-2">
            {photos.map((photo, i) => (
              <div key={i} className="relative w-20 h-20 border border-primary/10 rounded-md overflow-hidden bg-primary/5 shadow-sm">
                <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-4 h-4 bg-red-500/90 text-white text-[10px] flex items-center justify-center rounded-full cursor-pointer">×</button>
              </div>
            ))}
            {photos.length < 5 && (
              <button onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 border border-dashed border-primary/20 rounded-md flex items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer bg-surface/10">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" multiple onChange={handlePhotoSelect} className="hidden" />
        </section>

        {/* VOICE */}
        <section>
          <SectionLabel>🎙️ 录制原声 (可选，最长60秒)</SectionLabel>
          {voiceBlob ? (
            <Card padding="sm" className="mt-2 flex items-center gap-3 border-primary/15 bg-surface/30">
              <audio src={URL.createObjectURL(voiceBlob)} controls className="flex-1 h-8" />
              <Button variant="danger" size="sm" onClick={() => setVoiceBlob(null)} className="font-serif text-xs">清除</Button>
            </Card>
          ) : (
            <Button
              variant={isRecording ? 'danger' : 'secondary'}
              size="lg"
              onClick={isRecording ? stopRecording : startRecording}
              className="w-full mt-2 font-serif font-bold text-sm py-3 cursor-pointer"
            >
              {isRecording ? '⏹️ 结束录音' : '🎙️ 开始录音'}
            </Button>
          )}
        </section>

        {/* VOICE CLONE */}
        <section>
          <SectionLabel>🗣️ AI 语音克隆朗读 (可选)</SectionLabel>
          <Card padding="md" className="mt-2 space-y-4 border-primary/15 bg-surface/30">
            <p className="text-xs text-text-secondary leading-relaxed">提供一段 10 秒的语音样本，AI 将用你的模拟声音朗读信件内容。</p>
            
            {/* Sample Recording */}
            <div>
              <SectionLabel className="text-[10px] text-primary">录制 10 秒语音样本</SectionLabel>
              {voiceSampleBlob ? (
                <div className="flex items-center gap-3 mt-2">
                  <audio src={URL.createObjectURL(voiceSampleBlob)} controls className="flex-1 h-8" />
                  <Button variant="danger" size="sm" onClick={() => setVoiceSampleBlob(null)} className="font-serif text-xs">清除</Button>
                </div>
              ) : (
                <Button
                  variant={isSampleRecording ? 'danger' : 'secondary'}
                  size="lg"
                  onClick={isSampleRecording ? stopSampleRecording : startSampleRecording}
                  className="w-full mt-2 font-serif font-bold text-xs py-2.5 cursor-pointer"
                >
                  {isSampleRecording ? '⏹️ 结束样本录制' : '🎙️ 开始样本录制 (10秒)'}
                </Button>
              )}
            </div>
            
            {/* Text Input */}
            <div>
              <SectionLabel className="text-[10px] text-primary">朗读文本</SectionLabel>
              <textarea
                value={cloneText}
                onChange={(e) => setCloneText(e.target.value)}
                placeholder={message || "若留空，AI将默认朗读上方的信件正文..."}
                maxLength={500}
                rows={3}
                className="mt-2 w-full px-3 py-2 bg-bg border border-primary/20 rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-all resize-none text-xs font-serif"
              />
            </div>
            
            {/* Generate Button */}
            <Button
              variant="primary"
              size="md"
              onClick={handleVoiceClone}
              disabled={!voiceSampleBlob || isCloning}
              loading={isCloning}
              className="w-full font-serif font-bold text-xs py-2.5 cursor-pointer"
            >
              生成模拟声音
            </Button>
            
            {/* Preview */}
            {voiceCloneUrl && (
              <div className="pt-3 border-t border-primary/10">
                <SectionLabel className="text-[10px] text-primary">模拟语音预览</SectionLabel>
                <audio src={voiceCloneUrl} controls className="w-full mt-2 h-10" />
              </div>
            )}
            
            {/* Error */}
            {error && !message.includes(error) && (
              <p className="text-xs text-data-bad text-center">{error}</p>
            )}
          </Card>
        </section>

        {/* MOOD TAGS */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>🏷️ 选择情感标签 (最多 3 个)</SectionLabel>
            <span className="text-xs text-text-muted">{moodTags.length}/3</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {EMOTION_TAGS.map((tag) => {
              const sel = moodTags.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => toggleMoodTag(tag)}
                  className={`px-3 py-1.5 text-xs font-serif rounded-full border transition-all cursor-pointer ${
                    sel 
                      ? 'border-primary bg-primary text-white font-bold' 
                      : 'border-primary/20 bg-bg text-text-secondary hover:border-primary/50'
                  }`}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </section>

        {/* TIME LOCK */}
        <section>
          <SectionLabel>🔒 时空信锁</SectionLabel>
          <Card padding="md" className="mt-2 space-y-4 border-primary/15 bg-surface/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-primary">设置未来的开启日期</span>
              <button
                onClick={() => setUseTimeLock(!useTimeLock)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                  useTimeLock ? 'bg-primary' : 'bg-primary/20'
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
              <div className="pt-2 border-t border-primary/10">
                <label className="block text-xs text-text-secondary mb-2">
                  设定解锁时间 (必须是一天之后)
                </label>
                <input
                  type="datetime-local"
                  value={unlockAt}
                  onChange={(e) => setUnlockAt(e.target.value)}
                  min={getMinUnlockTime()}
                  className="w-full px-3 py-2 bg-bg border border-primary/20 rounded-md text-text-primary focus:outline-none focus:border-primary transition-all text-sm font-sans"
                />
                <p className="mt-2 text-xs text-text-muted leading-relaxed">
                  开启此项后，来信将被时空锁封存，在设定的日期到达前，任何人都无法查看和阅读该信件内容。
                </p>
              </div>
            )}
          </Card>
        </section>

        {/* VISIBILITY */}
        <section>
          <SectionLabel>👁️ 查看权限</SectionLabel>
          <div className="flex gap-2 mt-2">
            {([
              { value: 'public' as const, label: '公开可见' },
              { value: 'private' as const, label: '私密来信' },
              { value: 'link_only' as const, label: '仅限链接' },
            ]).map((opt) => (
              <Button
                key={opt.value}
                variant={visibility === opt.value ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setVisibility(opt.value)}
                className={`flex-1 font-serif font-bold text-xs py-2 rounded-md ${visibility === opt.value ? '' : 'border border-primary/20 bg-bg text-text-secondary'}`}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-xs text-text-muted leading-relaxed">
            {visibility === 'public' && '公开：任何人在地图上路过此地时，都可发现并开启此信。'}
            {visibility === 'private' && '私密：仅你自己，或当在信件中指定了收信人ID时收信人可见。'}
            {visibility === 'link_only' && '仅限链接：地图上不公开显示此信，仅持有该信件私密链接的人可查看。'}
          </p>
        </section>

        {/* ERROR */}
        {error && <p className="text-xs text-data-bad text-center">{error}</p>}

        {/* DEPLOY */}
        <div className="border-t border-primary/10 my-4" />
        <Button
          variant="capsule"
          size="lg"
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          loading={isSubmitting}
          className="w-full font-serif font-bold py-3.5 text-sm"
        >
          封存并寄出时空信件
        </Button>
      </div>
    </PageShell>
  )
}
