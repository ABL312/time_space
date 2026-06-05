import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { useNavigate } from 'react-router-dom'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

class ErrorBoundaryClass extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      
      return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-bg p-4">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">AR 视图暂时不可用</h2>
            <p className="text-slate-400 mb-6">
              遇到了一些技术问题，我们的工程师正在紧急修复中。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-light text-white mr-3 transition-colors"
            >
              重新加载
            </button>
            <BackButton />
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function BackButton() {
  const navigate = useNavigate()
  
  return (
    <button
      onClick={() => navigate('/')}
      className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-light text-white transition-colors"
    >
      返回地图
    </button>
  )
}

export default function ErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundaryClass>{children}</ErrorBoundaryClass>
}