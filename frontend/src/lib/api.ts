/**
 * API Layer - Backward-compatible re-exports
 * 
 * New code should import directly from feature files:
 *   import { capsulesApi } from '../lib/capsulesApi'
 *   import { usersApi } from '../lib/usersApi'
 * 
 * This file exists for backward compatibility with existing pages.
 */

export { request, upload, buildQuery, ApiError } from './client'

// Re-export all feature APIs
export { usersApi } from './usersApi'
export { capsulesApi, responsesApi, favoritesApi } from './capsulesApi'
export { aiApi } from './aiApi'
export { collectionsApi } from './collectionsApi'

// Legacy aliases for pages that haven't been migrated yet
import { usersApi as _usersApi } from './usersApi'
import { capsulesApi as _capsulesApi } from './capsulesApi'

/** @deprecated Use usersApi.getStats directly */
export const profileApi = {
  getStats: _usersApi.getStats,
}

/** @deprecated Use capsulesApi.search directly */
export const searchApi = {
  search: _capsulesApi.search,
}

/** @deprecated Use capsulesApi directly */
export const shareApi = {
  getByToken: _capsulesApi.getShared,
  regenerate: _capsulesApi.regenerateShare,
}

/** @deprecated Use capsulesApi.getDailyRecommend directly */
export const dailyApi = {
  getRecommend: _capsulesApi.getDailyRecommend,
}

/** Health check */
export { healthCheck } from './client'
