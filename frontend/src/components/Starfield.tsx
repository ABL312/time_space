import { useEffect, useState, useMemo } from 'react'

/**
 * Deterministic pseudo-random number generator (mulberry32)
 * Produces consistent star positions across renders.
 */
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Star {
  x: number
  y: number
  size: number
  opacity: number
  twinkle: string
  color: string
  delay: number
}

interface ShootingStar {
  id: number
  x: number
  y: number
  delay: number
}

interface StarfieldProps {
  /** Number of stars to generate (default 100) */
  count?: number
  /** Seed for deterministic positions (default 42) */
  seed?: number
  /** Enable shooting stars (default true) */
  shooting?: boolean
}

export default function Starfield({ count = 100, seed = 42, shooting = true }: StarfieldProps) {
  const [shooters, setShooters] = useState<ShootingStar[]>([])

  // Generate stars deterministically
  const stars = useMemo<Star[]>(() => {
    const rand = seededRandom(seed)
    const colors = [
      'rgba(255,255,255,', // white (most common)
      'rgba(255,255,255,',
      'rgba(255,255,255,',
      'rgba(34,211,238,',   // cyan
      'rgba(245,166,35,',   // gold
      'rgba(129,140,248,',  // purple
    ]
    const twinkleClasses = ['twinkle-a', 'twinkle-b', 'twinkle-c', '', '', '']

    return Array.from({ length: count }, () => {
      const size = rand() < 0.15 ? 2 + rand() * 1.5 : rand() < 0.4 ? 1.5 : 1
      return {
        x: rand() * 100,
        y: rand() * 100,
        size,
        opacity: 0.3 + rand() * 0.7,
        twinkle: twinkleClasses[Math.floor(rand() * twinkleClasses.length)],
        color: colors[Math.floor(rand() * colors.length)],
        delay: rand() * 5,
      }
    })
  }, [count, seed])

  // Shooting stars - trigger periodically
  useEffect(() => {
    if (!shooting) return
    let id = 0

    const trigger = () => {
      const star: ShootingStar = {
        id: id++,
        x: Math.random() * 70,
        y: Math.random() * 40,
        delay: 0,
      }
      setShooters((prev) => [...prev.slice(-3), star])

      // Remove after animation
      setTimeout(() => {
        setShooters((prev) => prev.filter((s) => s.id !== star.id))
      }, 2000)
    }

    // First shooting star after 3s, then every 6-12s
    const firstTimeout = setTimeout(trigger, 3000)
    const interval = setInterval(() => {
      trigger()
    }, 6000 + Math.random() * 6000)

    return () => {
      clearTimeout(firstTimeout)
      clearInterval(interval)
    }
  }, [shooting])

  return (
    <>
      <div className="star-layer" aria-hidden="true">
        {stars.map((star, i) => (
          <div
            key={i}
            className={`star-layer-dot ${star.twinkle}`}
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              background: `${star.color}${star.opacity})`,
              boxShadow: star.size > 1.5
                ? `0 0 ${star.size * 3}px ${star.size}px ${star.color}${star.opacity * 0.4})`
                : 'none',
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>

      {shooting && shooters.map((s) => (
        <div
          key={s.id}
          className="shooting-star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
          }}
        />
      ))}
    </>
  )
}
