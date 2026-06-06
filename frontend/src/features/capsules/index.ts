/**
 * Capsules feature module
 * Re-exports capsule-related pages, components, stores, and API
 */

// Pages
export { default as CapsuleDetailPage } from '../../pages/CapsuleDetailPage'
export { default as CreatePage } from '../../pages/CreatePage'
export { default as MyCapsulesPage } from '../../pages/MyCapsulesPage'
export { default as SharedCapsulePage } from '../../pages/SharedCapsulePage'

// Store
export { useCapsuleStore } from '../../stores/capsuleStore'

// API
export { capsulesApi, responsesApi } from '../../lib/api'
