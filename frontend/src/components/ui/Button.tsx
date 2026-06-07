import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'capsule' | 'icon'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon-md' | 'icon-lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children?: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-signal text-void hover:bg-signal/90 active:bg-signal/80 font-medium shadow-signal/20 shadow-sm',
  secondary:
    'bg-surface border border-border text-text-primary hover:bg-surface-light hover:border-border-active',
  ghost:
    'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface/50',
  danger:
    'bg-data-bad/10 border border-data-bad/20 text-data-bad hover:bg-data-bad/20',
  capsule:
    'bg-capsule/10 border border-capsule/20 text-capsule hover:bg-capsule/20',
  icon:
    'bg-transparent text-text-tertiary hover:text-text-primary hover:bg-surface/50',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
  'icon-sm': 'w-7 h-7',
  'icon-md': 'w-9 h-9',
  'icon-lg': 'w-12 h-12',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isIcon = variant === 'icon' || size.startsWith('icon')
    const baseClass =
      'inline-flex items-center justify-center gap-2 font-medium transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal/50 rounded-[var(--radius-sm)]'

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseClass} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            {leftIcon}
            {!isIcon && children}
            {isIcon && children}
            {rightIcon}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
