import type { SceneResult } from '../types'

interface SceneOverlayProps {
  /** Scene recognition result from GPT-4o Vision */
  scene: SceneResult | null
  /** Whether a scene capture is in progress */
  isLoading: boolean
  /** Error message (e.g. camera denied) */
  error: string | null
  /** Whether the scene was derived from location (fallback mode) */
  isFallback?: boolean
}

/** Map scene_type to a display emoji */
const SCENE_ICONS: Record<string, string> = {
  outdoor: '🌳',
  indoor: '🏠',
  nature: '🌿',
  urban: '🏙️',
  water: '🌊',
  mountain: '⛰️',
  night: '🌙',
}

export default function SceneOverlay({
  scene,
  isLoading,
  error,
  isFallback,
}: SceneOverlayProps) {
  // Loading state
  if (isLoading && !scene) {
    return (
      <div className="glass rounded-xl p-3 animate-pulse">
        <div className="flex items-center gap-2">
          <span className="text-sm">🔍</span>
          <span className="text-xs text-slate-400">正在识别场景...</span>
        </div>
      </div>
    )
  }

  // Error state (camera denied or API failed)
  if (error && !scene) {
    return (
      <div className="glass rounded-xl p-3 border border-amber-500/30">
        <div className="flex items-center gap-2">
          <span className="text-sm">⚠️</span>
          <div>
            <p className="text-xs text-amber-400">
              {isFallback ? '已降级到位置识别' : '场景识别不可用'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {error.length > 40 ? error.slice(0, 40) + '...' : error}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // No scene data yet
  if (!scene) {
    return (
      <div className="glass rounded-xl p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">📷</span>
          <span className="text-xs text-slate-500">等待场景分析...</span>
        </div>
      </div>
    )
  }

  // Scene available
  const icon = SCENE_ICONS[scene.scene_type] || '📍'
  const moods = scene.mood_match.slice(0, 3)

  return (
    <div className="glass rounded-xl p-4 space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm text-white font-medium">
            {scene.description || scene.scene_type}
          </span>
        </div>
        {isFallback && (
          <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
            位置模式
          </span>
        )}
        {isLoading && (
          <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        )}
      </div>

      {/* Atmosphere */}
      {scene.atmosphere && (
        <p className="text-xs text-slate-400">{scene.atmosphere}</p>
      )}

      {/* Mood match tags */}
      {moods.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {moods.map((mood) => (
            <span
              key={mood}
              className="px-2 py-0.5 rounded-full text-xs bg-primary/15 border border-primary/30 text-primary-light"
            >
              {mood}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
