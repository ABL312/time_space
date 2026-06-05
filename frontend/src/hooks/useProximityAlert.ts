import { useEffect, useState } from 'react'
import type { Capsule } from '../types'
import { haversineDistance } from './useGeolocation'

interface UseProximityAlertProps {
  userLat: number | null
  userLng: number | null
  nearbyCapsules: Capsule[]
}

interface ProximityAlertState {
  triggeredCapsule: Capsule | null
  distance: number | null
  dismiss: () => void
}

const PROXIMITY_THRESHOLD = 50 // meters
const NOTIFIED_CAPSULES_KEY = 'proximity_notified_capsules'

export function useProximityAlert({
  userLat,
  userLng,
  nearbyCapsules
}: UseProximityAlertProps): ProximityAlertState {
  const [triggeredCapsule, setTriggeredCapsule] = useState<Capsule | null>(null)
  const [distance, setDistance] = useState<number | null>(null)

  // Load notified capsules from localStorage
  const getNotifiedCapsules = (): string[] => {
    try {
      const notified = localStorage.getItem(NOTIFIED_CAPSULES_KEY)
      return notified ? JSON.parse(notified) : []
    } catch {
      return []
    }
  }

  // Save notified capsule to localStorage
  const markAsNotified = (capsuleId: string) => {
    try {
      const notified = getNotifiedCapsules()
      if (!notified.includes(capsuleId)) {
        notified.push(capsuleId)
        localStorage.setItem(NOTIFIED_CAPSULES_KEY, JSON.stringify(notified))
      }
    } catch (e) {
      console.warn('Failed to save notified capsule:', e)
    }
  }

  // Dismiss alert and mark as notified
  const dismiss = () => {
    if (triggeredCapsule) {
      markAsNotified(triggeredCapsule.id)
    }
    setTriggeredCapsule(null)
    setDistance(null)
  }

  // Check proximity on location updates
  useEffect(() => {
    if (!userLat || !userLng || nearbyCapsules.length === 0) {
      return
    }

    // Skip if already triggered
    if (triggeredCapsule) {
      return
    }

    const notifiedCapsules = getNotifiedCapsules()
    
    // Find closest capsule within threshold that hasn't been notified
    let closestCapsule: Capsule | null = null
    let minDistance: number | null = null

    for (const capsule of nearbyCapsules) {
      // Skip already notified capsules
      if (notifiedCapsules.includes(capsule.id)) {
        continue
      }

      const dist = haversineDistance(userLat, userLng, capsule.latitude, capsule.longitude)
      
      // Check if within threshold
      if (dist < PROXIMITY_THRESHOLD) {
        if (!minDistance || dist < minDistance) {
          minDistance = dist
          closestCapsule = capsule
        }
      }
    }

    // Trigger alert if we found a capsule
    if (closestCapsule && minDistance !== null) {
      setTriggeredCapsule(closestCapsule)
      setDistance(minDistance)
      
      // Vibrate if supported
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200])
      }
    }
  }, [userLat, userLng, nearbyCapsules, triggeredCapsule])

  return {
    triggeredCapsule,
    distance,
    dismiss
  }
}