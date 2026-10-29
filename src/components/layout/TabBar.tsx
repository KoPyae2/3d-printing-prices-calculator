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
  const activeIndex = Math.max(
    0,
    TABS.findIndex((t) => t.name === active),
  )

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
      <div className="tabbar-inner" style={{ '--active-idx': activeIndex } as React.CSSProperties}>
        <span className="tabbar-glider" aria-hidden="true" />
        {TABS.map((tab) => {
          const isActive = active === tab.name
          return (
            <button
              key={tab.name}
              type="button"
              className="tab"
              data-active={isActive}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => navigate(tab.path)}
            >
              <span className="tab-icon">
                <Icon name={tab.icon} size={19} />
              </span>
              <span className="tab-label">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
