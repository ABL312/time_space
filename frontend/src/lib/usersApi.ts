import { request } from './client'
import type { User, Capsule } from '../types'

export interface UserStats {
  created_count: number
  opened_count: number
  favorited_count: number
  total_capsules: number
  recent_opened: Capsule[]
  recent_created: Capsule[]
}

/** Users API - registration, profile, stats */
export const usersApi = {
  create(data: { name: string; interest_tags: string[] }): Promise<User> {
    return request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getById(id: string): Promise<User> {
    return request(`/users/${id}`)
  },

  update(id: string, data: Partial<User>): Promise<User> {
    return request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  getStats(userId: string): Promise<UserStats> {
    return request(`/users/${userId}/stats`)
  },
}
