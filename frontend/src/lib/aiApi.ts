import { request, upload, buildQuery } from './client'
import type { ARSceneLayout, SceneResult, LocationContext, VoiceCloneResult } from '../types'

/** Fish Audio API key — loaded from env or hardcoded for dev */
const FISH_AUDIO_KEY = import.meta.env.VITE_FISH_AUDIO_API_KEY || ''
const FISH_API = 'https://api.fish.audio'

/** AI API - emotion analysis, location context, scene recognition, voice clone */
export const aiApi = {
  /** Analyze emotion in a message */
  analyzeEmotion(message: string): Promise<{
    emotions: string[]
    sentiment: string
    intensity: number
    summary: string
  }> {
    return request('/ai/analyze-emotion', {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  },

  /** Get location context from GPS coordinates */
  getLocationContext(lat: number, lng: number): Promise<LocationContext> {
    return request(`/ai/location-context${buildQuery({ lat, lng })}`)
  },

  /** Recognize scene from camera frame */
  recognizeScene(image: Blob, lat: number, lng: number): Promise<SceneResult> {
    const formData = new FormData()
    formData.append('image', image)
    formData.append('latitude', String(lat))
    formData.append('longitude', String(lng))
    return upload('/ai/scene', formData)
  },

  /** Use Qwen-VL to choose a stable 2.5D AR card placement */
  getARSceneLayout(image: Blob, lat: number, lng: number, capsuleCount: number): Promise<ARSceneLayout> {
    const formData = new FormData()
    formData.append('image', image)
    formData.append('latitude', String(lat))
    formData.append('longitude', String(lng))
    formData.append('capsule_count', String(capsuleCount))
    return upload('/ai/ar-scene-layout', formData, 35000)
  },

  /**
   * Clone voice from audio sample using Fish Audio API (direct browser call).
   * Flow:
   *   1. POST /model     → create instant voice model from sample
   *   2. POST /v1/tts    → generate speech with cloned voice
   *   3. DELETE /model/id → cleanup temp model
   *   4. Return blob URL for playback
   */
  async cloneVoice(sample: Blob, text: string): Promise<VoiceCloneResult> {
    if (!FISH_AUDIO_KEY) {
      // No API key → fall back to backend endpoint (which returns fallback audio)
      const formData = new FormData()
      formData.append('sample', sample)
      formData.append('text', text)
      return upload('/ai/voice-clone', formData)
    }

    const headers = { Authorization: `Bearer ${FISH_AUDIO_KEY}` }

    // ── Step 1: Create voice model ──
    const modelForm = new FormData()
    modelForm.append('visibility', 'private')
    modelForm.append('type', 'tts')
    modelForm.append('title', `clone_${Date.now()}`)
    modelForm.append('train_mode', 'fast')
    modelForm.append('voices', sample, 'sample.webm')

    const modelRes = await fetch(`${FISH_API}/model`, {
      method: 'POST',
      headers,
      body: modelForm,
    })

    if (!modelRes.ok) {
      const err = await modelRes.json().catch(() => ({ message: modelRes.statusText }))
      throw new Error(err.message || `Fish Audio model creation failed: ${modelRes.status}`)
    }

    const modelData = await modelRes.json()
    const modelId: string = modelData._id

    try {
      // ── Step 2: Generate speech (TTS) ──
      const ttsRes = await fetch(`${FISH_API}/v1/tts`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          model: 's2-pro',
        },
        body: JSON.stringify({
          text,
          reference_id: modelId,
          format: 'mp3',
          mp3_bitrate: 128,
          latency: 'normal',
        }),
      })

      if (!ttsRes.ok) {
        const err = await ttsRes.json().catch(() => ({ message: ttsRes.statusText }))
        throw new Error(err.message || `Fish Audio TTS failed: ${ttsRes.status}`)
      }

      const audioBlob = await ttsRes.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      // Estimate duration: 128 kbps MP3 ≈ 16000 bytes/sec
      const duration = audioBlob.size > 0
        ? Math.round((audioBlob.size / 16000) * 10) / 10
        : text.length * 0.15

      return {
        voice_id: modelId,
        audio_url: audioUrl,
        duration_seconds: duration,
      }
    } finally {
      // ── Step 3: Cleanup temp model ──
      fetch(`${FISH_API}/model/${modelId}`, {
        method: 'DELETE',
        headers,
      }).catch(() => {
        /* ignore cleanup errors */
      })
    }
  },
}

