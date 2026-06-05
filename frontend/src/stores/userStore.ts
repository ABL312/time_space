import { create } from 'zustand'
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

export const useUserStore = create<UserState>((set, _get) => ({
  user: null,
  isLoading: false,
  error: null,

  setUser: (user) => {
    localStorage.setItem(STORAGE_KEY, user.id)
    set({ user, error: null })
  },

  clearUser: () => {
    localStorage.removeItem(STORAGE_KEY)
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
      const res = await fetch(`/api/users/${userId}`)
      if (res.ok) {
        const user = await res.json()
        set({ user, isLoading: false })
      } else {
        localStorage.removeItem(STORAGE_KEY)
        set({ user: null, isLoading: false })
      }
    } catch {
      set({ isLoading: false, error: 'Failed to load user' })
    }
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))
