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
import { Badge, Button } from '../components/ui'
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
      <div className="min-h-screen bg-bg page-in">
        <header className="sticky top-0 z-30 hud px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-signal transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <span className="text-xs font-mono tracking-wider">RETURN</span>
          </Button>
          <span className="label">SCAN MODE</span>
          <div className="w-16" />
        </header>

        {/* Degradation notice */}
        <div className="mx-4 mt-4 p-2.5 hud border-data-warn/20 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-data-warn breathe" />
          <span className="data text-data-warn">
            {!cap.hasCamera && !cap.hasWebGL ? 'AR UNAVAILABLE — LIST VIEW ACTIVE' :
             !cap.hasCamera ? 'CAMERA OFFLINE — LIST VIEW ACTIVE' :
             'RENDERER OFFLINE — LIST VIEW ACTIVE'}
          </span>
        </div>

        {/* Offline banner */}
        {!isOnline && (
          <div className="mx-4 mt-2 p-2.5 hud border-data-bad/20 flex items-center gap-2">
            <Badge variant="error" dot>OFFLINE — SCANNING CACHED DATA</Badge>
          </div>
        )}

        {/* Capsule scan results */}
        <div className="px-4 py-4">
          {capsules.length === 0 ? (
            <div className="py-16 text-center">
              <div className="label text-slate-600 mb-2">NO SIGNAL</div>
              <p className="data">No capsules detected in range</p>
            </div>
          ) : (
            <div className="space-y-1.5 stagger">
              {capsules.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/capsule/${c.id}`)}
                  className="w-full text-left row-hover p-3 rounded-[var(--radius-md)] border border-border bg-surface hover:border-border-active transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Signal indicator */}
                    <div className="relative flex-shrink-0 w-10 h-10 border border-border flex items-center justify-center">
                      {c.match_score != null && c.match_score > 60 ? (
                        <div className="w-2.5 h-2.5 bg-signal breathe" />
                      ) : (
                        <div className="w-2 h-2 bg-slate-600" />
                      )}
                      {c.match_score != null && c.match_score > 60 && (
                        <div className="absolute -top-px -right-px px-1 bg-signal/90">
                          <span className="text-[8px] font-mono font-bold text-void">{Math.round(c.match_score)}</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-200 truncate mb-1">{c.message?.slice(0, 50)}</p>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {c.emotion_tags?.slice(0, 3).map((t) => (
                          <span key={t} className="data text-[9px] text-primary-light border border-primary/15 px-1">{t}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                        {c.distance_m != null && <span className="data text-[9px]">{Math.round(c.distance_m)}m</span>}
                        <span className="data text-[9px]">OPENED {c.open_count}x</span>
                      </div>
                      {c.match_reasons?.[0] && (
                        <p className="data text-[9px] text-signal/60 mt-0.5 truncate">{c.match_reasons[0]}</p>
                      )}
                    </div>

                    {/* Thumbnail */}
                    {c.media?.[0] && (
                      <div className="w-12 h-12 flex-shrink-0 border border-border overflow-hidden">
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
            className="w-full py-3 border border-capsule/25 bg-capsule/5 text-capsule text-xs font-mono tracking-wider rounded-[var(--radius-md)] hover:bg-capsule/10 transition-colors"
          >
            + DEPLOY CAPSULE
          </button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════
  // NORMAL AR MODE
  // ══════════════════════════════════════════
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Camera */}
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-contain bg-black" />

      {/* Three.js AR */}
      {cameraReady && (
        <ARScene userLat={arAnchor.lat} userLng={arAnchor.lng} deviceAlpha={smoothedAlpha} deviceBeta={smoothedBeta} capsules={capsules}
          onCapsuleClick={(id) => navigate(`/capsule/${id}`)} />
      )}

      {/* Vision-assisted stable AR card. This is the main AR path: normal
          camera + Qwen-VL layout, without WebXR/ARCore dependency. */}
      {smartLayout && smartPose && smartPrimaryCapsule && (
        <div className="absolute inset-0 z-[16] pointer-events-none">
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-capsule/35 bg-capsule/10 blur-[0.2px] transition-[left,top,width,height,opacity] duration-300 ease-out"
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
            className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 transition-[left,top,transform,opacity] duration-200 ease-out"
            style={{
              left: `${smartPose.left}%`,
              top: `${smartPose.top}%`,
              opacity: smartPose.opacity,
              transform: `translate(-50%, -50%) perspective(760px) rotateX(${smartPose.rotateX}deg) rotateY(${smartPose.rotateY}deg) scale(${smartPose.scale})`,
            }}
          >
            <div className="relative w-[15rem] max-w-[72vw] overflow-hidden rounded-2xl border border-capsule/45 bg-gradient-to-b from-slate-950/80 via-void/78 to-black/85 p-4 text-center shadow-[0_0_35px_rgba(245,166,35,0.32)] backdrop-blur-md">
              <div className="absolute inset-x-6 top-0 h-px bg-capsule/70" />
              <div className="mb-2 text-[11px] font-mono tracking-[0.28em] text-capsule">智能 AR</div>
              <p className="mb-2 text-sm font-semibold text-slate-100">附近胶囊</p>
              <p className="mb-3 line-clamp-3 text-xs leading-relaxed text-slate-100">{smartPrimaryCapsule.message || '时空信箱内容'}</p>
              <div className="mb-3 flex flex-wrap justify-center gap-1.5">
                {smartSecondaryCapsules.map((capsule) => (
                  <span key={capsule.id} className="rounded-full border border-capsule/20 bg-capsule/10 px-2 py-0.5 text-[9px] text-amber-100">
                    {capsule.distance_m != null ? `${Math.round(capsule.distance_m)}m` : '附近'}
                  </span>
                ))}
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-slate-300">
                {smartLayout.ground_visible ? '场景锚定 · 跟随镜头远近变化' : '屏幕锚定 · 跟随镜头方向变化'}
              </div>
            </div>
          </button>
          {smartSecondaryCapsules.map((capsule, index) => {
            const ghostPose = getSmartARGhostPose(smartPose, index)
            return (
              <button
                key={capsule.id}
                onClick={() => navigate(`/capsule/${capsule.id}`)}
                className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 rounded-xl border border-capsule/25 bg-void/55 px-2.5 py-1.5 text-[9px] text-slate-200 shadow-[0_0_18px_rgba(245,166,35,0.18)] backdrop-blur-sm transition-[left,top,transform,opacity] duration-200 ease-out"
                style={{
                  left: `${ghostPose.left}%`,
                  top: `${ghostPose.top}%`,
                  opacity: ghostPose.opacity,
                  transform: `translate(-50%, -50%) scale(${ghostPose.scale})`,
                }}
              >
                {capsule.distance_m != null ? `${Math.round(capsule.distance_m)}m` : '附近'} · 胶囊
              </button>
            )
          })}
        </div>
      )}

      {/* Visible AR markers over the camera feed. Three.js still renders the
          spatial scene, but these markers guarantee users can see detected
          capsules even when compass heading is unavailable or noisy. */}
      {primaryCapsule && primaryMarker && !smartLayout && (
        <div className="absolute inset-0 z-[15] pointer-events-none">
          <button
            key={primaryCapsule.id}
            onClick={() => navigate(`/capsule/${primaryCapsule.id}`)}
            className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 group transition-[left,top,opacity] duration-200 ease-out"
            style={{ left: `${primaryMarker.left}%`, top: `${primaryMarker.top}%`, opacity: primaryMarker.opacity }}
          >
            <div className="relative flex flex-col items-center">
              <div className="absolute inset-0 -m-2 rounded-full border border-capsule/25 animate-ping" />
              <div className="relative w-11 h-11 rounded-full border border-capsule/55 bg-void/35 backdrop-blur-sm shadow-[0_0_20px_rgba(245,166,35,0.35)] flex items-center justify-center">
                <div className="w-5 h-5 text-capsule">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
              </div>
              <div className="mt-1.5 max-w-[7rem] px-1.5 py-1 rounded-[var(--radius-sm)] border border-capsule/20 bg-void/60 backdrop-blur-sm text-center">
                <p className="text-[9px] font-mono text-capsule truncate">
                  {primaryCapsule.distance_m != null ? `${Math.round(primaryCapsule.distance_m)}m` : 'CAPSULE'}
                </p>
                <p className="text-[9px] text-slate-200 truncate">
                  {primaryCapsule.message?.slice(0, 12) || '时空胶囊'}
                </p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* HUD Top */}
      <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-start z-20">
        <button onClick={() => navigate('/')} className="hud px-3 py-2 text-xs font-mono tracking-wider text-slate-300 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[var(--radius-sm)] hover:text-white transition-colors" aria-label="Return to map">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          {!isOnline && <Badge variant="error" dot className="animate-pulse">OFFLINE</Badge>}
          <button
            onClick={scanSmartAR}
            disabled={!cameraReady || smartScanning}
            className="hud px-3 py-2 text-xs font-mono tracking-wider text-capsule rounded-[var(--radius-sm)] hover:bg-capsule/10 transition-colors disabled:opacity-50"
          >
            {smartScanning ? 'SCANNING' : '智能 AR'}
          </button>
          <div className="hud px-3 py-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-signal breathe" />
            <span className="data-value text-xs font-mono">
              {orientation.alpha != null ? `${Math.round(orientation.alpha)}°` : '---'}
            </span>
          </div>
        </div>
      </div>

      {/* HUD Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-3 pb-7 z-20">
        <div className="hud p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="label">AR SCAN</span>
            <span className="data-value text-xs font-mono">{capsules.length} DETECTED</span>
          </div>
          <p className="data text-slate-500 mb-1">
            {smartLayout ? smartLayout.atmosphere : '点击“智能 AR”扫描场景，把附近胶囊锚定到画面中'}
          </p>
          {smartError && <p className="data text-data-warn mb-1">{smartError}</p>}
          {capsules.length > 0 ? (
            <div className="flex gap-1.5 overflow-x-auto">
              {capsules.slice(0, 3).map((c) => (
                <button key={c.id} onClick={() => navigate(`/capsule/${c.id}`)}
                  className="flex-shrink-0 px-2.5 py-1.5 border border-border text-[10px] text-slate-300 row-hover font-mono rounded-[var(--radius-sm)] hover:border-border-active transition-colors">
                  {c.message?.slice(0, 15)}
                </button>
              ))}
            </div>
          ) : (
            <p className="data">Rotate device to scan for capsules</p>
          )}
          {orientation.error && (
            <p className="data text-data-warn mt-1">{orientation.error}</p>
          )}
        </div>
      </div>

      {/* Camera error overlay */}
      {cameraError && (
        <div className="absolute inset-0 flex items-center justify-center bg-void/90 z-30">
          <div className="text-center p-6 decode-in">
            <div className="label text-data-bad mb-3">CAMERA OFFLINE</div>
            <p className="data mb-1">{cameraError}</p>
            <p className="data text-slate-600 mb-6">Switching to list-based scan mode</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => navigate('/')} className="px-4 py-2 border border-border text-slate-400 text-xs font-mono tracking-wider rounded-[var(--radius-sm)] hover:border-border-active transition-colors">MAP</button>
              {capsules.length > 0 && (
                <button onClick={() => navigate(`/capsule/${capsules[0].id}`)} className="px-4 py-2 border border-signal/30 text-signal text-xs font-mono tracking-wider rounded-[var(--radius-sm)] hover:bg-signal/10 transition-colors">BROWSE</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* iOS gyro permission */}
      {(orientation.error || !orientation.isSupported) && (
        <button onClick={orientation.requestPermission}
          className="absolute top-16 left-1/2 -translate-x-1/2 hud px-4 py-2 text-xs text-signal font-mono tracking-wider z-20 rounded-[var(--radius-sm)] hover:bg-signal/5 transition-colors">
          ENABLE GYROSCOPE
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
    atmosphere: '视觉识别暂时不可用，已使用稳定的屏幕下方摆放方案',
    blessing_copy: capsuleCount > 1 ? `这里有 ${capsuleCount} 个附近胶囊` : '这里有 1 个附近胶囊',
    confidence: 0.45,
    source: 'frontend_fallback',
  }
}
