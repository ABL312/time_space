/**
 * API Client - Unified fetch wrapper with error handling
 * 
 * All API calls go through `request()` which handles:
 * - Timeout via AbortController
 * - JSON parsing
 * - Error extraction from FastAPI detail field
 * - Type-safe response
 */

const BASE_URL = '/api'

export class ApiError extends Error {
  status?: number
  isTimeout?: boolean

  constructor(message: string, status?: number, isTimeout?: boolean) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.isTimeout = isTimeout
  }
}

/**
 * Generic fetch wrapper with timeout and error handling.
 * For FormData uploads, use `upload()` instead.
 */
export async function request<T>(
  url: string,
  options?: RequestInit,
  timeoutMs: number = 8000
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  const token = localStorage.getItem('timespace_user_token')

  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options?.headers,
      },
      ...options,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }))
      throw new ApiError(body.detail || `HTTP ${res.status}`, res.status)
    }

    return res.json()
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof ApiError) throw error

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('请求超时，请检查网络连接后重试', undefined, true)
    }

    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new ApiError('网络连接失败，请检查网络设置')
    }

    throw error
  }
}

/**
 * Upload FormData (no Content-Type header, browser sets multipart boundary)
 */
export async function upload<T>(
  url: string,
  formData: FormData,
  timeoutMs: number = 30000
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  const token = localStorage.getItem('timespace_user_token')

  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      body: formData,
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }))
      throw new ApiError(body.detail || `HTTP ${res.status}`, res.status)
    }

    return res.json()
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('上传超时，文件过大或网络不稳定')
    }
    throw error
  }
}

/** Extract a human-readable message from an unknown error */
export function getErrorMessage(err: unknown, fallback = '操作失败'): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return fallback
}

/** Build query string from params, omitting undefined/null values */
export function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') {
      searchParams.set(key, String(value))
    }
  }
  const str = searchParams.toString()
  return str ? `?${str}` : ''
}

/** Health check */
export function healthCheck(): Promise<{ status: string }> {
  return request('/health', undefined, 5000)
}
