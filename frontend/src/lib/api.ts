import type {
  User,
  Capsule,
  NearbyResponse,
  SceneResult,
  LocationContext,
  VoiceCloneResult,
} from '../types'

const BASE_URL = '/api'

// ==========================================
// Generic fetch wrapper with timeout
// ==========================================
async function request<T>(
  url: string,
  options?: RequestInit,
  timeoutMs: number = 5000
): Promise<T> {
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || `HTTP ${res.status}`);
    }
    
    return res.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接后重试');
    }
    
    throw error;
  }
}

// ==========================================
// Users API
// ==========================================
export const usersApi = {
  /** Create a new user */
  create(data: { name: string; interest_tags: string[] }): Promise<User> {
    return request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /** Get user by ID */
  getById(id: string): Promise<User> {
    return request(`/users/${id}`)
  },

  /** Update user profile */
  update(id: string, data: Partial<User>): Promise<User> {
    return request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
}

// ==========================================
// Capsules API
// ==========================================
export const capsulesApi = {
  /** Create a new capsule (multipart form) */
  async create(formData: FormData): Promise<Capsule> {
    const res = await fetch(`${BASE_URL}/capsules`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(error.detail || `HTTP ${res.status}`)
    }
    return res.json()
  },

  /** Get nearby capsules */
  getNearby(params: {
    lat: number
    lng: number
    radius?: number
    user_id?: string
  }): Promise<NearbyResponse> {
    const searchParams = new URLSearchParams()
    searchParams.set('lat', String(params.lat))
    searchParams.set('lng', String(params.lng))
    if (params.radius) searchParams.set('radius', String(params.radius))
    if (params.user_id) searchParams.set('user_id', params.user_id)
    return request(`/capsules/nearby?${searchParams.toString()}`, undefined, 5000)
  },

  /** Get my capsules (created by current user) */
  getMine(userId: string): Promise<{ capsules: Capsule[]; total: number }> {
    return request(`/capsules/mine?user_id=${userId}`)
  },

  /** Get capsule detail */
  getById(id: string): Promise<Capsule> {
    return request(`/capsules/${id}`, undefined, 5000)
  },

  /** Reply to a capsule */
  reply(id: string, formData: FormData): Promise<Capsule> {
    return fetch(`${BASE_URL}/capsules/${id}/reply`, {
      method: 'POST',
      body: formData,
    }).then((r) => r.json())
  },
}

// ==========================================
// AI API
// ==========================================
export const aiApi = {
  /** Analyze emotion in a message */
  analyzeEmotion(message: string): Promise<{
    emotions: string[]
    sentiment: string
    intensity: number
    summary: string
  }> {
    return request('/ai/analyze-emotion', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }, 5000)
  },

  /** Get location context from GPS */
  getLocationContext(lat: number, lng: number): Promise<LocationContext> {
    return request(`/ai/location-context?lat=${lat}&lng=${lng}`, undefined, 5000)
  },

  /** Recognize scene from camera frame */
  async recognizeScene(
    image: Blob,
    lat: number,
    lng: number
  ): Promise<SceneResult> {
    const formData = new FormData()
    formData.append('image', image)
    formData.append('latitude', String(lat))
    formData.append('longitude', String(lng))
    const res = await fetch(`${BASE_URL}/ai/scene`, {
      method: 'POST',
      body: formData,
    })
    return res.json()
  },

  /** Clone voice from sample */
  async cloneVoice(
    sample: Blob,
    text: string
  ): Promise<VoiceCloneResult> {
    const formData = new FormData()
    formData.append('sample', sample)
    formData.append('text', text)
    const res = await fetch(`${BASE_URL}/ai/voice-clone`, {
      method: 'POST',
      body: formData,
    })
    return res.json()
  },
}

// ==========================================
// Responses API
// ==========================================
export const responsesApi = {
  list: (capsuleId: string) => fetch(`/api/capsules/${capsuleId}/responses`).then(r => r.json()),
  create: (capsuleId: string, content: string, userId?: string, nickname?: string) =>
    fetch(`/api/capsules/${capsuleId}/responses`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ content, user_id: userId, nickname: nickname || '匿名' })
    }).then(r => r.json())
}

// ==========================================
// Favorites API
// ==========================================
export const favoritesApi = {
  add: (capsuleId: string, userId: string) =>
    fetch(`/api/favorites/${capsuleId}?user_id=${userId}`, { method: 'POST' }),
  remove: (capsuleId: string, userId: string) =>
    fetch(`/api/favorites/${capsuleId}?user_id=${userId}`, { method: 'DELETE' }),
  list: (userId: string) => fetch(`/api/favorites?user_id=${userId}`).then(r => r.json()),
  status: (capsuleId: string, userId: string) =>
    fetch(`/api/capsules/${capsuleId}/favorite-status?user_id=${userId}`).then(r => r.json())
}

// ==========================================
// Search API
// ==========================================
export const searchApi = {
  search: (params: { q?: string; tag?: string; lat?: number; lng?: number; radius?: number }) => {
    const query = new URLSearchParams()
    if (params.q) query.set('q', params.q)
    if (params.tag) query.set('tag', params.tag)
    if (params.lat) query.set('lat', String(params.lat))
    if (params.lng) query.set('lng', String(params.lng))
    if (params.radius) query.set('radius', String(params.radius))
    return fetch(`/api/capsules/search?${query}`).then(r => r.json())
  }
}

// ==========================================
// Health check
// ==========================================
export function healthCheck(): Promise<{ status: string }> {
  return request('/health', undefined, 5000)
}
