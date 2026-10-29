import { useAppStore } from '../../store/store.ts'
import { updatePreferences } from '../../store/actions.ts'
import { SettingsSectionLayout } from './SettingsSectionLayout.tsx'
import { SegmentedControl } from '../../components/ui/SegmentedControl.tsx'
import type { ThemePreference } from '../../lib/types.ts'

const SEGMENTS: { value: ThemePreference; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
]

export function AppearanceSection() {
  const theme = useAppStore((s) => s.preferences.theme)

  return (
    <SettingsSectionLayout title="Appearance" subtitle="Saved on this device.">
      <div className="group">
        <div className="group-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
          <span className="field-label">Theme</span>
          <SegmentedControl
            value={theme}
            segments={SEGMENTS}
            onChange={(value) => updatePreferences({ theme: value })}
            label="Theme"
          />
          <p className="field-hint">
            {theme === 'system'
              ? 'Follows your phone’s light or dark setting.'
              : `Always ${theme}. You can switch any time.`}
          </p>
        </div>
      </div>
    </SettingsSectionLayout>
  )
}
