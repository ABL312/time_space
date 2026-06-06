import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGeolocation } from '../hooks/useGeolocation'
import { useOrientation } from '../hooks/useOrientation'
import { useCapsuleStore } from '../stores/capsuleStore'
import { useCapabilityCheck } from '../hooks/useCapabilityCheck'
import { useOnline } from '../hooks/useOnline'
import { Badge, Button } from '../components/ui'
import ARScene from '../components/ARScene'

export default function ARPage() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const { latitude, longitude } = useGeolocation()
  const orientation = useOrientation()
  const { nearby, fetchNearby } = useCapsuleStore()
  const cap = useCapabilityCheck()
  const { isOnline } = useOnline()
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    if (cap.isReady && !cap.hasCamera) return
    let stream: MediaStream | null = null
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => setCameraReady(true)
        }
      } catch { setCameraError('摄像头权限被拒绝') }
    }
    start()
    return () => { stream?.getTracks().forEach((t) => t.stop()) }
  }, [cap.hasCamera, cap.isReady])

  useEffect(() => {
    if (latitude && longitude) fetchNearby({ lat: latitude, lng: longitude, radius: 500 })
  }, [latitude, longitude, fetchNearby])

  const capsules = nearby ? [...nearby.recommended, ...nearby.others] : []

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
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />

      {/* Three.js AR */}
      {cameraReady && latitude && longitude && (
        <ARScene userLat={latitude} userLng={longitude} deviceAlpha={orientation.alpha} capsules={capsules}
          onCapsuleClick={(id) => navigate(`/capsule/${id}`)} />
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
      {!orientation.isSupported && (
        <button onClick={orientation.requestPermission}
          className="absolute top-16 left-1/2 -translate-x-1/2 hud px-4 py-2 text-xs text-signal font-mono tracking-wider z-20 rounded-[var(--radius-sm)] hover:bg-signal/5 transition-colors">
          ENABLE GYROSCOPE
        </button>
      )}
    </div>
  )
}
