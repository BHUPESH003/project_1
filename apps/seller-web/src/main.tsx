import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme, useThemeStore } from '@/stores/themeStore'

// Apply persisted theme before first paint to avoid a flash.
applyTheme(useThemeStore.getState().pref)

// Register service worker for PWA caching + Web Push background notifications.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
