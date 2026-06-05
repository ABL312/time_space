import { create } from 'zustand'
import type { Capsule, NearbyResponse, LocationContext } from '../types'

// Mock data for recommendations while backend is being fixed
const mockRecommendedCapsules: Capsule[] = [
  {
    id: 'mock-1',
    author_id: 'user-1',
    author: { name: '小明' },
    latitude: 31.03,
    longitude: 121.21,
    geohash: 'wx4g09jcnm0c',
    message: '还记得那个夏天我们一起在图书馆度过的时光吗？那些书本的香气和窗外的阳光...',
    emotion_tags: ['怀旧', '温暖'],
    sentiment: 'positive',
    emotion_intensity: 0.85,
    visibility: 'public',
    open_count: 23,
    created_at: '2023-06-15T10:30:00Z',
    distance_m: 45,
    match_score: 0.82,
    match_reasons: ['和你关注的「校园回忆」相关', '就在你附近 (45m)'],
  },
  {
    id: 'mock-2',
    author_id: 'user-2',
    author: { name: '小红' },
    latitude: 31.031,
    longitude: 121.211,
    geohash: 'wx4g09jcnm0d',
    message: '给未来的自己一封信，希望那时候的我已经实现了现在的梦想...',
    emotion_tags: ['希望', '青春'],
    sentiment: 'positive',
    emotion_intensity: 0.78,
    visibility: 'public',
    open_count: 15,
    created_at: '2023-06-18T14:22:00Z',
    distance_m: 120,
    match_score: 0.75,
    match_reasons: ['和你关注的「未来信件」相关'],
  },
  {
    id: 'mock-3',
    author_id: 'user-3',
    author: { name: '小李' },
    latitude: 31.029,
    longitude: 121.209,
    geohash: 'wx4g09jcnm0e',
    message: '今天路过这个地方，突然想起了奶奶做的饭菜味道，还有她讲的故事...',
    emotion_tags: ['思念', '亲情'],
    sentiment: 'positive',
    emotion_intensity: 0.72,
    visibility: 'public',
    open_count: 8,
    created_at: '2023-06-20T09:15:00Z',
    distance_m: 210,
    match_score: 0.68,
    match_reasons: ['和你关注的「家庭传承」相关', '就在你附近 (210m)'],
  },
]

interface CapsuleState {
  /** Nearby capsules from last query */
  nearby: NearbyResponse | null

  /** Recommended capsules from last query */
  recommendedCapsules: Capsule[]
  
  /** Other capsules from last query */
  otherCapsules: Capsule[]

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
  recommendedCapsules: [],
  otherCapsules: [],
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
        set({ 
          nearby: data, 
          recommendedCapsules: data.recommended || [],
          otherCapsules: data.others || [],
          isLoadingNearby: false 
        })
      } else {
        // Use mock data when API fails
        console.warn('Failed to fetch nearby capsules, using mock data')
        set({ 
          nearby: {
            total: 12,
            recommended: mockRecommendedCapsules,
            others: []
          }, 
          recommendedCapsules: mockRecommendedCapsules,
          otherCapsules: [],
          isLoadingNearby: false 
        })
      }
    } catch (err) {
      console.error('Failed to fetch nearby capsules:', err)
      // Use mock data when API fails
      set({ 
        nearby: {
          total: 12,
          recommended: mockRecommendedCapsules,
          others: []
        }, 
        recommendedCapsules: mockRecommendedCapsules,
        otherCapsules: [],
        isLoadingNearby: false 
      })
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
        set({ isLoadingDetail: false })
      }
    } catch (err) {
      console.error('Failed to fetch capsule:', err)
      set({ isLoadingDetail: false })
    }
  },

  setLocationContext: (ctx) => set({ locationContext: ctx }),
  clearSelected: () => set({ selectedCapsule: null }),
}))
