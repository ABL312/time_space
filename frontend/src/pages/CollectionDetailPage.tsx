import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collectionsApi } from '../lib/api'
import { useOnline } from '../hooks/useOnline'
import { useTimeTheme } from '../hooks/useTimeTheme'
import type { CapsuleCollection, Capsule } from '../types'
import { Card, LoadingState, ErrorState, PageShell } from '../components/ui'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface CollectionWithCapsules extends CapsuleCollection {
  capsules: Capsule[]
}

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isOnline } = useOnline()
  const theme = useTimeTheme()
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

      // 腾讯地图瓦片
      const styleId = (theme === 'evening' || theme === 'night') ? '4' : '1'
      L.tileLayer(`https://rt{s}.map.gtimg.com/tile?z={z}&x={x}&y={y}&styleid=${styleId}&version=297`, {
        attribution: '&copy; 腾讯地图',
        subdomains: '0123',
        maxZoom: 18,
        tms: true,
        crossOrigin: true,
      }).addTo(map.current)

      // Layer groups
      markersRef.current = L.layerGroup().addTo(map.current)
      
      // Draw route polyline - dashed terracotta path
      const points = collection.capsules.map(c => [c.latitude, c.longitude] as [number, number])
      if (points.length > 1) {
        polylineRef.current = L.polyline(points, {
          color: 'var(--primary)',
          weight: 3.5,
          opacity: 0.7,
          dashArray: '6, 6',
        }).addTo(map.current)
      }

      // Add markers - numbered envelope stamp indices
      collection.capsules.forEach((capsule, index) => {
        const markerIcon = L.divIcon({
          className: '',
          html: `
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              width: 28px;
              height: 28px;
              background: var(--bg);
              border: 1.5px solid var(--primary);
              border-radius: 4px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.15);
              font-family: var(--font-serif);
              font-weight: bold;
              color: var(--primary);
              font-size: 13px;
              cursor: pointer;
            ">
              ${index + 1}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
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
  }, [collection, navigate, theme])

  if (loading) {
    return <LoadingState message="正在翻阅集册印记..." fullscreen />
  }

  if (error || !collection) {
    return (
      <ErrorState
        title="加载失败"
        message={error || '合集不存在'}
        retry={() => navigate(-1)}
        className="min-h-screen font-serif"
      />
    )
  }

  return (
    <PageShell title="集册详情" backTo={-1}>
      {/* Offline banner */}
      {!isOnline && (
        <Card padding="sm" className="mx-4 mt-2 mb-2 border-data-bad/20 flex items-center gap-2 bg-red-500/5 font-serif">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
          <span className="text-xs text-data-bad">处于离线状态 (显示本地缓存信件)</span>
        </Card>
      )}

      <div className="pb-28 font-serif">
        {/* Collection Info */}
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">{collection.title}</h1>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">{collection.description}</p>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-primary border border-primary/10 bg-primary/5 px-2 py-0.5 rounded-full font-bold">
              📚 {collection.capsules?.length || 0} 封岁月来信
            </span>
            <span className="text-text-muted">
              更新于 {formatDate(collection.updated_at)}
            </span>
          </div>
        </div>

        {/* Map */}
        <div className="h-64 w-full px-4 mb-6">
          <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden border border-primary/20 shadow-sm" />
        </div>

        {/* Capsules List */}
        <div className="px-4">
          <div className="text-xs uppercase tracking-wider text-primary font-bold mb-3 flex items-center gap-2">
            <span className="inline-block w-2 h-px bg-primary" />
            信件列表
          </div>
          <div className="space-y-3">
            {collection.capsules.map((capsule, index) => (
              <Card
                key={capsule.id}
                interactive
                onClick={() => navigate(`/capsule/${capsule.id}`)}
                className="border-primary/10 hover:border-primary/30 transition-colors bg-bg shadow-sm rounded-md"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 border border-primary/20 rounded-md flex items-center justify-center bg-primary/5 text-primary font-serif font-bold text-xs flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary line-clamp-2 leading-relaxed mb-2 font-serif">
                      {capsule.message}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {capsule.emotion_tags?.slice(0, 3).map((tag) => (
                        <span 
                          key={tag}
                          className="px-2 py-0.5 text-[10px] font-serif border border-primary/10 text-primary bg-primary/5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-text-muted">
                      <span>
                        {capsule.distance_m != null ? (
                          `📍 距你 ${capsule.distance_m < 1000 ? `${Math.round(capsule.distance_m)}米` : `${(capsule.distance_m / 1000).toFixed(1)}公里`}`
                        ) : (
                          '未知距离'
                        )}
                      </span>
                      <span>{formatDate(capsule.created_at)}</span>
                    </div>
                  </div>
                </div>
              </Card>
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