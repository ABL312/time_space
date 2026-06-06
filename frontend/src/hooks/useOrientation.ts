import { useState, useEffect, useCallback } from 'react'

// iOS 13+ extends DeviceOrientationEvent with a permission request method
interface DeviceOrientationEventWithPermission extends DeviceOrientationEvent {
  requestPermission?: () => Promise<string>
}

interface OrientationState {
  alpha: number | null  // Compass heading (0-360)
  beta: number | null   // Front-back tilt (-180 to 180)
  gamma: number | null  // Left-right tilt (-90 to 90)
  error: string | null
  isSupported: boolean
}

export function useOrientation() {
  const [state, setState] = useState<OrientationState>(() => {
    const isSupported = typeof DeviceOrientationEvent !== 'undefined'
    return {
      alpha: null,
      beta: null,
      gamma: null,
      error: isSupported ? null : '设备不支持方向感应',
      isSupported,
    }
  })

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    const compassEvent = event as DeviceOrientationEvent & { webkitCompassHeading?: number }
    const alpha = typeof compassEvent.webkitCompassHeading === 'number'
      ? compassEvent.webkitCompassHeading
      : event.alpha

    setState({
      alpha,
      beta: event.beta,
      gamma: event.gamma,
      error: null,
      isSupported: true,
    })
  }, [])

  useEffect(() => {
    if (!state.isSupported) {
      return
    }

    // iOS 13+ requires permission request
    const requestPermission = async () => {
      try {
        const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
        if (typeof DOE.requestPermission === 'function') {
          const permission = await DOE.requestPermission()
          if (permission !== 'granted') {
            setState((prev) => ({
              ...prev,
              error: '陀螺仪权限被拒绝',
            }))
            return
          }
        }
        window.addEventListener('deviceorientation', handleOrientation)
      } catch {
        setState((prev) => ({
          ...prev,
          error: '无法请求陀螺仪权限',
        }))
      }
    }

    requestPermission()

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [state.isSupported, handleOrientation])

  /** Request iOS permission explicitly (call on user gesture) */
  const requestPermission = useCallback(async () => {
    try {
      const DOE = DeviceOrientationEvent as unknown as DeviceOrientationEventWithPermission
      if (typeof DOE.requestPermission === 'function') {
        const permission = await DOE.requestPermission()
        if (permission === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation)
        }
        return permission === 'granted'
      }
      return true
    } catch {
      return false
    }
  }, [handleOrientation])

  return { ...state, requestPermission }
}
