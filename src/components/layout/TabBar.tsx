import { Icon, type IconName } from '../icons/Icons.tsx'
import { useRouter } from '../../router/useRouter.ts'
import type { RouteName } from '../../router/routes.ts'

const TABS: { name: RouteName; path: string; label: string; icon: IconName }[] = [
  { name: 'calculate', path: '#/calculate', label: 'Calculator', icon: 'calculator' },
  { name: 'invoice', path: '#/invoice', label: 'Voucher', icon: 'receipt' },
  { name: 'settings', path: '#/settings', label: 'Settings', icon: 'settings' },
]

export function TabBar() {
  const { route, navigate } = useRouter()
  const active: RouteName = route.name

  return (
    <nav className="tabbar" aria-label="Primary">
      <div className="rail-brand">
        <span className="rail-logo" aria-hidden="true">
          <Icon name="cube" size={18} />
        </span>
        <div>
          <span className="rail-name">PolyCrafy</span>
          <span className="rail-tag">Calculator & Voucher</span>
        </div>
      </div>
      <div className="tabbar-inner">
        {TABS.map((tab) => (
          <button
            key={tab.name}
            type="button"
            className="tab"
            data-active={active === tab.name}
            aria-current={active === tab.name ? 'page' : undefined}
            onClick={() => navigate(tab.path)}
          >
            <span className="tab-icon">
              <Icon name={tab.icon} size={19} />
            </span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
