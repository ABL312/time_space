import { request, upload, buildQuery } from './client'
import type { SceneResult, LocationContext, VoiceCloneResult } from '../types'

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

  /** Clone voice from audio sample */
  cloneVoice(sample: Blob, text: string): Promise<VoiceCloneResult> {
    const formData = new FormData()
    formData.append('sample', sample)
    formData.append('text', text)
    return upload('/ai/voice-clone', formData)
  },
}
