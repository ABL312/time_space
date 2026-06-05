import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collectionsApi } from '../lib/api'
import type { CapsuleCollection, Capsule } from '../types'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface CollectionWithCapsules extends CapsuleCollection {
  capsules: Capsule[]
}

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [collection, setCollection] = useState<CollectionWithCapsules | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const polylineRef = useRef<L.Polyline | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!id) return

    collectionsApi.get(id)
      .then((data: CollectionWithCapsules) => {
        setCollection(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err?.message || '加载失败')
        setLoading(false)
      })
  }, [id])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || !collection?.capsules) return

    // Find center point
    if (collection.capsules.length > 0) {
      const avgLat = collection.capsules.reduce((sum, c) => sum + c.latitude, 0) / collection.capsules.length
      const avgLng = collection.capsules.reduce((sum, c) => sum + c.longitude, 0) / collection.capsules.length
      
      map.current = L.map(mapContainer.current, {
        center: [avgLat, avgLng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      })

      // 高德地图瓦片
      L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
        subdomains: '1234',
        maxZoom: 18,
      }).addTo(map.current)

      // Layer groups
      markersRef.current = L.layerGroup().addTo(map.current)
      
      // Draw route polyline
      const points = collection.capsules.map(c => [c.latitude, c.longitude] as [number, number])
      if (points.length > 1) {
        polylineRef.current = L.polyline(points, {
          color: '#f5a623',
          weight: 4,
          opacity: 0.7,
        }).addTo(map.current)
      }

      // Add markers
      collection.capsules.forEach((capsule, index) => {
        const markerIcon = L.divIcon({
          className: '',
          html: `
            <div class="relative">
              <div class="w-8 h-8 bg-capsule/20 rounded-full flex items-center justify-center border-2 border-capsule">
                <div class="w-3 h-3 bg-capsule rounded-full"></div>
              </div>
              <div class="absolute -top-1 -right-1 w-5 h-5 bg-signal rounded-full flex items-center justify-center text-xs font-bold text-white">
                ${index + 1}
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })

        const marker = L.marker([capsule.latitude, capsule.longitude], { icon: markerIcon })
        marker.on('click', () => navigate(`/capsule/${capsule.id}`))
        marker.addTo(markersRef.current!)
      })

      // Fit bounds to show all points
      if (points.length > 1) {
        map.current.fitBounds(points, { padding: [50, 50] })
      }
    }

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [collection, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-signal border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-400">正在加载合集...</p>
        </div>
      </div>
    )
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
        <div className="label mb-3 text-data-bad">加载失败</div>
        <p className="data text-center mb-1">{error || '合集不存在'}</p>
        <button 
          onClick={() => navigate(-1)} 
          className="btn mt-4 px-5 py-2 border border-surface-light text-slate-400 text-xs font-mono tracking-wider"
        >
          返回
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 hud px-4 py-3 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)} 
          className="btn flex items-center gap-2 text-slate-400 hover:text-signal transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <span className="text-xs font-mono tracking-wider">返回</span>
        </button>
        <span className="label">合集详情</span>
        <div className="w-16"></div>
      </header>

      <div className="pb-28">
        {/* Collection Info */}
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-white mb-2">{collection.title}</h1>
          <p className="text-slate-400 mb-4">{collection.description}</p>
          <div className="flex items-center gap-4 text-sm">
            <span className="data">
              {collection.capsules?.length || 0} 个胶囊
            </span>
            <span className="data">
              更新于 {formatDate(collection.updated_at)}
            </span>
          </div>
        </div>

        {/* Map */}
        <div className="h-64 w-full mb-6">
          <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden border border-border" />
        </div>

        {/* Capsules List */}
        <div className="px-4">
          <div className="label mb-3 flex items-center gap-2">
            <span className="inline-block w-2 h-px bg-signal-dim" />
            胶囊列表
          </div>
          <div className="space-y-3">
            {collection.capsules.map((capsule, index) => (
              <div 
                key={capsule.id}
                onClick={() => navigate(`/capsule/${capsule.id}`)}
                className="panel p-4 cursor-pointer hover:border-signal/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 border border-capsule/30 flex items-center justify-center bg-capsule/5 text-capsule font-mono text-sm flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white line-clamp-2 mb-2">
                      {capsule.message}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {capsule.emotion_tags?.slice(0, 3).map((tag) => (
                        <span 
                          key={tag}
                          className="px-1.5 py-0.5 text-xs font-mono border border-primary/20 text-primary-light bg-primary/5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="data">
                        {capsule.distance_m != null ? (
                          `${capsule.distance_m < 1000 ? `${Math.round(capsule.distance_m)}m` : `${(capsule.distance_m / 1000).toFixed(1)}km`}`
                        ) : (
                          '未知距离'
                        )}
                      </span>
                      <span className="data">•</span>
                      <span className="data">{formatDate(capsule.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDate(dateString: string): string {
  if (!dateString) return '未知时间'
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays}天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
  return date.toLocaleDateString('zh-CN')
}