import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Capsule } from '../types'

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

  useEffect(() => {
    if (!mapContainer.current || map.current) return
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [longitude, latitude],
      zoom: 15,
      attributionControl: true,
    })
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    return () => { map.current?.remove(); map.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!map.current) return
    map.current.flyTo({ center: [longitude, latitude], duration: 1500, essential: true })
  }, [latitude, longitude])

  useEffect(() => {
    if (!map.current) return
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    // User position - cyan square with glow
    const userEl = document.createElement('div')
    userEl.style.cssText = `
      width: 10px; height: 10px;
      background: #22d3ee;
      box-shadow: 0 0 12px 3px rgba(34,211,238,0.4);
    `
    markersRef.current.push(
      new mapboxgl.Marker({ element: userEl }).setLngLat([longitude, latitude]).addTo(map.current!)
    )

    // Capsule markers
    capsules.forEach((capsule) => {
      const isHot = (capsule.match_score ?? 0) > 50
      const size = isHot ? 12 : 8

      const el = document.createElement('div')
      el.style.cssText = `
        width: ${size}px; height: ${size}px;
        background: ${isHot ? '#f5a623' : 'rgba(245,166,35,0.5)'};
        cursor: pointer;
        position: relative;
        ${isHot ? 'box-shadow: 0 0 10px 2px rgba(245,166,35,0.5);' : ''}
      `
      el.addEventListener('click', () => onCapsuleClick?.(capsule))

      // Pulse ring for hot capsules
      if (isHot) {
        const ring = document.createElement('div')
        ring.style.cssText = `
          position: absolute; inset: -6px;
          border: 1px solid rgba(245,166,35,0.5);
          animation: signal-ping 2s cubic-bezier(0,0,0.2,1) infinite;
        `
        el.appendChild(ring)
      }

      markersRef.current.push(
        new mapboxgl.Marker({ element: el }).setLngLat([capsule.longitude, capsule.latitude]).addTo(map.current!)
      )
    })
  }, [capsules, longitude, latitude, onCapsuleClick])

  return <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
}
