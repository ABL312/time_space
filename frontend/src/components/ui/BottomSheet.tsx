import { useEffect, useRef, useState, type ReactNode } from 'react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  snapPoints?: number[]
  className?: string
}

/**
 * BottomSheet — 移动端辅助抽屉
 * 从底部滑出，支持拖拽关闭和点击遮罩关闭
 */
export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}: BottomSheetProps) {
  const [translateY, setTranslateY] = useState(100)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef<number | null>(null)
  const dragDelta = useRef(0)

  // Animate in/out
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setTranslateY(0))
    } else {
      queueMicrotask(() => setTranslateY(100))
    }
  }, [isOpen])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Keyboard: Escape to close
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY
    dragDelta.current = 0
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartY.current === null) return
    dragDelta.current = Math.max(0, e.clientY - dragStartY.current)
    const percent = Math.min(100, (dragDelta.current / window.innerHeight) * 100)
    setTranslateY(percent)
  }

  const handlePointerUp = () => {
    if (dragDelta.current > 100) {
      onClose()
    } else {
      setTranslateY(0)
    }
    dragStartY.current = null
    dragDelta.current = 0
  }

  if (!isOpen && translateY === 100) return null

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title || 'Drawer'}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        style={{ opacity: isOpen ? 1 : 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 max-h-[80vh] bg-surface border-t border-border rounded-t-[var(--radius-lg)] shadow-xl transition-transform duration-300 ease-out ${className}`}
        style={{ transform: `translateY(${translateY}%)` }}
        role="document"
      >
        {/* Drag handle */}
        <div
          className="flex items-center justify-center py-2 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label="Drag to close"
        >
          <div className="w-10 h-1 rounded-full bg-border-subtle" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 pb-2">
            <h3 className="text-sm font-semibold tracking-wider text-text-primary uppercase">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-light text-text-tertiary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal/50"
              aria-label="Close drawer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto px-4 pb-6 max-h-[calc(80vh-3rem)]">
          {children}
        </div>
      </div>
    </div>
  )
}
