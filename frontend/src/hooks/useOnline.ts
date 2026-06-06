import { useEffect, useState } from 'react'

interface UseOnlineReturn {
  isOnline: boolean
  wasOffline: boolean
}

/**
 * useOnline — 检测网络连接状态
 * wasOffline 标记会话中是否曾经断网（用于显示 "cached data" 提示）
 */
export function useOnline(): UseOnlineReturn {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, wasOffline }
}
