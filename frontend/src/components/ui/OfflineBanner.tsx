import { useOnline } from '../../hooks/useOnline'

interface OfflineBannerProps {
  className?: string
}

/**
 * OfflineBanner — 断网时显示的顶部横幅
 * 自动监听 online/offline 事件，断网时滑入，恢复后滑出
 */
export default function OfflineBanner({ className = '' }: OfflineBannerProps) {
  const { isOnline } = useOnline()

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[60] transition-transform duration-300 ease-out ${
        isOnline ? '-translate-y-full' : 'translate-y-0'
      } ${className}`}
      role="alert"
      aria-live="assertive"
      aria-hidden={isOnline}
    >
      <div className="bg-data-bad/90 backdrop-blur-sm text-white px-4 py-2 text-center text-xs font-medium tracking-wide">
        <div className="flex items-center justify-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          <span>OFFLINE — DISPLAYING CACHED DATA</span>
        </div>
      </div>
    </div>
  )
}
