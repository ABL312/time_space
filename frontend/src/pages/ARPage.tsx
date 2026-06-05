import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGeolocation } from '../hooks/useGeolocation'
import { useOrientation } from '../hooks/useOrientation'
import { useCapsuleStore } from '../stores/capsuleStore'
import ARScene from '../components/ARScene'
import ErrorBoundary from '../components/ErrorBoundary'
import FallbackARView from '../components/FallbackARView'

export default function ARPage() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const { latitude, longitude } = useGeolocation()
  const orientation = useOrientation()
  const { nearby, fetchNearby } = useCapsuleStore()
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [webglSupported, setWebglSupported] = useState<boolean>(true)

  // Start camera feed
  useEffect(() => {
    let stream: MediaStream | null = null

    async function startCamera() {
      try {
        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError('设备不支持摄像头功能')
          return
        }
        
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            setCameraReady(true)
          }
        }
      } catch (err) {
        console.error('Camera error:', err)
        setCameraError('无法访问摄像头，请授予摄像头权限')
      }
    }

    startCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  // Fetch nearby capsules
  useEffect(() => {
    if (latitude && longitude) {
      fetchNearby({ lat: latitude, lng: longitude, radius: 500 })
    }
  }, [latitude, longitude, fetchNearby])

  const capsules = nearby ? [...nearby.recommended, ...nearby.others] : []

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Layer 0: Camera video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Layer 1: Three.js AR scene */}
      {cameraReady && latitude && longitude && webglSupported && (
        <ErrorBoundary>
          <ARScene
            userLat={latitude}
            userLng={longitude}
            deviceAlpha={orientation.alpha}
            capsules={capsules}
            onCapsuleClick={(id) => navigate(`/capsule/${id}`)}
          />
        </ErrorBoundary>
      )}
      
      {/* WebGL fallback - CSS 3D animation mode */}
      {cameraReady && latitude && longitude && !webglSupported && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="text-center p-6 glass rounded-xl max-w-md">
            <p className="text-2xl mb-3">📦</p>
            <p className="text-sm text-white mb-4">
              设备不支持 WebGL，无法显示增强现实效果
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-light text-white mr-3 transition-colors"
            >
              返回地图
            </button>
            <button
              onClick={() => navigate(`/capsule/${capsules[0]?.id}`)}
              className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-light text-white transition-colors"
              disabled={!capsules.length}
            >
              查看胶囊
            </button>
          </div>
        </div>
      )}

      {/* Layer 2: HTML overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start">
        <button
          onClick={() => navigate('/')}
          className="glass rounded-full px-3 py-2 text-sm text-white"
        >
          ← 地图
        </button>
        <div className="glass rounded-full px-3 py-2 text-xs text-slate-300">
          🧭 {orientation.alpha != null ? `${Math.round(orientation.alpha)}°` : '---'}
        </div>
      </div>

      {/* Scene context overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-8">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">🔮 AR 探索模式</p>
          <p className="text-sm text-white">
            {capsules.length > 0
              ? `发现 ${capsules.length} 个时空胶囊在你附近`
              : '举起手机探索周围的时空胶囊'}
          </p>
          {orientation.error && (
            <p className="text-xs text-amber-400 mt-1">⚠️ {orientation.error}</p>
          )}
        </div>
      </div>

      {/* Camera error */}
      {cameraError && (
        <div className="absolute inset-0 z-20">
          <FallbackARView 
            capsules={capsules} 
            onReturnToMap={() => navigate('/')} 
          />
        </div>
      )}

      {/* iOS orientation permission prompt */}
      {!orientation.isSupported && (
        <button
          onClick={orientation.requestPermission}
          className="absolute top-16 left-1/2 -translate-x-1/2 glass rounded-lg px-4 py-2 text-xs text-primary-light"
        >
          点击启用陀螺仪
        </button>
      )}
    </div>
  )
}
