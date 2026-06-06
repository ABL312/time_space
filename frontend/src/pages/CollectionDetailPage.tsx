import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collectionsApi } from '../lib/api'
import { useOnline } from '../hooks/useOnline'
import type { CapsuleCollection, Capsule } from '../types'
import { Card, Badge, LoadingState, ErrorState, PageShell } from '../components/ui'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface CollectionWithCapsules extends CapsuleCollection {
  capsules: Capsule[]
}

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isOnline } = useOnline()
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
    return <LoadingState message="正在加载合集..." fullscreen />
  }

  if (error || !collection) {
    return (
      <ErrorState
        title="加载失败"
        message={error || '合集不存在'}
        retry={() => navigate(-1)}
        className="min-h-screen"
      />
    )
  }

  return (
    <PageShell title="合集详情" backTo={-1}>
      {/* Offline banner */}
      {!isOnline && (
        <Card variant="hud" padding="sm" className="mx-4 mt-2 mb-2 border-data-bad/20 flex items-center gap-2">
          <Badge variant="error" dot>OFFLINE — DISPLAYING CACHED DATA</Badge>
        </Card>
      )}

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
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/capsule/${capsule.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/capsule/${capsule.id}`) } }}
                className="panel p-4 cursor-pointer hover:border-signal/30 transition-colors rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal/50"
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
    </PageShell>
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