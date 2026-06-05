import { useState, useEffect } from 'react'
import { capsulesApi } from '../lib/api'
import type { Capsule, NearbyResponse } from '../types'

interface UseApiWithTimeoutOptions {
  timeout?: number
}

export function useApiWithTimeout<T>(
  apiCall: () => Promise<T>,
  options: UseApiWithTimeoutOptions = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState<number>(0)

  const { timeout = 5000 } = options

  const execute = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Execute API call with timeout
      const result = await Promise.race([
        apiCall(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), timeout)
        )
      ])
      
      setData(result)
    } catch (err) {
      if (err instanceof Error && err.message === 'REQUEST_TIMEOUT') {
        setError('请求超时，请检查网络连接后重试')
      } else {
        setError(err instanceof Error ? err.message : '未知错误')
      }
    } finally {
      setLoading(false)
    }
  }

  const retry = () => {
    setRetryCount(prev => prev + 1)
  }

  useEffect(() => {
    if (retryCount > 0) {
      execute()
    }
  }, [retryCount])

  return { data, loading, error, retry, execute }
}

// Specific hooks for common API calls
export function useNearbyCapsules() {
  const [params, setParams] = useState<{ lat: number; lng: number; radius?: number; user_id?: string } | null>(null)
  
  const { data, loading, error, retry, execute } = useApiWithTimeout<NearbyResponse>(
    () => {
      if (!params) throw new Error('Parameters not set')
      return capsulesApi.getNearby(params)
    }
  )

  const fetchNearby = (newParams: { lat: number; lng: number; radius?: number; user_id?: string }) => {
    setParams(newParams)
  }

  useEffect(() => {
    if (params) {
      execute()
    }
  }, [params])

  return { nearby: data, isLoading: loading, error, retry, fetchNearby }
}