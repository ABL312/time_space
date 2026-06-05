import { create } from 'zustand'
import type { Capsule, NearbyResponse, LocationContext } from '../types'

interface CapsuleState {
  /** Nearby capsules from last query */
  nearby: NearbyResponse | null

  /** Currently selected/viewed capsule */
  selectedCapsule: Capsule | null

  /** Location context from AI */
  locationContext: LocationContext | null

  /** Loading states */
  isLoadingNearby: boolean
  isLoadingDetail: boolean

  /** Fetch nearby capsules */
  fetchNearby: (params: {
    lat: number
    lng: number
    radius?: number
    user_id?: string
  }) => Promise<void>

  /** Fetch capsule detail */
  fetchCapsule: (id: string) => Promise<void>

  /** Set location context */
  setLocationContext: (ctx: LocationContext | null) => void

  /** Clear selected capsule */
  clearSelected: () => void
}

export const useCapsuleStore = create<CapsuleState>((set) => ({
  nearby: null,
  selectedCapsule: null,
  locationContext: null,
  isLoadingNearby: false,
  isLoadingDetail: false,

  fetchNearby: async (params) => {
    set({ isLoadingNearby: true })
    try {
      const searchParams = new URLSearchParams()
      searchParams.set('lat', String(params.lat))
      searchParams.set('lng', String(params.lng))
      if (params.radius) searchParams.set('radius', String(params.radius))
      if (params.user_id) searchParams.set('user_id', params.user_id)

      const res = await fetch(`/api/capsules/nearby?${searchParams.toString()}`)
      if (res.ok) {
        const data = await res.json()
        set({ nearby: data, isLoadingNearby: false })
      } else {
        set({ isLoadingNearby: false })
      }
    } catch (err) {
      console.error('Failed to fetch nearby capsules:', err)
      set({ isLoadingNearby: false })
    }
  },

  fetchCapsule: async (id) => {
    set({ isLoadingDetail: true })
    try {
      const res = await fetch(`/api/capsules/${id}`)
      if (res.ok) {
        const capsule = await res.json()
        set({ selectedCapsule: capsule, isLoadingDetail: false })
      } else {
        const error = await res.json().catch(() => ({ detail: res.statusText }))
        set({ isLoadingDetail: false })
        throw new Error(error.detail || `HTTP ${res.status}`)
      }
    } catch (err) {
      console.error('Failed to fetch capsule:', err)
      set({ isLoadingDetail: false })
      throw err
    }
  },

  setLocationContext: (ctx) => set({ locationContext: ctx }),
  clearSelected: () => set({ selectedCapsule: null }),
}))
