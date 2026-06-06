import { useState, useEffect, useCallback } from 'react'
import { request as apiRequest } from '../lib/client'

export interface DeviceCapabilities {
  /** Camera (getUserMedia) available */
  hasCamera: boolean
  /** GPS (geolocation API) available */
  hasGPS: boolean
  /** WebGL / Three.js rendering available */
  hasWebGL: boolean
  /** Network connectivity */
  isOnline: boolean
  /** PWA service worker registered */
  hasPWA: boolean
  /** Whether to skip AR and go directly to detail view */
  shouldSkipAR: boolean
  /** Whether to use expanded GPS radius */
  useExpandedGPS: boolean
  /** Whether to use CSS fallback instead of Three.js */
  useCSSFallback: boolean
  /** Detection complete */
  isReady: boolean
}

interface CapabilityCheckOptions {
  /** Force-disable camera (for testing) */
  forceNoCamera?: boolean
  /** Force-disable GPS (for testing) */
  forceNoGPS?: boolean
  /** Force-disable WebGL (for testing) */
  forceNoWebGL?: boolean
}

/**
 * Hook to detect device capabilities and determine degradation strategy (#19).
 *
 * Checks:
 * - Camera: navigator.mediaDevices.getUserMedia
 * - GPS: navigator.geolocation
 * - WebGL: canvas.getContext('webgl2' | 'webgl')
 * - Network: navigator.onLine + online/offline events
 * - PWA: service worker registration
 */
export function useCapabilityCheck(options: CapabilityCheckOptions = {}): DeviceCapabilities {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    hasCamera: true,
    hasGPS: true,
    hasWebGL: true,
    isOnline: true,
    hasPWA: false,
    shouldSkipAR: false,
    useExpandedGPS: false,
    useCSSFallback: false,
    isReady: false,
  })

  const checkWebGL = useCallback((): boolean => {
    if (options.forceNoWebGL) return false
    try {
      const canvas = document.createElement('canvas')
      const gl =
        canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl')
      return !!gl
    } catch {
      return false
    }
  }, [options.forceNoWebGL])

  const checkCamera = useCallback(async (): Promise<boolean> => {
    if (options.forceNoCamera) return false
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false
      }
      // Check if any video input devices exist
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices.some((d) => d.kind === 'videoinput')
    } catch {
      return false
    }
  }, [options.forceNoCamera])

  const checkGPS = useCallback((): boolean => {
    if (options.forceNoGPS) return false
    return 'geolocation' in navigator
  }, [options.forceNoGPS])

  useEffect(() => {
    let mounted = true

    async function detect() {
      const hasCamera = await checkCamera()
      if (!mounted) return

      const hasGPS = checkGPS()
      const hasWebGL = checkWebGL()
      const isOnline = navigator.onLine
      const hasPWA = 'serviceWorker' in navigator

      const shouldSkipAR = !hasCamera || !hasWebGL
      const useExpandedGPS = !hasGPS
      const useCSSFallback = !hasWebGL

      if (mounted) {
        setCapabilities({
          hasCamera,
          hasGPS,
          hasWebGL,
          isOnline,
          hasPWA,
          shouldSkipAR,
          useExpandedGPS,
          useCSSFallback,
          isReady: true,
        })
      }
    }

    detect()

    return () => {
      mounted = false
    }
  }, [checkCamera, checkGPS, checkWebGL])

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setCapabilities((prev) => ({ ...prev, isOnline: true }))
    }
    const handleOffline = () => {
      setCapabilities((prev) => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return capabilities
}

/**
 * Hook for API request with timeout and retry (#19).
 * Uses the unified client.ts request() with retry logic.
 */
export function useAPIWithRetry() {
  const [isRetrying, setIsRetrying] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  const fetchWithRetry = useCallback(
    async <T = unknown>(
      url: string,
      options?: RequestInit & { timeout?: number; maxRetries?: number }
    ): Promise<T> => {
      const timeout = options?.timeout ?? 10000
      const maxRetries = options?.maxRetries ?? 2
      let lastErr: Error | null = null

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
          setIsRetrying(true)
          await new Promise((r) => setTimeout(r, 1000 * attempt))
        }

        try {
          const result = await apiRequest<T>(url, options, timeout)
          setIsRetrying(false)
          setLastError(null)
          return result
        } catch (err) {
          lastErr = err instanceof Error ? err : new Error(String(err))
          setLastError(lastErr.message)
        }
      }

      setIsRetrying(false)
      throw lastErr ?? new Error('请求失败')
    },
    []
  )

  return { fetchWithRetry, isRetrying, lastError, retry: () => setIsRetrying(false) }
}

/**
 * Simple offline cache helper using localStorage (#19).
 * Caches API responses for offline access.
 */
export function useOfflineCache() {
  const cachePrefix = 'timespace_cache_'

  const cacheResponse = useCallback(
    (key: string, data: unknown) => {
      try {
        localStorage.setItem(
          `${cachePrefix}${key}`,
          JSON.stringify({ data, timestamp: Date.now() })
        )
      } catch {
        // localStorage full or unavailable
      }
    },
    [cachePrefix]
  )

  const getCached = useCallback(
    <T = unknown>(key: string, maxAgeMs: number = 5 * 60 * 1000): T | null => {
      try {
        const raw = localStorage.getItem(`${cachePrefix}${key}`)
        if (!raw) return null

        const { data, timestamp } = JSON.parse(raw) as {
          data: T
          timestamp: number
        }
        if (Date.now() - timestamp > maxAgeMs) {
          localStorage.removeItem(`${cachePrefix}${key}`)
          return null
        }
        return data
      } catch {
        return null
      }
    },
    [cachePrefix]
  )

  const clearCache = useCallback(() => {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(cachePrefix))
      keys.forEach((k) => localStorage.removeItem(k))
    } catch {
      // ignore
    }
  }, [cachePrefix])

  return { cacheResponse, getCached, clearCache }
}
