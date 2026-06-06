import { request } from './client'
import type { CapsuleCollection, Capsule } from '../types'

export interface CollectionWithCapsules extends CapsuleCollection {
  capsules: Capsule[]
}

/** Collections API - capsule groups */
export const collectionsApi = {
  /** List all collections */
  list(): Promise<CapsuleCollection[]> {
    return request('/collections')
  },

  /** Get collection detail with capsules */
  get(id: string): Promise<CollectionWithCapsules> {
    return request(`/collections/${id}`)
  },
}
