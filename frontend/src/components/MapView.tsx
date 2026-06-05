import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Capsule } from '../types'

// TODO: Move to environment variable
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.placeholder'

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

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

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

    // Add user position marker
    const userMarker = document.createElement('div')
    userMarker.className = 'w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg shadow-blue-500/50'

    new mapboxgl.Marker({ element: userMarker })
      .setLngLat([longitude, latitude])
      .addTo(map.current)

    markersRef.current.push(
      new mapboxgl.Marker({ element: userMarker })
        .setLngLat([longitude, latitude])
        .addTo(map.current!)
    )

    // Add capsule markers
    capsules.forEach((capsule) => {
      const isRecommended = (capsule.match_score ?? 0) > 0.5

      const el = document.createElement('div')
      el.className = isRecommended
        ? 'capsule-marker-recommended w-4 h-4 rounded-full bg-accent cursor-pointer'
        : 'capsule-marker w-2.5 h-2.5 rounded-full bg-accent/70 cursor-pointer'

      el.addEventListener('click', () => {
        onCapsuleClick?.(capsule)
      })

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([capsule.longitude, capsule.latitude])
        .addTo(map.current!)

      markersRef.current.push(marker)
    })
  }, [capsules, longitude, latitude, onCapsuleClick])

  return (
    <div
      ref={mapContainer}
      className="absolute inset-0 w-full h-full"
    />
  )
}
