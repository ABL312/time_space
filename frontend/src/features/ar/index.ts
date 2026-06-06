/**
 * AR (Augmented Reality) feature module
 * Re-exports AR scene, page, and orientation hooks
 */

// Pages
export { default as ARPage } from '../../pages/ARPage'

// Components
export { default as ARScene } from '../../components/ARScene'
export { default as VoiceClone } from '../../components/VoiceClone'

// Hooks
export { useOrientation } from '../../hooks/useOrientation'
export { useCapabilityCheck } from '../../hooks/useCapabilityCheck'
export type { DeviceCapabilities } from '../../hooks/useCapabilityCheck'
