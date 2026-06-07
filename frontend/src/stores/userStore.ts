import { create } from 'zustand'
import { usersApi } from '../lib/usersApi'
import type { User } from '../types'

interface UserState {
  user: User | null
  isLoading: boolean
  error: string | null

  /** Set user after login/create */
  setUser: (user: User) => void

  /** Clear user (logout) */
  clearUser: () => void

  /** Load user from localStorage */
  loadUser: () => Promise<void>

  /** Set loading state */
  setLoading: (loading: boolean) => void

  /** Set error */
  setError: (error: string | null) => void
}

const STORAGE_KEY = 'timespace_user_id'

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  setUser: (user) => {
    localStorage.setItem(STORAGE_KEY, user.id)
    if (user.token) {
      localStorage.setItem('timespace_user_token', user.token)
    }
    set({ user, error: null })
  },

  clearUser: () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('timespace_user_token')
    set({ user: null })
  },

  loadUser: async () => {
    const userId = localStorage.getItem(STORAGE_KEY)
    if (!userId) {
      set({ isLoading: false })
      return
    }

    set({ isLoading: true })
    try {
      const user = await usersApi.getById(userId)
      set({ user, isLoading: false })
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem('timespace_user_token')
      set({ user: null, isLoading: false })
    }
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))
