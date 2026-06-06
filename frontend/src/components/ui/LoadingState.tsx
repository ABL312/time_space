interface LoadingStateProps {
  message?: string
  fullscreen?: boolean
  className?: string
}

export default function LoadingState({
  message,
  fullscreen = false,
  className = '',
}: LoadingStateProps) {
  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative">
        <div className="w-8 h-8 border border-signal/30 border-t-signal rounded-full animate-spin" />
      </div>
      {message && (
        <p className="mt-4 text-xs font-mono text-text-tertiary tracking-wider uppercase">
          {message}
        </p>
      )}
    </div>
  )

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-void">
        {content}
      </div>
    )
  }

  return <div className="py-12">{content}</div>
}

/** Skeleton line for content placeholders */
export function SkeletonLine({ width = '100%', height = '16px', className = '' }: {
  width?: string
  height?: string
  className?: string
}) {
  return (
    <div
      className={`skeleton rounded-[var(--radius-xs)] ${className}`}
      style={{ width, height }}
    />
  )
}

/** Skeleton block for card/list placeholders */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface border border-border rounded-[var(--radius-md)] p-4 space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <SkeletonLine width="32px" height="32px" className="rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonLine width="60%" height="14px" />
          <SkeletonLine width="40%" height="10px" />
        </div>
      </div>
      <SkeletonLine width="100%" height="12px" />
      <SkeletonLine width="80%" height="12px" />
    </div>
  )
}
