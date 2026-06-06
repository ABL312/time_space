import type { Capsule } from '../types'
import { Button, Card } from './ui'

interface ProximityAlertProps {
  capsule: Capsule
  distance: number
  onDismiss: () => void
  onView: () => void
}

export default function ProximityAlert({
  capsule,
  distance,
  onDismiss,
  onView
}: ProximityAlertProps) {
  return (
    <Card
      variant="hud"
      className="fixed bottom-4 left-4 right-4 z-[1100] animate-slide-up"
      style={{
        animation: 'slide-up 0.3s ease-out forwards'
      } as React.CSSProperties}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-signal mb-1">附近有时空胶囊</h3>
            <p className="text-xs text-slate-300 mb-2 truncate">
              {capsule.emotion_tags?.[0] || '未知情感'} · 距离你 {Math.round(distance)}米
            </p>
            <p className="text-xs text-slate-400 truncate">
              来自 {capsule.author?.name || '匿名用户'}
            </p>
          </div>
          <Button
            variant="icon"
            size="icon-sm"
            onClick={onDismiss}
            className="ml-2 flex-shrink-0 text-slate-500 hover:text-signal"
            aria-label="关闭通知"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onView}
            className="flex-1 bg-signal/10 border border-signal/20 text-signal hover:bg-signal/20 transition-colors"
          >
            查看胶囊
          </Button>
        </div>
      </div>
    </Card>
  )
}
