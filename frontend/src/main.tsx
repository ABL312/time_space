import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import L from 'leaflet'
import './index.css'
import App from './App'

// Attach Leaflet to window for plugins like leaflet.heat
// @ts-ignore
window.L = L

// Global error handler for debugging
window.addEventListener('error', (e) => {
  console.error('Global error:', e.message, e.filename, e.lineno, e.colno, e.error)
})

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason)
})

try {
  const root = document.getElementById('root')
  if (!root) {
    console.error('Root element not found!')
  } else {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>
    )
    console.log('React app rendered successfully')
  }
} catch (error) {
  console.error('Failed to render React app:', error)
}
