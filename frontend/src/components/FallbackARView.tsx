import { useNavigate } from 'react-router-dom'
import type { Capsule } from '../types'

interface FallbackARViewProps {
  capsules: Capsule[]
  onReturnToMap: () => void
}

export default function FallbackARView({ capsules, onReturnToMap }: FallbackARViewProps) {
  const navigate = useNavigate()
  
  if (capsules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-bg p-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">📭</div>
          <h2 className="text-xl font-bold text-white mb-2">附近暂无时空胶囊</h2>
          <p className="text-slate-400 mb-6">
            在这个位置还没有人留下过时空胶囊，你可以成为第一个留下记忆的人。
          </p>
          <button
            onClick={onReturnToMap}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-light text-white mr-3 transition-colors"
          >
            返回地图
          </button>
          <button
            onClick={() => navigate('/create')}
            className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-light text-white transition-colors"
          >
            创建胶囊
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-bg p-4 pt-16">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-white">附近胶囊</h1>
        <button
          onClick={onReturnToMap}
          className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-light text-white text-sm transition-colors"
        >
          返回地图
        </button>
      </div>
      
      <div className="space-y-4 overflow-y-auto flex-1 pb-16">
        {capsules.map((capsule) => (
          <div 
            key={capsule.id} 
            className="glass rounded-xl p-4 hover:border-accent transition-all duration-200"
          >
            <div className="flex flex-wrap gap-1 mb-2">
              {capsule.emotion_tags?.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent"
                >
                  {tag}
                </span>
              ))}
            </div>
            
            <p className="text-white mb-3 line-clamp-3">
              {capsule.message}
            </p>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">
                {capsule.author?.name || '匿名用户'}
              </span>
              <button
                onClick={() => navigate(`/capsule/${capsule.id}`)}
                className="text-sm text-primary hover:text-primary-light transition-colors"
              >
                查看详情 →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}