import { motion, AnimatePresence } from 'framer-motion'
import type { Capsule } from '../types'

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
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed bottom-4 left-4 right-4 z-50 hud panel slide-up"
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
            <button 
              onClick={onDismiss}
              className="btn ml-2 flex-shrink-0 w-6 h-6 flex items-center justify-center text-slate-500 hover:text-signal"
              aria-label="关闭通知"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onView}
              className="btn flex-1 py-2 px-3 bg-signal/10 border border-signal/20 text-signal text-xs font-mono tracking-wider hover:bg-signal/20 transition-colors"
            >
              查看胶囊
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}