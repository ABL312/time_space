import { type ReactNode } from 'react'

export type BadgeVariant = 'default' | 'signal' | 'capsule' | 'success' | 'warning' | 'error' | 'info'

interface BadgeProps {
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
  children?: ReactNode
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'border-border text-text-secondary',
  signal: 'border-signal/20 text-signal bg-signal/5',
  capsule: 'border-capsule/20 text-capsule bg-capsule/5',
  success: 'border-data-good/20 text-data-good bg-data-good/5',
  warning: 'border-data-warn/20 text-data-warn bg-data-warn/5',
  error: 'border-data-bad/20 text-data-bad bg-data-bad/5',
  info: 'border-data-info/20 text-data-info bg-data-info/5',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-text-tertiary',
  signal: 'bg-signal',
  capsule: 'bg-capsule',
  success: 'bg-data-good',
  warning: 'bg-data-warn',
  error: 'bg-data-bad',
  info: 'bg-data-info',
}

export default function Badge({
  variant = 'default',
  size = 'sm',
  dot = false,
  className = '',
  children,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border font-mono rounded-[var(--radius-xs)] ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
      } ${variantClasses[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  )
}
