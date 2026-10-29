import { useAppStore } from '../store/store.ts'
import { updatePreferences } from '../store/actions.ts'
import { useRouter } from '../router/useRouter.ts'
import { settingsPath, type SettingsSection } from '../router/routes.ts'
import { Icon, type IconName } from '../components/icons/Icons.tsx'
import { Button } from '../components/ui/Button.tsx'
import { SegmentedControl } from '../components/ui/SegmentedControl.tsx'
import { formatAmount } from '../lib/money.ts'
import { buildConfigBundle } from '../lib/validate.ts'
import { downloadJson, todayStamp } from '../lib/files.ts'
import { useToast } from '../hooks/useToast.ts'
import type { ThemePreference } from '../lib/types.ts'

interface HubRow {
  section: SettingsSection
  icon: IconName
  title: string
  subtitle: string
  badge?: string
}

const THEME_SEGMENTS: { value: ThemePreference; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
]

export function SettingsPage() {
  const { navigate } = useRouter()
  const { show } = useToast()
  const state = useAppStore((s) => s)
  const { filaments, cadTiers, addons, rates, profile, preferences } = state
  const symbol = profile.currencySymbol || profile.currencyCode || 'MMK'

  const quickExport = () => {
    downloadJson(`polycrafy-settings-${todayStamp()}.json`, buildConfigBundle(state, state.preferences))
    show('Settings exported (.json)', 'success')
  }

  const groups: { label: string; rows: HubRow[] }[] = [
    {
      label: 'Shop & Pricing',
      rows: [
        {
          section: 'rates',
          icon: 'settings',
          title: 'Operation costs & rounding',
          subtitle: `Electricity, machine wear, waste % & setup fee`,
          badge: `${formatAmount(rates.electricityPerHour + rates.machinePerHour)} ${symbol}/hr`,
        },
        {
          section: 'studio',
          icon: 'sparkles',
          title: 'Studio & voucher branding',
          subtitle: 'Shop name, phone, address, currency & voucher footer',
          badge: profile.studioName || 'PolyCrafy',
        },
      ],
    },
    {
      label: 'Catalog',
      rows: [
        {
          section: 'filaments',
          icon: 'layers',
          title: 'Filaments',
          subtitle: 'Direct 1g selling price (with filament profit included)',
          badge: `${filaments.length} types`,
        },
        {
          section: 'design',
          icon: 'cube',
          title: 'CAD & design fees',
          subtitle: 'Flat service tiers for 3D modelling and STL repair',
          badge: `${cadTiers.length} tiers`,
        },
        {
          section: 'addons',
          icon: 'box',
          title: 'Extras & packaging',
          subtitle: 'Packaging, post-processing and hardware add-ons',
          badge: `${addons.length} items`,
        },
      ],
    },
    {
      label: 'Data & App',
      rows: [
        {
          section: 'data',
          icon: 'download',
          title: 'Backup, export & import',
          subtitle: 'Save or restore all settings via JSON file',
          badge: 'JSON',
        },
        {
          section: 'about',
          icon: 'info',
          title: 'About & offline app',
          subtitle: `Min charge ${formatAmount(rates.minimumCharge)} ${symbol} · PWA status`,
        },
      ],
    },
  ]

  return (
    <div className="studio-page settings-hub">
      <header className="studio-header">
        <div>
          <span className="eyebrow">STUDIO CONFIGURATION</span>
          <h1 className="page-title">Settings</h1>
        </div>
        <div className="page-head-actions">
          <Button variant="secondary" size="sm" onClick={quickExport} icon={<Icon name="download" size={14} />}>
            Export JSON
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={() => navigate(settingsPath('data'))}
            icon={<Icon name="upload" size={14} />}
          >
            Import
          </Button>
        </div>
      </header>

      <div className="stack">
        {groups.map((group) => (
          <section key={group.label} className="panel">
            <header className="panel-head">
              <h2 className="panel-title">{group.label}</h2>
            </header>
            <div className="list">
              {group.rows.map((row) => (
                <button
                  key={row.section}
                  type="button"
                  className="nav-row"
                  onClick={() => navigate(settingsPath(row.section))}
                >
                  <span className="nav-icon" aria-hidden="true">
                    <Icon name={row.icon} size={17} />
                  </span>
                  <span className="list-main">
                    <span className="list-title">{row.title}</span>
                    <span className="list-sub">{row.subtitle}</span>
                  </span>
                  {row.badge ? <span className="nav-badge">{row.badge}</span> : null}
                  <Icon name="chevronRight" size={15} className="nav-chev" />
                </button>
              ))}
            </div>
          </section>
        ))}

        <section className="panel">
          <header className="panel-head">
            <h2 className="panel-title">Appearance</h2>
            <span className="panel-meta">Theme</span>
          </header>
          <div className="panel-body">
            <SegmentedControl
              value={preferences.theme}
              segments={THEME_SEGMENTS}
              onChange={(value) => updatePreferences({ theme: value })}
              label="Appearance theme"
            />
          </div>
        </section>
      </div>
    </div>
  )
}
