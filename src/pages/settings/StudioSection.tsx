import { useAppStore } from '../../store/store.ts'
import { updateProfile } from '../../store/actions.ts'
import { SettingsSectionLayout } from './SettingsSectionLayout.tsx'
import { TextField } from '../../components/ui/TextField.tsx'
import { TextArea } from '../../components/ui/TextArea.tsx'
import { Icon } from '../../components/icons/Icons.tsx'

export function StudioSection() {
  const profile = useAppStore((s) => s.profile)

  return (
    <SettingsSectionLayout title="Studio & voucher branding" subtitle="Shown on every invoice and voucher you export.">
      <div className="group">
        <div className="group-body">
          <div className="stack" style={{ gap: 'var(--s-3)' }}>
            <TextField
              label="Studio name"
              value={profile.studioName}
              onChange={(value) => updateProfile({ studioName: value })}
              placeholder="PolyCrafy"
              autoComplete="organization"
              maxLength={80}
            />
            <div className="grid-2">
              <TextField
                label="Phone"
                value={profile.phone}
                onChange={(value) => updateProfile({ phone: value })}
                placeholder="09 123 456 789"
                inputMode="tel"
                autoComplete="tel"
                maxLength={40}
              />
              <TextField
                label="City / address"
                value={profile.address ?? ''}
                onChange={(value) => updateProfile({ address: value })}
                placeholder="Yangon, Myanmar"
                maxLength={120}
              />
            </div>
            <div className="grid-2">
              <TextField
                label="Currency code"
                value={profile.currencyCode}
                onChange={(value) => updateProfile({ currencyCode: value.toUpperCase() })}
                placeholder="MMK"
                maxLength={8}
              />
              <TextField
                label="Symbol"
                value={profile.currencySymbol}
                onChange={(value) => updateProfile({ currencySymbol: value })}
                placeholder="MMK"
                maxLength={8}
              />
            </div>
            <TextArea
              label="Voucher footer message"
              value={profile.footerNote ?? ''}
              onChange={(value) => updateProfile({ footerNote: value })}
              placeholder="Thank you for printing with us!"
              rows={2}
            />
          </div>
        </div>
      </div>

      <div className="notice">
        <Icon name="check" size={15} />
        <span>Changes are saved automatically and applied immediately to your voucher preview.</span>
      </div>
    </SettingsSectionLayout>
  )
}
