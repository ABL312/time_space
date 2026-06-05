import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Capsule } from '../types'

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
  const map = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = L.map(mapContainer.current, {
      center: [latitude, longitude],
      zoom: 15,
      zoomControl: false,
      attributionControl: true,
    })

    // 高德地图瓦片 — 国内快速访问
    tileLayerRef.current = L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      attribution: '&copy; 高德地图',
      subdomains: '1234',
      maxZoom: 18,
    }).addTo(map.current)

    // Zoom control top-right
    L.control.zoom({ position: 'topright' }).addTo(map.current)

    // Layer group for markers
    markersRef.current = L.layerGroup().addTo(map.current)

    return () => {
      map.current?.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update map style based on theme
  useEffect(() => {
    const updateMapStyle = () => {
      const theme = document.documentElement.dataset.theme || 'night'
      
      if (tileLayerRef.current && map.current) {
        // Remove existing tile layer
        tileLayerRef.current.removeFrom(map.current)
        
        // Add new tile layer based on theme
        if (theme === 'morning') {
          tileLayerRef.current = L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}', {
            attribution: '&copy; 高德地图',
            subdomains: '1234',
            maxZoom: 18,
          }).addTo(map.current)
        } else if (theme === 'afternoon') {
          tileLayerRef.current = L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
            attribution: '&copy; 高德地图',
            subdomains: '1234',
            maxZoom: 18,
          }).addTo(map.current)
        } else if (theme === 'evening') {
          tileLayerRef.current = L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=6&x={x}&y={y}&z={z}', {
            attribution: '&copy; 高德地图',
            subdomains: '1234',
            maxZoom: 18,
          }).addTo(map.current)
        } else {
          // night theme (default)
          tileLayerRef.current = L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
            attribution: '&copy; 高德地图',
            subdomains: '1234',
            maxZoom: 18,
          }).addTo(map.current)
        }
      }
    }

    updateMapStyle()
    
    // Listen for theme changes
    const observer = new MutationObserver(updateMapStyle)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  // Fly to position on change
  useEffect(() => {
    if (!map.current) return
    map.current.flyTo([latitude, longitude], 15, { duration: 1.5 })
  }, [latitude, longitude])

  // Update markers
  useEffect(() => {
    if (!map.current || !markersRef.current) return
    markersRef.current.clearLayers()

    // User position — cyan dot with glow
    const userIcon = L.divIcon({
      className: '',
      html: `<div style="
        width: 12px; height: 12px;
        background: #22d3ee;
        box-shadow: 0 0 14px 4px rgba(34,211,238,0.5);
        border-radius: 50%;
      "></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    })
    L.marker([latitude, longitude], { icon: userIcon }).addTo(markersRef.current)

    // Capsule markers
    capsules.forEach((capsule) => {
      const isHot = (capsule.match_score ?? 0) > 50
      const size = isHot ? 14 : 10
      const color = isHot ? '#f5a623' : 'rgba(245,166,35,0.5)'
      const glow = isHot ? 'box-shadow: 0 0 12px 3px rgba(245,166,35,0.5);' : ''

      const capsuleIcon = L.divIcon({
        className: '',
        html: `<div style="
          width: ${size}px; height: ${size}px;
          background: ${color};
          border-radius: 50%;
          cursor: pointer;
          ${glow}
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })

      const marker = L.marker([capsule.latitude, capsule.longitude], { icon: capsuleIcon })
      marker.on('click', () => onCapsuleClick?.(capsule))
      marker.addTo(markersRef.current!)
    })
  }, [capsules, latitude, longitude, onCapsuleClick])

  return <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
}
