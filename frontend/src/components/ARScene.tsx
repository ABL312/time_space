import { useMemo } from 'react'
import type { Capsule } from '../types'
import { haversineDistance, calculateBearing } from '../hooks/useGeolocation'

interface ARSceneProps {
  userLat: number
  userLng: number
  deviceAlpha: number | null
  deviceBeta?: number | null
  capsules: Capsule[]
  onCapsuleClick: (id: string) => void
}

/** Screen-space position derived from GPS bearing + device orientation */
interface EnvelopePosition {
  id: string
  capsule: Capsule
  distance: number
  left: number   // 0-100%
  top: number    // 0-100%
  scale: number  // 0.1-1
  opacity: number
}

export default function ARScene({
  userLat,
  userLng,
  deviceAlpha,
  deviceBeta,
  capsules,
  onCapsuleClick,
}: ARSceneProps) {
  const envelopes = useMemo<EnvelopePosition[]>(() => {
    return capsules
      .map((capsule) => {
        const distance = haversineDistance(
          userLat, userLng,
          capsule.latitude, capsule.longitude
        )
        if (distance > 500) return null

        const bearing = calculateBearing(
          userLat, userLng,
          capsule.latitude, capsule.longitude
        )

        const heading = deviceAlpha ?? 0
        let angleDiff = heading - bearing
        if (angleDiff > 180) angleDiff -= 360
        if (angleDiff < -180) angleDiff += 360

        const inView = deviceAlpha == null || Math.abs(angleDiff) <= 60
        if (!inView) return null

        // Map horizontal angle (-60..+60) → screen X (10%..90%)
        const left = 50 + (angleDiff / 60) * 40

        // Pitch offset: tilt up/down → vertical shift
        const pitchOffset = deviceBeta == null
          ? 0
          : Math.max(-1, Math.min(1, (deviceBeta - 60) / 35))
        const top = 45 + pitchOffset * 15

        const scale = Math.max(0.15, 1 - distance / 500)
        const opacity = Math.max(0.2, 1 - Math.abs(angleDiff) / 90)

        return { id: capsule.id, capsule, distance, left, top, scale, opacity }
      })
      .filter((e): e is EnvelopePosition => e !== null)
  }, [userLat, userLng, deviceAlpha, deviceBeta, capsules])

  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
      {envelopes.map((env) => (
        <CartoonEnvelope
          key={env.id}
          envelope={env}
          onClick={() => onCapsuleClick(env.id)}
        />
      ))}
    </div>
  )
}

/* ── Cartoon Envelope Card ─────────────────────────────────────── */

function CartoonEnvelope({
  envelope: env,
  onClick,
}: {
  envelope: EnvelopePosition
  onClick: () => void
}) {
  const { capsule, distance, left, top, scale, opacity } = env
  const animDelay = `${(parseFloat(capsule.id.slice(-4)) || 0) * 0.01}s`
  const gradId = `envGrad-${capsule.id}`

  return (
    <button
      onClick={onClick}
      className="
        absolute pointer-events-auto
        flex flex-col items-center
        transition-[left,top,transform,opacity] duration-300 ease-out
        cursor-pointer group
      "
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        animationDelay: animDelay,
      }}
    >
      {/* Float animation wrapper */}
      <div
        className="envelope-float flex flex-col items-center"
        style={{ animationDelay: animDelay }}
      >
        {/* ── Cartoon envelope (SVG) ── */}
        <div className="
          relative
          w-16 h-12
          group-hover:scale-110 group-active:scale-95
          transition-transform duration-200
          drop-shadow-lg
        ">
          {/* Sparkle */}
          <div className="
            absolute -top-2 -right-2 z-10
            text-xs leading-none
            animate-bounce-in
          " style={{ animationDelay: animDelay }}>
            ✨
          </div>

          <svg viewBox="0 0 64 48" className="w-full h-full overflow-visible">
            {/* Shadow under envelope */}
            <rect x="1" y="2" width="62" height="44" rx="6" fill="#d97706" opacity="0.25" />

            {/* Envelope body */}
            <rect x="0" y="0" width="62" height="43" rx="5"
              fill={`url(#${gradId})`} stroke="#d97706" strokeWidth="1.8" />

            {/* Fold lines (cross pattern) */}
            <line x1="0" y1="21" x2="62" y2="21" stroke="#f59e0b" strokeWidth="0.8" opacity="0.5" strokeDasharray="2,2" />
            <line x1="31" y1="0" x2="31" y2="21" stroke="#f59e0b" strokeWidth="0.8" opacity="0.4" strokeDasharray="2,2" />
            <line x1="0" y1="0" x2="31" y2="21" stroke="#f59e0b" strokeWidth="0.6" opacity="0.3" />
            <line x1="62" y1="0" x2="31" y2="21" stroke="#f59e0b" strokeWidth="0.6" opacity="0.3" />

            {/* Flap — V-shape on top */}
            <polygon points="0,0 31,21 62,0" fill="#fbbf24" opacity="0.7" stroke="#d97706" strokeWidth="1.2" />

            {/* Address lines (scribble) */}
            <line x1="14" y1="29" x2="40" y2="29" stroke="#b45309" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
            <line x1="14" y1="34" x2="36" y2="34" stroke="#b45309" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
            <line x1="14" y1="39" x2="32" y2="39" stroke="#b45309" strokeWidth="1" opacity="0.2" strokeLinecap="round" />

            {/* Stamp — top right corner, small rectangle */}
            <rect x="46" y="3" width="10" height="12" rx="1" fill="#ef4444" opacity="0.65"
              stroke="#dc2626" strokeWidth="0.8" strokeDasharray="1.5,1" />
            <circle cx="51" cy="9" r="2.5" fill="#fecaca" opacity="0.7" />

            {/* Wax seal — bottom right corner, small heart */}
            <g transform="translate(52, 34) scale(0.55)">
              <path d="M0,3 C0,3 -6,-3 -6,-7 C-6,-10 -3,-12 0,-9 C3,-12 6,-10 6,-7 C6,-3 0,3 0,3Z"
                fill="#dc2626" opacity="0.8" stroke="#991b1b" strokeWidth="1" />
            </g>

            {/* Gradients */}
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fef3c7" />
                <stop offset="100%" stopColor="#fde68a" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* ── Distance badge ── */}
        <div className="
          mt-1.5 px-2 py-0.5
          rounded-full
          bg-amber-900/70 backdrop-blur-sm
          border border-amber-500/30
          text-[9px] font-bold font-mono
          text-amber-200
          shadow-sm
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200
          whitespace-nowrap
        ">
          📍 {Math.round(distance)}m
        </div>

        {/* ── Message preview (on hover) ── */}
        <div className="
          absolute top-full mt-8
          max-w-[10rem] px-3 py-2
          rounded-lg
          bg-bg/90 backdrop-blur-md
          border border-primary/20
          shadow-lg
          opacity-0 group-hover:opacity-100
          transition-all duration-200
          pointer-events-none
          text-center
        ">
          <p className="text-[10px] text-text-primary font-serif leading-relaxed line-clamp-2">
            {capsule.message || '时空来信'}
          </p>
          <div className="flex flex-wrap justify-center gap-1 mt-1.5">
            {capsule.emotion_tags?.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[8px] text-primary border border-primary/15 bg-primary/5 px-1.5 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  )
}
