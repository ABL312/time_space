import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Capsule } from '../types'
import Button from './ui/Button'
import { useTimeTheme } from '../hooks/useTimeTheme'

function createBaseTileLayer(_styleId: string = '1') {
  const url = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}'

  return L.tileLayer(url, {
    attribution: '&copy; 高德地图',
    subdomains: '1234',
    maxZoom: 18,
    keepBuffer: 4,
    updateWhenIdle: true,
    updateWhenZooming: false,
    crossOrigin: true,
  })
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
  const theme = useTimeTheme()
  const styleId = (theme === 'evening' || theme === 'night') ? '4' : '1'

  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const [tilesLoaded, setTilesLoaded] = useState(false)
  const [tileError, setTileError] = useState(false)

  const recenterToUser = () => {
    if (!map.current) return
    map.current.flyTo([latitude, longitude], Math.max(map.current.getZoom(), 15), {
      duration: 0.8,
      easeLinearity: 0.25,
    })
  }

  // Initialize map
  useEffect(() => {
    console.log('[MapView] useEffect init, container:', !!mapContainer.current, 'map:', !!map.current)
    
    if (!mapContainer.current) {
      console.error('[MapView] mapContainer.current is null')
      return
    }
    
    if (map.current) {
      console.log('[MapView] map already initialized, skipping')
      return
    }

    try {
      console.log('[MapView] Creating Leaflet map...')
      map.current = L.map(mapContainer.current, {
        center: [latitude, longitude],
        zoom: 15,
        zoomControl: false,
        attributionControl: true,
      })
      console.log('[MapView] Map created:', !!map.current)

      // 腾讯地图瓦片
      tileLayerRef.current = createBaseTileLayer(styleId).addTo(map.current)
      tileLayerRef.current.on('load', () => {
        setTilesLoaded(true)
        setTileError(false)
      })
      tileLayerRef.current.on('tileerror', () => {
        setTileError(true)
      })
      console.log('[MapView] Tile layer added')

      // Zoom control removed (requested by user)

      // Layer group for markers
      markersRef.current = L.layerGroup().addTo(map.current)

      // Force map to recalculate size after a short delay
      setTimeout(() => {
        if (map.current) {
          map.current.invalidateSize()
          console.log('[MapView] invalidateSize called')
        }
      }, 100)

      console.log('[MapView] Map initialization complete')
    } catch (error) {
      console.error('[MapView] Error initializing map:', error)
    }

    return () => {
      console.log('[MapView] Cleanup: removing map')
      try {
        map.current?.remove()
      } catch (error) {
        console.error('[MapView] Error removing map:', error)
      }
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update map tile style when theme changes
  useEffect(() => {
    // Theme switching is handled via CSS filters on the map container container,
    // so no need to reload tiles from the network.
  }, [styleId])

  // Keep map size in sync with layout changes.
  useEffect(() => {
    const invalidateMapSize = () => {
      map.current?.invalidateSize({ pan: false })
    }

    const observer = new MutationObserver(invalidateMapSize)
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

    // User position — warm coral/terracotta dot
    const userIcon = L.divIcon({
      className: '',
      html: `<div style="
        width: 14px; height: 14px;
        background: var(--primary);
        border: 2px solid #fff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        border-radius: 50%;
      "></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    })
    L.marker([latitude, longitude], { icon: userIcon }).addTo(markersRef.current)

    // Capsule markers
    capsules.forEach((capsule) => {
      const isHot = (capsule.match_score ?? 0) > 50
      const markerChar = isHot ? '💌' : '✉'
      const borderStyle = isHot ? 'solid' : 'dashed'
      const borderColor = isHot ? 'var(--primary)' : 'var(--capsule)'

      const capsuleIcon = L.divIcon({
        className: 'custom-capsule-marker',
        html: `<div style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          background: var(--bg);
          border: 1.5px ${borderStyle} ${borderColor};
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          font-size: 15px;
          cursor: pointer;
          transform-origin: center;
          transition: transform 0.2s;
        " class="hover:scale-125 hover:rotate-6">
          ${markerChar}
        </div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      })

      const marker = L.marker([capsule.latitude, capsule.longitude], { icon: capsuleIcon })
      marker.on('click', () => onCapsuleClick?.(capsule))
      marker.addTo(markersRef.current!)
    })
  }, [capsules, latitude, longitude, onCapsuleClick, styleId])

  return (
    <div className="absolute inset-0 w-full h-full bg-void">
      {!tilesLoaded && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(192,92,70,0.12),transparent_45%),linear-gradient(rgba(192,92,70,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(192,92,70,0.06)_1px,transparent_1px)] bg-[size:100%_100%,48px_48px,48px_48px]" />
      )}
      <div ref={mapContainer} className={`absolute inset-0 w-full h-full ${styleId === '4' ? 'map-tiles-dark' : ''}`} role="application" aria-label="Interactive map" />
      {!tilesLoaded && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="hud px-4 py-3 text-center rounded-lg border border-primary/20 bg-bg/95 shadow-md max-w-xs">
            <div className="text-xs uppercase tracking-wider text-primary font-serif font-bold">时空信箱</div>
            <div className="mt-2 text-xs text-text-secondary font-medium">{tileError ? '信箱底图加载失败，显示备用网格' : '正在唤醒时空信件底图...'}</div>
          </div>
        </div>
      )}
      {/* Recenter Button */}
      <div className="absolute top-[96px] right-3 z-[1000]">
        <Button
          variant="icon"
          size="icon-md"
          onClick={recenterToUser}
          className="hud text-primary hover:bg-surface/50 border-border min-h-[44px]"
          title="定位当前位置"
          aria-label="Recenter map to current location"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
        </Button>
      </div>
    </div>
  )
}
