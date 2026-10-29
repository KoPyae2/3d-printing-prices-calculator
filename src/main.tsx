import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { persistNow } from './store/store.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Make sure a queued local write lands even if the tab is closed straight away.
window.addEventListener('pagehide', persistNow)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') persistNow()
})
