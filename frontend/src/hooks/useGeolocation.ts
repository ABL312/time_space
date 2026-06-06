import { useState, useEffect, useCallback, useRef } from 'react'

interface GeolocationState {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  heading: number | null
  speed: number | null
  error: string | null
  isWatching: boolean
  /** Where the location came from: browser GPS, IP-based, or manual */
  locationSource: 'native' | 'ip' | 'manual' | null
  /** True if we're using a less-accurate fallback (IP geolocation) */
  isFallback: boolean
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  watch?: boolean
}

/**
 * Try to get approximate location from a free IP geolocation API.
 * Works over HTTP on most browsers — no permission prompt needed.
 */
async function getIPLocation(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  const endpoints = [
    {
      url: 'https://ipapi.co/json/',
      parse: (data: Record<string, unknown>) => ({
        lat: data.latitude as number,
        lng: data.longitude as number,
      }),
    },
    {
      url: 'http://ip-api.com/json/?lang=zh-CN',
      parse: (data: Record<string, unknown>) => ({
        lat: data.lat as number,
        lng: data.lon as number,
      }),
    },
    {
      url: 'https://ipinfo.io/json',
      parse: (data: Record<string, unknown>) => {
        const loc = (data.loc as string).split(',')
        return { lat: parseFloat(loc[0]), lng: parseFloat(loc[1]) }
      },
    },
  ]

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 4000)
      const res = await fetch(endpoint.url, { signal: controller.signal })
      clearTimeout(timer)
      if (!res.ok) continue
      const data = await res.json()
      const { lat, lng } = endpoint.parse(data)
      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        return { lat, lng, accuracy: 5000 }
      }
    } catch {
      // try next endpoint
    }
  }
  return null
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    watch = true,
  } = options

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    heading: null,
    speed: null,
    error: null,
    isWatching: false,
    locationSource: null,
    isFallback: false,
  })

  const watchIdRef = useRef<number | null>(null)
  const fallbackTriggeredRef = useRef(false)

  const triggerIPFallback = useCallback(async () => {
    if (fallbackTriggeredRef.current) return
    fallbackTriggeredRef.current = true
    setState((prev) => ({ ...prev, error: '正在使用IP定位...' }))
    const ipLoc = await getIPLocation()
    if (ipLoc) {
      setState((prev) => ({
        ...prev,
        latitude: ipLoc.lat,
        longitude: ipLoc.lng,
        accuracy: ipLoc.accuracy,
        heading: null,
        speed: null,
        error: null,
        isWatching: true,
        locationSource: 'ip',
        isFallback: true,
      }))
    } else {
      setState((prev) => ({
        ...prev,
        error: 'IP定位失败，请手动设置坐标',
        isWatching: false,
        locationSource: null,
      }))
    }
  }, [])

  const onSuccess = useCallback((position: GeolocationPosition) => {
    setState({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      error: null,
      isWatching: true,
      locationSource: 'native',
      isFallback: false,
    })
  }, [])

  const onError = useCallback(
    (error: GeolocationPositionError) => {
      let message: string
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = '位置权限被拒绝，正在尝试IP定位...'
          break
        case error.POSITION_UNAVAILABLE:
          message = '位置信息不可用，正在尝试IP定位...'
          break
        case error.TIMEOUT:
          message = '获取位置超时，正在尝试IP定位...'
          break
        default:
          message = '未知定位错误，正在尝试IP定位...'
      }
      setState((prev) => ({ ...prev, error: message, isWatching: false }))
      triggerIPFallback()
    },
    [triggerIPFallback]
  )

  useEffect(() => {
    // If geolocation API is not available, go straight to IP fallback
    if (!navigator.geolocation) {
      queueMicrotask(() => {
        setState((prev) => ({ ...prev, error: '浏览器不支持GPS定位，尝试IP定位...' }))
        triggerIPFallback()
      })
      return
    }

    // If page is not a secure context (self-signed cert), the geolocation API
    // may exist but silently fail. Skip directly to IP fallback.
    if (typeof window.isSecureContext === 'boolean' && !window.isSecureContext) {
      queueMicrotask(() => {
        const httpsUrl = window.location.href.replace(/^http:/, 'https:')
        setState((prev) => ({
          ...prev,
          error: window.location.protocol === 'http:'
            ? `当前HTTP地址无法获取GPS，请改用 ${httpsUrl}`
            : '非安全上下文，GPS不可用，尝试IP定位...',
        }))
        triggerIPFallback()
      })
      return
    }

    const geoOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge,
    }

    if (watch) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        onSuccess,
        onError,
        geoOptions
      )
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, geoOptions)
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [enableHighAccuracy, timeout, maximumAge, watch, onSuccess, onError, triggerIPFallback])

  return state
}

/**
 * Calculate haversine distance between two GPS points in meters
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Calculate bearing from point 1 to point 2 in degrees (0-360)
 */
export function calculateBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const lat1Rad = (lat1 * Math.PI) / 180
  const lat2Rad = (lat2 * Math.PI) / 180
  const y = Math.sin(dLng) * Math.cos(lat2Rad)
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng)
  const bearing = (Math.atan2(y, x) * 180) / Math.PI
  return (bearing + 360) % 360
}
