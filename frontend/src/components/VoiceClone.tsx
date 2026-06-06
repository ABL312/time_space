import { useState, useRef, useCallback } from 'react'
import { aiApi } from '../lib/api'
import { getErrorMessage } from '../lib/client'
import type { VoiceCloneResult } from '../types'

interface VoiceCloneProps {
  /** If provided, the cloned voice URL will be associated with this capsule */
  capsuleId?: string
  /** Callback when cloning completes successfully */
  onComplete?: (result: VoiceCloneResult) => void
  /** Placeholder for the text input */
  placeholder?: string
  /** Max recording duration in seconds */
  maxRecordSeconds?: number
}

type Status = 'idle' | 'recording' | 'uploading' | 'ready' | 'playing' | 'error'

export default function VoiceClone({
  capsuleId,
  onComplete,
  placeholder = '输入你想让这个声音说的话...',
  maxRecordSeconds = 10,
}: VoiceCloneProps) {
  // capsuleId is reserved for future voice-capsule association
  void capsuleId
  const [status, setStatus] = useState<Status>('idle')
  const [text, setText] = useState('')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [result, setResult] = useState<VoiceCloneResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [recordTime, setRecordTime] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<number>(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // ── Recording ──
  const startRecording = useCallback(async () => {
    setErrorMsg(null)
    setResult(null)
    setRecordTime(0)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      const chunks: Blob[] = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType })
        setAudioBlob(blob)
        stream.getTracks().forEach((t) => t.stop())
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setStatus('recording')

      // Countdown timer
      let elapsed = 0
      timerRef.current = window.setInterval(() => {
        elapsed += 0.1
        setRecordTime(Math.min(elapsed, maxRecordSeconds))
        if (elapsed >= maxRecordSeconds) {
          mediaRecorder.stop()
          setStatus('idle')
          clearInterval(timerRef.current)
        }
      }, 100)
    } catch {
      setErrorMsg('无法访问麦克风，请检查浏览器权限')
      setStatus('error')
    }
  }, [maxRecordSeconds])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setStatus('idle')
      clearInterval(timerRef.current)
    }
  }, [])

  // ── Upload & Clone ──
  const handleClone = useCallback(async () => {
    if (!audioBlob || !text.trim()) return

    setStatus('uploading')
    setErrorMsg(null)

    try {
      const res = await aiApi.cloneVoice(audioBlob, text.trim())
      setResult(res)
      setStatus('ready')
      onComplete?.(res)
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, '声音克隆失败，请重试'))
      setStatus('error')
    }
  }, [audioBlob, text, onComplete])

  // ── Playback ──
  const playClonedAudio = useCallback(() => {
    if (!result?.audio_url || !audioRef.current) return

    if (audioRef.current.paused) {
      audioRef.current.play()
      setStatus('playing')
    } else {
      audioRef.current.pause()
      setStatus('ready')
    }
  }, [result])

  const handleAudioEnded = useCallback(() => {
    setStatus('ready')
  }, [])

  // ── Reset ──
  const reset = useCallback(() => {
    setStatus('idle')
    setAudioBlob(null)
    setResult(null)
    setErrorMsg(null)
    setRecordTime(0)
    setText('')
  }, [])

  // ── Render ──
  return (
    <div className="space-y-4">
      {/* Hidden audio element for playback */}
      <audio
        ref={audioRef}
        src={result?.audio_url}
        onEnded={handleAudioEnded}
        className="hidden"
      />

      {/* Step 1: Record voice sample */}
      <div>
        <label className="block text-sm text-slate-300 mb-2">
          ① 录制声音样本 (最长{maxRecordSeconds}秒)
        </label>

        {status === 'recording' ? (
          <div className="flex items-center gap-3 glass rounded-xl p-3">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-sm flex-1">
              录制中... {recordTime.toFixed(1)}s
            </span>
            <button
              onClick={stopRecording}
              className="px-4 py-1.5 rounded-lg bg-red-500/20 border border-red-500 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
            >
              ⏹ 停止
            </button>
          </div>
        ) : audioBlob && status !== 'uploading' && status !== 'ready' ? (
          <div className="flex items-center gap-3 glass rounded-xl p-3">
            <audio
              src={URL.createObjectURL(audioBlob)}
              controls
              className="flex-1 h-8"
            />
            <button
              onClick={startRecording}
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              重录
            </button>
          </div>
        ) : (
          <button
            onClick={startRecording}
            disabled={status === 'uploading'}
            className={`
              w-full py-3 rounded-xl text-sm font-medium transition-all
              ${status === 'uploading'
                ? 'bg-surface text-slate-500 cursor-not-allowed'
                : 'bg-surface hover:bg-surface-light text-slate-300 border border-slate-600 hover:border-primary'
              }
            `}
          >
            🎙 开始录制声音样本
          </button>
        )}
      </div>

      {/* Step 2: Text to speak */}
      <div>
        <label className="block text-sm text-slate-300 mb-2">
          ② 输入文字内容
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          maxLength={200}
          rows={3}
          disabled={status === 'uploading'}
          className="w-full px-4 py-3 rounded-xl bg-surface border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors resize-none disabled:opacity-50"
        />
        <p className="text-xs text-slate-500 mt-1 text-right">
          {text.length}/200
        </p>
      </div>

      {/* Step 3: Clone button */}
      {status !== 'ready' && status !== 'playing' && (
        <button
          onClick={handleClone}
          disabled={!audioBlob || !text.trim() || status === 'uploading'}
          className={`
            w-full py-4 rounded-xl text-sm font-bold transition-all
            ${audioBlob && text.trim() && status !== 'uploading'
              ? 'bg-accent hover:bg-accent-light text-black'
              : 'bg-surface text-slate-500 cursor-not-allowed'
            }
          `}
        >
          {status === 'uploading' ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              声音克隆中...
            </span>
          ) : (
            '🔮 生成克隆语音'
          )}
        </button>
      )}

      {/* Result: Play cloned audio */}
      {(status === 'ready' || status === 'playing') && result && (
        <div className="glass rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-green-400">✅ 克隆完成</p>
            <span className="text-xs text-slate-500">
              {result.duration_seconds > 0
                ? `时长 ${result.duration_seconds.toFixed(1)}s`
                : ''}
            </span>
          </div>

          <button
            onClick={playClonedAudio}
            className={`
              w-full py-3 rounded-xl text-sm font-medium transition-all
              ${status === 'playing'
                ? 'bg-primary/20 border border-primary text-primary-light'
                : 'bg-surface hover:bg-surface-light text-slate-300 border border-slate-600'
              }
            `}
          >
            {status === 'playing' ? '⏸ 暂停播放' : '▶️ 播放克隆语音'}
          </button>

          <button
            onClick={reset}
            className="w-full py-2 text-xs text-slate-500 hover:text-slate-400 transition-colors"
          >
            重新克隆
          </button>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="glass rounded-xl p-3 border border-red-500/30">
          <p className="text-xs text-red-400 text-center">{errorMsg}</p>
          <button
            onClick={reset}
            className="w-full mt-2 py-1.5 text-xs text-slate-500 hover:text-slate-400"
          >
            重试
          </button>
        </div>
      )}

      {/* Fallback notice */}
      {result?.voice_id === 'fallback' && (
        <p className="text-xs text-amber-400 text-center">
          ⚠️ 使用演示音频 (API 暂不可用)
        </p>
      )}
    </div>
  )
}
