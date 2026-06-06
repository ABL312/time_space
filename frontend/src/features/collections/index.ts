/**
 * Collections feature module
 * Re-exports collection pages and related API
 */

// Pages
export { default as CollectionsPage } from '../../pages/CollectionsPage'
export { default as CollectionDetailPage } from '../../pages/CollectionDetailPage'
export { default as FavoritesPage } from '../../pages/FavoritesPage'

// API
export { collectionsApi, favoritesApi } from '../../lib/api'
