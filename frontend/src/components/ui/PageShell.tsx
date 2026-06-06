import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from './Button'

interface PageShellProps {
  title?: string
  backTo?: string | number
  backLabel?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  padded?: boolean
}

export default function PageShell({
  title,
  backTo,
  backLabel = '返回',
  actions,
  children,
  className = '',
  padded = true,
}: PageShellProps) {
  const navigate = useNavigate()

  return (
    <div className={`min-h-screen bg-bg ${className}`}>
      {/* Header bar */}
      {(title || backTo || actions) && (
        <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              {backTo && (
                <Button
                  variant="icon"
                  size="icon-sm"
                  onClick={() => {
                    if (typeof backTo === 'number') {
                      navigate(backTo)
                    } else {
                      navigate(backTo)
                    }
                  }}
                  aria-label={backLabel}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                </Button>
              )}
              {title && (
                <h1 className="text-sm font-semibold text-text-primary tracking-tight">{title}</h1>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </header>
      )}

      {/* Content */}
      <main className={padded ? 'p-4' : ''}>
        {children}
      </main>
    </div>
  )
}
