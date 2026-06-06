/**
 * Profile feature module
 * Re-exports profile page and user-related components
 */

// Pages
export { default as ProfilePage } from '../../pages/ProfilePage'

// Store
export { useUserStore } from '../../stores/userStore'

// API
export { usersApi } from '../../lib/api'
