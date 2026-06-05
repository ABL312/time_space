import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapboxgl'
import 'mapboxgl/dist/mapboxgl.css'
import type { Capsule } from '../types'

// Check if Mapbox token exists
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN
}

interface MapViewProps {
  latitude: number
  longitude: number
  capsules: Capsule[]
  onCapsuleClick?: (capsule: Capsule) => void
}

export default function MapView({
  latitude,
  longitude,
  capsules,
  onCapsuleClick,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [hasToken, setHasToken] = useState(!!MAPBOX_TOKEN)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    // If no Mapbox token, show placeholder map
    if (!MAPBOX_TOKEN) {
      setHasToken(false)
      return
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [longitude, latitude],
      zoom: 15,
      attributionControl: true,
    })

    map.current.addControl(
      new mapboxgl.NavigationControl(),
      'top-right'
    )

    return () => {
      map.current?.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update map center when user location changes
  useEffect(() => {
    if (!map.current) return
    map.current.flyTo({
      center: [longitude, latitude],
      duration: 1500,
      essential: true,
    })
  }, [latitude, longitude])

  // Update capsule markers
  useEffect(() => {
    if (!map.current) return

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    // Add user position marker (blue pulsing dot)
    const userMarker = document.createElement('div')
    userMarker.className = 'w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg animate-pulse'
    userMarker.style.boxShadow = '0 0 0 0 rgba(59, 130, 246, 0.7)'
    userMarker.style.animation = 'pulse 2s infinite'

    markersRef.current.push(
      new mapboxgl.Marker({ element: userMarker })
        .setLngLat([longitude, latitude])
        .addTo(map.current!)
    )

    // Add capsule markers
    capsules.forEach((capsule) => {
      const isRecommended = (capsule.match_score ?? 0) > 0.5
      
      const el = document.createElement('div')
      
      // Apply different styling based on recommendation status
      if (isRecommended) {
        // Larger marker with golden glow for recommended capsules
        el.className = 'capsule-marker-recommended w-3.5 h-3.5 rounded-full bg-accent cursor-pointer border-2 border-yellow-300 shadow-lg shadow-yellow-500/50'
      } else {
        // Smaller marker for other capsules (8px = 2rem)
        el.className = 'capsule-marker w-2 h-2 rounded-full bg-white cursor-pointer border border-blue-300'
      }

      // Add hover effect
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.3)'
        el.style.transition = 'transform 0.2s ease'
      })
      
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)'
      })

      el.addEventListener('click', () => {
        onCapsuleClick?.(capsule)
      })

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([capsule.longitude, capsule.latitude])
        .addTo(map.current!)

      // Add label for recommended capsules
      if (isRecommended) {
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          className: 'bg-surface text-white text-xs px-2 py-1 rounded'
        }).setText('✨ 推荐')

        marker.setPopup(popup)
        
        // Show popup on hover
        el.addEventListener('mouseenter', () => {
          marker.togglePopup()
        })
        
        el.addEventListener('mouseleave', () => {
          marker.togglePopup()
        })
      }

      markersRef.current.push(marker)
    })
  }, [capsules, longitude, latitude, onCapsuleClick])

  return (
    <div
      ref={mapContainer}
      className="absolute inset-0 w-full h-full"
    >
      {!hasToken && (
        <div className="absolute inset-0 w-full h-full bg-gray-900 flex flex-col items-center justify-center">
          <div className="text-white text-center p-4">
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-xl font-bold mb-2">地图服务未配置</h3>
            <p className="text-gray-300 mb-4">当前位置: {latitude.toFixed(6)}, {longitude.toFixed(6)}</p>
            <div className="inline-block px-4 py-2 bg-surface rounded-lg">
              <div className="w-3 h-3 rounded-full bg-blue-500 inline-block mr-2 animate-pulse"></div>
              <span className="text-sm">您的位置</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
