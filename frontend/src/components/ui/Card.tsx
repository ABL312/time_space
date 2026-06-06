import { type ReactNode, type HTMLAttributes, type KeyboardEvent, useCallback } from 'react'

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'hud'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: 'none' | 'sm' | 'md' | 'lg'
  interactive?: boolean
  children?: ReactNode
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-surface border border-border',
  elevated: 'bg-surface border border-border shadow-md',
  outlined: 'bg-transparent border border-border-subtle',
  hud: 'bg-bg/85 backdrop-blur-xl border border-border',
}

const paddingClasses: Record<string, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export default function Card({
  variant = 'default',
  padding = 'md',
  interactive = false,
  className = '',
  children,
  onClick,
  onKeyDown,
  ...props
}: CardProps) {
  const interactiveClasses = interactive
    ? 'cursor-pointer transition-all duration-150 hover:border-border-active hover:shadow-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal/50 active:scale-[0.98]'
    : ''

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e)
      if (interactive && !e.defaultPrevented && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>)
      }
    },
    [interactive, onClick, onKeyDown]
  )

  return (
    <div
      className={`rounded-[var(--radius-md)] ${variantClasses[variant]} ${paddingClasses[padding]} ${interactiveClasses} ${className}`}
      {...(interactive && !props.role && { role: 'button', tabIndex: 0 })}
      {...props}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  )
}
