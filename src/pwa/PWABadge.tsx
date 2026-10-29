import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Icon } from '../components/icons/Icons.tsx'
import './PWABadge.css'

/**
 * Offers a reload when a new build has been precached. Kept deliberately
 * quiet: a toast, not a modal, so it never interrupts a half-entered quote.
 */
export function PWABadge() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
  })

  const [dismissed, setDismissed] = useState(false)

  if (!needRefresh || dismissed) return null

  return (
    <div className="update-toast" role="status" aria-live="polite">
      <Icon name="refresh" size={15} />
      <span className="update-text">New version ready</span>
      <button type="button" className="update-action" onClick={() => void updateServiceWorker(true)}>
        Reload
      </button>
      <button
        type="button"
        className="update-close"
        aria-label="Dismiss update"
        onClick={() => {
          setDismissed(true)
          setNeedRefresh(false)
        }}
      >
        <Icon name="close" size={13} />
      </button>
    </div>
  )
}
