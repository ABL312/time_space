import { type ReactNode } from 'react'
import Button from './Button'

interface ErrorStateProps {
  icon?: ReactNode
  title?: string
  message: string
  retry?: () => void
  className?: string
}

export default function ErrorState({
  icon,
  title = '出错了',
  message,
  retry,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-12 h-12 mb-4 flex items-center justify-center rounded-[var(--radius-md)] bg-data-bad/10 border border-data-bad/20 text-data-bad">
        {icon || (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        )}
      </div>
      <h3 className="text-sm font-medium text-text-primary mb-1">{title}</h3>
      <p className="text-xs text-text-tertiary max-w-[280px] mb-4">{message}</p>
      {retry && (
        <Button variant="secondary" size="sm" onClick={retry}>
          重试
        </Button>
      )}
    </div>
  )
}
