import { useState, useEffect, useRef, useCallback } from 'react'
import { aiApi } from '../lib/api'
import { getErrorMessage } from '../lib/client'
import type { SceneResult } from '../types'

interface UseSceneCaptureOptions {
  /** Capture interval in milliseconds (default 10000 = 10s) */
  interval?: number
  /** GPS coordinates of the user */
  latitude: number | null
  longitude: number | null
  /** Whether the camera is ready */
  cameraReady: boolean
}

interface UseSceneCaptureReturn {
  /** Latest scene recognition result */
  scene: SceneResult | null
  /** Whether a capture/analysis is in progress */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Manually trigger a capture (useful for testing) */
  capture: () => Promise<void>
}

/**
 * Captures camera frames every N seconds and sends them to GPT-4o Vision
 * for real-time scene recognition. Returns mood_match tags for recommendation.
 */
export function useSceneCapture(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: UseSceneCaptureOptions
): UseSceneCaptureReturn {
  const { interval = 10000, latitude, longitude, cameraReady } = options

  const [scene, setScene] = useState<SceneResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const intervalRef = useRef<number>(0)
  const sceneRef = useRef<SceneResult | null>(null)

  /** Capture a single frame from the video element and send to API */
  const capture = useCallback(async () => {
    if (!videoRef.current || !cameraReady || !latitude || !longitude) return

    try {
      setIsLoading(true)
      setError(null)

      // Capture frame from video
      const canvas = document.createElement('canvas')
      const video = videoRef.current
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convert to JPEG blob (lower quality for faster upload)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b)
            else reject(new Error('Canvas toBlob failed'))
          },
          'image/jpeg',
          0.6
        )
      })

      // Send to scene recognition API
      const result = await aiApi.recognizeScene(blob, latitude, longitude)
      setScene(result)
      sceneRef.current = result
    } catch (err: unknown) {
      const msg = getErrorMessage(err, '场景识别失败')
      console.warn('Scene capture failed:', msg)
      setError(msg)
      // Don't clear previous result on transient errors
    } finally {
      setIsLoading(false)
    }
  }, [videoRef, cameraReady, latitude, longitude])

  // Start / restart the capture interval
  useEffect(() => {
    if (!cameraReady || !latitude || !longitude) {
      return
    }

    // Capture immediately on start (deferred to avoid sync setState in effect body)
    queueMicrotask(() => capture())

    // Then capture every N ms
    intervalRef.current = window.setInterval(capture, interval)

    return () => {
      clearInterval(intervalRef.current)
    }
  }, [cameraReady, latitude, longitude, interval, capture])

  return { scene, isLoading, error, capture }
}
