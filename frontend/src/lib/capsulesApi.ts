import { request, upload, buildQuery } from './client'
import type { Capsule, NearbyResponse, CapsuleResponse, FavoriteCapsule } from '../types'

/** Capsules API - CRUD, nearby, search */
export const capsulesApi = {
  /** Create a new capsule (multipart form) */
  create(formData: FormData): Promise<Capsule> {
    return upload('/capsules', formData)
  },

  /** Get nearby capsules based on GPS coordinates */
  getNearby(params: {
    lat: number
    lng: number
    radius?: number
    user_id?: string
  }): Promise<NearbyResponse> {
    return request(`/capsules/nearby${buildQuery(params)}`)
  },

  /** Get my capsules (created by current user) */
  getMine(userId: string): Promise<{ capsules: Capsule[]; total: number }> {
    return request(`/capsules/mine${buildQuery({ user_id: userId })}`)
  },

  /** Get capsule detail by ID */
  getById(id: string): Promise<Capsule> {
    return request(`/capsules/${id}`)
  },

  /** Reply to a capsule (multipart form) */
  reply(id: string, formData: FormData): Promise<Capsule> {
    return upload(`/capsules/${id}/reply`, formData)
  },

  /** Search capsules by text, tag, location */
  search(params: { q?: string; tag?: string; lat?: number; lng?: number; radius?: number }): Promise<{ capsules: Capsule[]; total: number }> {
    return request(`/capsules/search${buildQuery(params)}`)
  },

  /** Get daily recommendation */
  getDailyRecommend(): Promise<{ capsule: Capsule; reason: string; expires_at: string }> {
    return request('/capsules/daily-recommend')
  },

  /** Get shared capsule by token */
  getShared(token: string): Promise<Capsule> {
    return request(`/capsules/shared/${token}`)
  },

  /** Regenerate share token */
  regenerateShare(capsuleId: string): Promise<{ share_token: string }> {
    return request(`/capsules/${capsuleId}/regenerate-share`, { method: 'POST' })
  },
}

/** Responses API - capsule replies */
export const responsesApi = {
  list(capsuleId: string): Promise<CapsuleResponse[]> {
    return request(`/capsules/${capsuleId}/responses`)
  },

  create(
    capsuleId: string,
    content: string,
    userId?: string,
    nickname?: string
  ): Promise<CapsuleResponse> {
    return request(`/capsules/${capsuleId}/responses`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        user_id: userId,
        nickname: nickname || '匿名',
      }),
    })
  },
}

/** Favorites API - save/unsave capsules */
export const favoritesApi = {
  add(capsuleId: string, userId: string): Promise<void> {
    return request(`/favorites/${capsuleId}${buildQuery({ user_id: userId })}`, { method: 'POST' })
  },

  remove(capsuleId: string, userId: string): Promise<void> {
    return request(`/favorites/${capsuleId}${buildQuery({ user_id: userId })}`, { method: 'DELETE' })
  },

  async list(userId: string): Promise<FavoriteCapsule[]> {
    const capsules = await request<Capsule[]>(`/favorites${buildQuery({ user_id: userId })}`)
    return capsules.map(c => ({
      id: c.id,
      user_id: userId,
      capsule_id: c.id,
      created_at: c.created_at,
      capsule: c,
    }))
  },

  status(capsuleId: string, userId: string): Promise<{ is_favorite: boolean }> {
    return request(`/favorites/capsules/${capsuleId}/favorite-status${buildQuery({ user_id: userId })}`)
  },
}
