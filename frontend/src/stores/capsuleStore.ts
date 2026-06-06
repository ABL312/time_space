import { create } from 'zustand'
import { capsulesApi } from '../lib/capsulesApi'
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
      const data = await capsulesApi.getNearby(params)
      set({ nearby: data, isLoadingNearby: false })
    } catch (err) {
      console.error('Failed to fetch nearby capsules:', err)
      set({ isLoadingNearby: false })
    }
  },

  fetchCapsule: async (id) => {
    set({ isLoadingDetail: true })
    try {
      const capsule = await capsulesApi.getById(id)
      set({ selectedCapsule: capsule, isLoadingDetail: false })
    } catch (err) {
      console.error('Failed to fetch capsule:', err)
      set({ isLoadingDetail: false })
      throw err
    }
  },

  setLocationContext: (ctx) => set({ locationContext: ctx }),
  clearSelected: () => set({ selectedCapsule: null }),
}))
