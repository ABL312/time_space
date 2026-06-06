import { type ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export default function SectionHeader({
  title,
  subtitle,
  action,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-baseline gap-3">
        <h2 className="text-sm font-semibold text-text-primary tracking-tight">{title}</h2>
        {subtitle && (
          <span className="text-xs text-text-muted">{subtitle}</span>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

/** Mono-styled label for data sections */
export function SectionLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`label ${className}`}>{children}</span>
  )
}
