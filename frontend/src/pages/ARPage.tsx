import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { calculateBearing, useGeolocation } from '../hooks/useGeolocation'
import { useOrientation } from '../hooks/useOrientation'
import { useVirtualLocation } from '../hooks/useVirtualLocation'
import { useCapsuleStore } from '../stores/capsuleStore'
import { useCapabilityCheck } from '../hooks/useCapabilityCheck'
import { useOnline } from '../hooks/useOnline'
import { aiApi } from '../lib/api'
import { getErrorMessage } from '../lib/client'
import type { ARSceneLayout } from '../types'
import { Button } from '../components/ui'
import ARScene from '../components/ARScene'

type SmartARAnchor = {
  layout: ARSceneLayout
  heading: number | null
  pitch: number | null
}

export default function ARPage() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const { latitude, longitude } = useGeolocation()
  const { virtualLocation } = useVirtualLocation()
  const orientation = useOrientation()
  const { nearby, fetchNearby } = useCapsuleStore()
  const cap = useCapabilityCheck()
  const { isOnline } = useOnline()
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const [smartLayout, setSmartLayout] = useState<ARSceneLayout | null>(null)
  const [smartAnchor, setSmartAnchor] = useState<SmartARAnchor | null>(null)
  const [smartScanning, setSmartScanning] = useState(false)
  const [smartError, setSmartError] = useState<string | null>(null)
  const [arAnchor, setArAnchor] = useState(() => ({
    lat: virtualLocation?.lat ?? latitude ?? 31.0282,
    lng: virtualLocation?.lng ?? longitude ?? 121.4346,
  }))
  const smoothedAlpha = useSmoothedAngle(orientation.alpha)
  const smoothedBeta = useSmoothedNumber(orientation.beta)
  const pitchAnchorRef = useRef<number | null>(null)

  useEffect(() => {
    if (virtualLocation) {
      setArAnchor({ lat: virtualLocation.lat, lng: virtualLocation.lng })
    }
  }, [virtualLocation])

  useEffect(() => {
    if (smoothedBeta != null && pitchAnchorRef.current == null) {
      pitchAnchorRef.current = smoothedBeta
    }
  }, [smoothedBeta])

  useEffect(() => {
    if (cap.isReady && !cap.hasCamera) return
    let stream: MediaStream | null = null
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        cameraStreamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => setCameraReady(true)
        }
      } catch { setCameraError('摄像头权限被拒绝') }
    }
    start()
    return () => {
      stream?.getTracks().forEach((t) => t.stop())
      if (cameraStreamRef.current === stream) cameraStreamRef.current = null
    }
  }, [cap.hasCamera, cap.isReady])

  useEffect(() => {
    fetchNearby({ lat: arAnchor.lat, lng: arAnchor.lng, radius: 500 })
  }, [arAnchor.lat, arAnchor.lng, fetchNearby])

  const capsules = nearby ? [...nearby.recommended, ...nearby.others] : []
  const primaryCapsule = capsules[0]
  const smartPrimaryCapsule = capsules[0]
  const smartSecondaryCapsules = capsules.slice(1, 4)
  const primaryMarker = primaryCapsule
    ? getARMarkerPosition({
      capsule: primaryCapsule,
      userLat: arAnchor.lat,
      userLng: arAnchor.lng,
      heading: smoothedAlpha,
      pitch: smoothedBeta,
      pitchAnchor: pitchAnchorRef.current,
    })
    : null
  const smartPose = smartAnchor ? getSmartARPose(smartAnchor, smoothedAlpha, smoothedBeta) : null

  async function scanSmartAR() {
    if (!videoRef.current || !cameraReady) {
      setSmartError('摄像头尚未准备好')
      return
    }

    try {
      setSmartScanning(true)
      setSmartError(null)
      const frame = await captureVideoFrame(videoRef.current)
      const layout = await aiApi.getARSceneLayout(frame, arAnchor.lat, arAnchor.lng, capsules.length)
      setSmartLayout(layout)
      setSmartAnchor({ layout, heading: smoothedAlpha, pitch: smoothedBeta })
    } catch (err) {
      setSmartError(getErrorMessage(err, '智能 AR 扫描失败'))
      const fallbackLayout = createFallbackSmartLayout(capsules.length)
      setSmartLayout(fallbackLayout)
      setSmartAnchor({ layout: fallbackLayout, heading: smoothedAlpha, pitch: smoothedBeta })
    } finally {
      setSmartScanning(false)
    }
  }

  // ══════════════════════════════════════════
  // DEGRADED: No camera / No WebGL
  // ══════════════════════════════════════════
  if (cap.isReady && cap.shouldSkipAR) {
    return (
      <div className="min-h-screen bg-bg page-in font-serif">
        <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-xl border-b border-primary/10 px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="flex items-center gap-2 text-primary hover:bg-surface rounded-full transition-colors py-1.5 px-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <span className="text-xs font-bold font-serif">返回地图</span>
          </Button>
          <span className="text-sm font-bold text-text-primary">寻信列表</span>
          <div className="w-16" />
        </header>

        {/* Degradation notice */}
        <div className="mx-4 mt-4 p-3 border border-primary/15 bg-surface/30 rounded-md flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="text-xs text-text-secondary">
            {!cap.hasCamera && !cap.hasWebGL ? 'AR 空间渲染不可用 — 已切换至列表寻信' :
             !cap.hasCamera ? '相机启动失败 — 已切换至列表寻信' :
             '空间渲染引擎离线 — 已切换至列表寻信'}
          </span>
        </div>

        {/* Offline banner */}
        {!isOnline && (
          <div className="mx-4 mt-2 p-3 border border-red-500/10 bg-red-500/5 rounded-md flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            <span className="text-xs text-data-bad">处于离线状态 (显示本地缓存信件)</span>
          </div>
        )}

        {/* Capsule scan results */}
        <div className="px-4 py-4">
          {capsules.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-sm font-bold text-text-secondary mb-2">📬 静待回音</div>
              <p className="text-xs text-text-muted">当前范围内未探寻到时空来信</p>
            </div>
          ) : (
            <div className="space-y-3 stagger">
              {capsules.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/capsule/${c.id}`)}
                  className="w-full text-left flex overflow-hidden rounded-md border border-primary/15 bg-surface/30 hover:border-primary/30 hover:bg-surface/50 transition-colors cursor-pointer p-3"
                >
                  <div className="flex items-start gap-3">
                    {/* Signal indicator */}
                    <div className="relative flex-shrink-0 w-10 h-10 border border-primary/15 rounded-md bg-primary/5 flex items-center justify-center">
                      {c.match_score != null && c.match_score > 60 ? (
                        <span className="text-lg">💌</span>
                      ) : (
                        <span className="text-lg">✉️</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text-primary font-serif line-clamp-2 leading-relaxed mb-2">{c.message}</p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {c.emotion_tags?.slice(0, 3).map((t) => (
                          <span key={t} className="text-[10px] text-primary border border-primary/10 bg-primary/5 px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-text-muted">
                        {c.distance_m != null && <span>📍 距你 {Math.round(c.distance_m)}米</span>}
                        <span>•</span>
                        <span>已被开启 {c.open_count} 次</span>
                      </div>
                      {c.match_reasons?.[0] && (
                        <p className="text-[10px] text-primary font-bold mt-1.5">💡 {c.match_reasons[0]}</p>
                      )}
                    </div>

                    {/* Thumbnail */}
                    {c.media?.[0] && (
                      <div className="w-12 h-12 flex-shrink-0 border border-primary/10 rounded-md overflow-hidden bg-primary/5 shadow-sm">
                        <img src={c.media[0].thumbnail_url || c.media[0].url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Create CTA */}
        <div className="fixed bottom-5 left-4 right-4 z-20">
          <button
            onClick={() => navigate('/create')}
            className="w-full py-3.5 bg-primary text-white border border-primary/20 text-sm font-bold font-serif tracking-wider rounded-md hover:bg-primary-dark shadow-md transition-colors cursor-pointer"
          >
            ✍️ 书写一封时空来信
          </button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════
  // NORMAL AR MODE
  // ══════════════════════════════════════════
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black font-serif">
      {/* Camera */}
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-contain bg-black" />

      {/* Three.js AR */}
      {cameraReady && (
        <ARScene userLat={arAnchor.lat} userLng={arAnchor.lng} deviceAlpha={smoothedAlpha} deviceBeta={smoothedBeta} capsules={capsules}
          onCapsuleClick={(id) => navigate(`/capsule/${id}`)} />
      )}

      {/* Vision-assisted stable AR card */}
      {smartLayout && smartPose && smartPrimaryCapsule && (
        <div className="absolute inset-0 z-[16] pointer-events-none">
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/35 bg-primary/10 blur-[0.2px] transition-[left,top,width,height,opacity] duration-300 ease-out"
            style={{
              left: `${smartPose.shadowLeft}%`,
              top: `${smartPose.shadowTop}%`,
              width: `${smartPose.shadowSize}px`,
              height: `${smartPose.shadowSize * 0.32}px`,
              opacity: smartPose.shadowOpacity,
            }}
          />
          <button
            onClick={() => navigate(`/capsule/${smartPrimaryCapsule.id}`)}
            className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 transition-[left,top,transform,opacity] duration-200 ease-out cursor-pointer"
            style={{
              left: `${smartPose.left}%`,
              top: `${smartPose.top}%`,
              opacity: smartPose.opacity,
              transform: `translate(-50%, -50%) perspective(760px) rotateX(${smartPose.rotateX}deg) rotateY(${smartPose.rotateY}deg) scale(${smartPose.scale})`,
            }}
          >
            <div className="relative w-[15rem] max-w-[72vw] overflow-hidden rounded-2xl border border-primary/40 bg-bg/95 p-4 text-center shadow-lg backdrop-blur-md">
              <div className="absolute inset-x-6 top-0 h-0.5 bg-primary/60" />
              <div className="mb-1.5 text-[10px] uppercase tracking-wider text-primary font-bold">寻信 AR 锚定</div>
              <p className="mb-2 text-sm font-bold text-text-primary">附近来信</p>
              <p className="mb-3 line-clamp-3 text-xs leading-relaxed text-text-secondary">{smartPrimaryCapsule.message}</p>
              <div className="mb-3 flex flex-wrap justify-center gap-1.5">
                {smartSecondaryCapsules.map((capsule) => (
                  <span key={capsule.id} className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[9px] text-primary font-bold">
                    📍 {capsule.distance_m != null ? `${Math.round(capsule.distance_m)}米` : '附近'}
                  </span>
                ))}
              </div>
              <div className="rounded-lg border border-primary/10 bg-surface/50 px-2 py-1 text-[10px] text-text-secondary">
                {smartLayout.ground_visible ? '🌱 场景锚定 · 随镜头近远拉伸' : '📱 屏幕锚定 · 随镜头转动变化'}
              </div>
            </div>
          </button>
          {smartSecondaryCapsules.map((capsule, index) => {
            const ghostPose = getSmartARGhostPose(smartPose, index)
            return (
              <button
                key={capsule.id}
                onClick={() => navigate(`/capsule/${capsule.id}`)}
                className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 rounded-md border border-primary/20 bg-bg/90 px-2.5 py-1.5 text-[10px] text-text-primary shadow-md backdrop-blur-sm transition-[left,top,transform,opacity] duration-200 ease-out cursor-pointer"
                style={{
                  left: `${ghostPose.left}%`,
                  top: `${ghostPose.top}%`,
                  opacity: ghostPose.opacity,
                  transform: `translate(-50%, -50%) scale(${ghostPose.scale})`,
                }}
              >
                📬 {capsule.distance_m != null ? `${Math.round(capsule.distance_m)}米` : '附近'} · 时空信件
              </button>
            )
          })}
        </div>
      )}

      {/* Visible AR markers over the camera feed */}
      {primaryCapsule && primaryMarker && !smartLayout && (
        <div className="absolute inset-0 z-[15] pointer-events-none">
          <button
            key={primaryCapsule.id}
            onClick={() => navigate(`/capsule/${primaryCapsule.id}`)}
            className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 group transition-[left,top,opacity] duration-200 ease-out cursor-pointer"
            style={{ left: `${primaryMarker.left}%`, top: `${primaryMarker.top}%`, opacity: primaryMarker.opacity }}
          >
            <div className="relative flex flex-col items-center">
              <div className="absolute inset-0 -m-2 rounded-full border border-primary/30 animate-ping" />
              <div className="relative w-11 h-11 rounded-full border border-primary/40 bg-bg/90 shadow-md flex items-center justify-center text-xl">
                💌
              </div>
              <div className="mt-2 max-w-[8rem] px-2 py-1 rounded border border-primary/20 bg-bg/95 shadow-sm text-center">
                <p className="text-[10px] font-bold text-primary font-serif">
                  {primaryCapsule.distance_m != null ? `📍 ${Math.round(primaryCapsule.distance_m)}米` : '时空来信'}
                </p>
                <p className="text-[9px] text-text-secondary truncate font-serif">
                  {primaryCapsule.message || '时空来信'}
                </p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* HUD Top */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20">
        <button onClick={() => navigate('/')} className="px-3 py-2 text-xs font-serif font-bold text-text-primary bg-bg/95 border border-primary/20 shadow-sm min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-surface transition-colors cursor-pointer" aria-label="返回地图">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          {!isOnline && <span className="px-2 py-1 text-[10px] bg-red-500 text-white rounded-md font-bold animate-pulse">离线</span>}
          <button
            onClick={scanSmartAR}
            disabled={!cameraReady || smartScanning}
            className="px-3.5 py-2 text-xs font-serif font-bold text-primary bg-bg/95 border border-primary/20 shadow-sm rounded-full hover:bg-surface transition-colors disabled:opacity-50 cursor-pointer"
          >
            {smartScanning ? '⏳ 正在寻信...' : '🔍 寻信 AR'}
          </button>
          <div className="px-3 py-2 bg-bg/95 border border-primary/20 shadow-sm rounded-full flex items-center gap-1.5 text-xs text-text-secondary font-sans font-medium">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
            <span>{orientation.alpha != null ? `${Math.round(orientation.alpha)}°` : '---'}</span>
          </div>
        </div>
      </div>

      {/* HUD Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 z-20">
        <div className="bg-bg/95 border border-primary/20 shadow-lg rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-1.5 border-b border-primary/10 pb-1.5 text-xs font-bold text-text-primary">
            <span>空间扫描模式</span>
            <span className="text-primary font-bold">已探寻到 {capsules.length} 封信件</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed mb-3">
            {smartLayout ? smartLayout.atmosphere : '点击“寻信 AR”扫描环境，把这片虚空里的时空来信锚定到当前画画中。'}
          </p>
          {smartError && <p className="text-xs text-data-bad mb-2">{smartError}</p>}
          {capsules.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
              {capsules.slice(0, 3).map((c) => (
                <button key={c.id} onClick={() => navigate(`/capsule/${c.id}`)}
                  className="flex-shrink-0 px-3 py-1.5 border border-primary/15 bg-surface/30 rounded-md text-[10px] text-text-primary hover:border-primary hover:bg-surface transition-colors cursor-pointer">
                  ✉️ {c.message?.slice(0, 15)}...
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-text-muted">环顾四周以寻觅漂浮的时空来信...</p>
          )}
          {orientation.error && (
            <p className="text-xs text-data-bad mt-2">{orientation.error}</p>
          )}
        </div>
      </div>

      {/* Camera error overlay */}
      {cameraError && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg/95 z-30 font-serif">
          <div className="text-center p-6 max-w-sm">
            <span className="text-4xl block mb-3">📸</span>
            <h3 className="text-lg font-bold text-text-primary mb-2">相机无法使用</h3>
            <p className="text-xs text-text-secondary leading-relaxed mb-1">{cameraError}</p>
            <p className="text-xs text-text-muted mb-6">正在为你切换至列表寻信模式</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => navigate('/')} className="px-4 py-2 border border-primary/20 text-primary text-xs font-bold rounded-md hover:bg-surface cursor-pointer">返回地图</button>
              {capsules.length > 0 && (
                <button onClick={() => navigate(`/capsule/${capsules[0].id}`)} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-md hover:bg-primary-dark shadow-sm cursor-pointer">浏览来信</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* iOS gyro permission */}
      {(orientation.error || !orientation.isSupported) && (
        <button onClick={orientation.requestPermission}
          className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2.5 bg-primary text-white border border-primary/20 shadow-md text-xs font-bold rounded-full hover:bg-primary-dark transition-colors cursor-pointer z-20">
          🧭 开启设备陀螺仪定位
        </button>
      )}
    </div>
  )
}

function useSmoothedAngle(angle: number | null): number | null {
  const [smoothed, setSmoothed] = useState<number | null>(angle)

  useEffect(() => {
    if (angle == null) return
    setSmoothed((prev) => {
      if (prev == null) return angle
      let diff = angle - prev
      if (diff > 180) diff -= 360
      if (diff < -180) diff += 360
      if (Math.abs(diff) < 3) return prev
      const step = Math.max(-4, Math.min(4, diff * 0.05))
      return (prev + step + 360) % 360
    })
  }, [angle])

  return smoothed
}

function useSmoothedNumber(value: number | null): number | null {
  const [smoothed, setSmoothed] = useState<number | null>(value)

  useEffect(() => {
    if (value == null) return
    setSmoothed((prev) => {
      if (prev == null) return value
      const diff = value - prev
      if (Math.abs(diff) < 1) return prev
      return prev + diff * 0.08
    })
  }, [value])

  return smoothed
}

function getARMarkerPosition({
  capsule,
  userLat,
  userLng,
  heading,
  pitch,
  pitchAnchor,
}: {
  capsule: { latitude: number; longitude: number }
  userLat: number
  userLng: number
  heading: number | null
  pitch: number | null
  pitchAnchor: number | null
}) {
  const bearing = calculateBearing(userLat, userLng, capsule.latitude, capsule.longitude)
  let horizontalDiff = heading == null ? 0 : heading - bearing
  if (horizontalDiff > 180) horizontalDiff -= 360
  if (horizontalDiff < -180) horizontalDiff += 360

  const pitchDiff = pitch != null && pitchAnchor != null ? pitch - pitchAnchor : 0
  const left = clamp(50 + (horizontalDiff / 60) * 42, 8, 92)
  const top = clamp(43 + pitchDiff * 0.9, 18, 72)
  const opacity = Math.abs(horizontalDiff) > 75 ? 0.45 : 1

  return { left, top, opacity }
}

function getSmartARPose(anchor: SmartARAnchor, heading: number | null, pitch: number | null) {
  const placement = anchor.layout.placement
  const depth = getDepthProfile(placement.depth_hint)
  const headingDelta = anchor.heading != null && heading != null ? normalizeAngle(anchor.heading - heading) : 0
  const pitchDelta = anchor.pitch != null && pitch != null ? pitch - anchor.pitch : 0
  const parallax = anchor.layout.ground_visible ? 1 : 0.55
  const baseLeft = clamp(placement.x * 100, 12, 88)
  const baseTop = clamp(placement.y * 100, 18, 84)
  const left = clamp(baseLeft + headingDelta * depth.parallax * parallax, 6, 94)
  const top = clamp(baseTop + pitchDelta * depth.pitch * parallax, 12, 88)
  const edgeFade = clamp(1 - Math.max(0, Math.abs(headingDelta) - 35) / 55, 0.32, 1)
  const tiltScale = clamp(1 - Math.abs(pitchDelta) / 180, 0.82, 1.08)
  const scale = clamp(placement.scale * depth.scale * tiltScale, 0.46, 1.28)

  return {
    left,
    top,
    scale,
    opacity: edgeFade,
    rotateX: clamp(-pitchDelta * 0.28, -14, 14),
    rotateY: clamp(headingDelta * 0.32, -18, 18),
    shadowLeft: left + headingDelta * 0.04,
    shadowTop: clamp(top + 15 * depth.shadow, 20, 92),
    shadowSize: clamp(170 * placement.scale * depth.shadow, 72, 220),
    shadowOpacity: anchor.layout.ground_visible ? 0.48 * edgeFade : 0.22 * edgeFade,
  }
}

function getSmartARGhostPose(pose: ReturnType<typeof getSmartARPose>, index: number) {
  const offsets = [
    { x: -18, y: 10, scale: 0.74 },
    { x: 16, y: 15, scale: 0.62 },
    { x: 4, y: -16, scale: 0.54 },
  ]
  const offset = offsets[index] ?? offsets[offsets.length - 1]
  return {
    left: clamp(pose.left + offset.x * pose.scale, 7, 93),
    top: clamp(pose.top + offset.y * pose.scale, 13, 88),
    scale: clamp(pose.scale * offset.scale, 0.36, 0.95),
    opacity: clamp(pose.opacity * (0.8 - index * 0.12), 0.2, 0.8),
  }
}

// Depth profile helper
function getDepthProfile(depthHint: string) {
  if (depthHint === 'near') return { scale: 1.12, parallax: 0.74, pitch: 0.58, shadow: 0.92 }
  if (depthHint === 'far') return { scale: 0.72, parallax: 0.38, pitch: 0.3, shadow: 0.58 }
  return { scale: 0.92, parallax: 0.55, pitch: 0.44, shadow: 0.74 }
}

function normalizeAngle(value: number) {
  let normalized = value
  while (normalized > 180) normalized -= 360
  while (normalized < -180) normalized += 360
  return normalized
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function captureVideoFrame(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement('canvas')
  const width = video.videoWidth || 720
  const height = video.videoHeight || 960
  const maxSide = 960
  const scale = Math.min(1, maxSide / Math.max(width, height))
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)

  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('无法读取摄像头画面'))
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('截图失败'))
    }, 'image/jpeg', 0.72)
  })
}

function createFallbackSmartLayout(capsuleCount: number): ARSceneLayout {
  return {
    scene_type: 'fallback',
    ground_visible: false,
    placement: {
      anchor: 'bottom_center',
      x: 0.5,
      y: 0.68,
      scale: 0.9,
      depth_hint: 'middle',
    },
    safe_zones: [{ x: 0.32, y: 0.56, width: 0.36, height: 0.28, reason: '稳定的屏幕下方展示区域' }],
    avoid_zones: [],
    atmosphere: '场景分析服务暂不可用，已自动在正前方展开时空信件',
    blessing_copy: capsuleCount > 1 ? `这里有 ${capsuleCount} 封附近来信` : '这里有 1 封附近来信',
    confidence: 0.45,
    source: 'frontend_fallback',
  }
}
