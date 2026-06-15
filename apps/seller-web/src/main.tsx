import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme, useThemeStore } from '@/stores/themeStore'

// Apply persisted theme before first paint to avoid a flash.
applyTheme(useThemeStore.getState().pref)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
