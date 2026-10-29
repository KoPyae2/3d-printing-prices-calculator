import { useEffect, useState } from 'react'
import { SettingsSectionLayout } from './SettingsSectionLayout.tsx'
import { Icon } from '../../components/icons/Icons.tsx'
import { useAppStore } from '../../store/store.ts'
import { formatAmount } from '../../lib/money.ts'

const APP_VERSION = '2.1.0'

function isStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function AboutSection() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [standalone, setStandalone] = useState(isStandalone)
  const filaments = useAppStore((s) => s.filaments.length)
  const rates = useAppStore((s) => s.rates)
  const symbol = useAppStore((s) => s.profile.currencySymbol || s.profile.currencyCode)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    const media = window.matchMedia('(display-mode: standalone)')
    const onChange = () => setStandalone(isStandalone())
    media.addEventListener('change', onChange)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
      media.removeEventListener('change', onChange)
    }
  }, [])

  return (
    <SettingsSectionLayout title="About" subtitle={`PolyCrafy Studio · Version ${APP_VERSION}`}>
      <div className="group">
        <div className="list">
          <div className="list-row">
            <span className="nav-icon" aria-hidden="true">
              <Icon name={online ? 'check' : 'alert'} size={17} />
            </span>
            <span className="list-main">
              <span className="list-title">Offline-ready PWA</span>
              <span className="list-sub">{online ? 'Online · works 100% offline' : 'Offline · calculator & PNG export ready'}</span>
            </span>
          </div>
          <div className="list-row">
            <span className="nav-icon" aria-hidden="true">
              <Icon name="lock" size={17} />
            </span>
            <span className="list-main">
              <span className="list-title">Local studio storage</span>
              <span className="list-sub">{filaments} spools configured on this device</span>
            </span>
          </div>
          <div className="list-row">
            <span className="nav-icon" aria-hidden="true">
              <Icon name="calculator" size={17} />
            </span>
            <span className="list-main">
              <span className="list-title">Active pricing rule</span>
              <span className="list-sub">
                {formatAmount(rates.electricityPerHour + rates.machinePerHour)} {symbol}/hr operation · min {formatAmount(rates.minimumCharge)} {symbol}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="notice">
        <Icon name="info" size={15} />
        <span>
          {standalone
            ? 'Running as an installed studio app. Launches full screen and works without internet.'
            : isIos()
              ? 'To install on iPhone/iPad: tap Share in Safari, then choose “Add to Home Screen”.'
              : 'To install as an app: open your browser menu and choose “Install app”.'}
        </span>
      </div>
    </SettingsSectionLayout>
  )
}
