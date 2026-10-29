import { useState } from 'react'
import { useAppStore } from '../../store/store.ts'
import { applyConfig, resetEverything } from '../../store/actions.ts'
import { useToast } from '../../hooks/useToast.ts'
import { SettingsSectionLayout } from './SettingsSectionLayout.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Sheet } from '../../components/ui/Sheet.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { Icon } from '../../components/icons/Icons.tsx'
import {
  MAX_IMPORT_BYTES,
  ValidationError,
  buildConfigBundle,
  mergeConfig,
  parseConfigFile,
} from '../../lib/validate.ts'
import { downloadJson, pickJsonFile, readTextFile, todayStamp, FileTooLargeError } from '../../lib/files.ts'
import type { ConfigPayload } from '../../lib/types.ts'
import { copyText } from '../../lib/voucher.ts'

interface ImportPreview {
  payload: ConfigPayload
  fileName: string
}

export function DataSection() {
  const state = useAppStore((s) => s)
  const { show } = useToast()
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const exportConfig = () => {
    downloadJson(`polycrafy-settings-${todayStamp()}.json`, buildConfigBundle(state, state.preferences))
    show('Settings exported', 'success')
  }

  const copyConfig = async () => {
    const text = JSON.stringify(buildConfigBundle(state, state.preferences), null, 2)
    const ok = await copyText(text)
    show(ok ? 'Settings JSON copied' : 'Could not copy', ok ? 'success' : 'danger')
  }

  const startImport = async () => {
    try {
      const file = await pickJsonFile()
      if (!file) return
      const text = await readTextFile(file, MAX_IMPORT_BYTES)
      const payload = parseConfigFile(text)
      setPreview({ payload, fileName: file.name })
    } catch (error) {
      const message =
        error instanceof FileTooLargeError
          ? 'That file is larger than 1 MB.'
          : error instanceof ValidationError
            ? error.message
            : 'Could not read that file.'
      show(message, 'danger')
    }
  }

  const applyReplace = () => {
    if (!preview) return
    applyConfig(preview.payload)
    setPreview(null)
    show('Settings imported', 'success')
  }

  const applyMerge = () => {
    if (!preview) return
    const merged = mergeConfig(state, preview.payload)
    applyConfig(merged)
    setPreview(null)
    show('Settings merged', 'success')
  }

  return (
    <SettingsSectionLayout title="Export & import settings" subtitle="Back up your rates, spools, design fees and extras.">
      <div className="stat-row">
        <div className="stat">
          <div className="stat-value">{state.filaments.length}</div>
          <div className="stat-label">Filaments</div>
        </div>
        <div className="stat">
          <div className="stat-value">{state.cadTiers.length}</div>
          <div className="stat-label">Design tiers</div>
        </div>
        <div className="stat">
          <div className="stat-value">{state.addons.length}</div>
          <div className="stat-label">Extras</div>
        </div>
      </div>

      <div>
        <p className="section-label">Export & import JSON</p>
        <div className="group">
          <div className="list">
            <button type="button" className="nav-row" onClick={exportConfig}>
              <span className="nav-icon" aria-hidden="true">
                <Icon name="download" size={17} />
              </span>
              <span className="list-main">
                <span className="list-title">Export settings file (.json)</span>
                <span className="list-sub">Studio profile, rates, filaments, design tiers and extras</span>
              </span>
              <Icon name="chevronRight" size={15} className="nav-chev" />
            </button>
            <button type="button" className="nav-row" onClick={startImport}>
              <span className="nav-icon" aria-hidden="true">
                <Icon name="upload" size={17} />
              </span>
              <span className="list-main">
                <span className="list-title">Import settings file (.json)</span>
                <span className="list-sub">Restore or merge a settings file from another device</span>
              </span>
              <Icon name="chevronRight" size={15} className="nav-chev" />
            </button>
            <button type="button" className="nav-row" onClick={copyConfig}>
              <span className="nav-icon" aria-hidden="true">
                <Icon name="copy" size={17} />
              </span>
              <span className="list-main">
                <span className="list-title">Copy settings as JSON</span>
                <span className="list-sub">Copy to clipboard for quick backup</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <div>
        <p className="section-label">Reset</p>
        <div className="group">
          <div className="list">
            <button type="button" className="nav-row" onClick={() => setConfirmReset(true)}>
              <span className="nav-icon nav-icon-danger" aria-hidden="true">
                <Icon name="refresh" size={17} />
              </span>
              <span className="list-main">
                <span className="list-title">Reset to factory defaults</span>
                <span className="list-sub">Restores default Myanmar shop rates and catalog</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <p className="field-hint" style={{ textAlign: 'center' }}>
        All data is processed locally on your device.
      </p>

      <Sheet
        open={preview !== null}
        onClose={() => setPreview(null)}
        title="Import settings"
        footer={
          <>
            <Button variant="secondary" onClick={applyMerge}>
              Merge catalog
            </Button>
            <Button variant="accent" onClick={applyReplace}>
              Replace all
            </Button>
          </>
        }
      >
        {preview ? (
          <>
            <div className="notice">
              <Icon name="file" size={15} />
              <span>{preview.fileName}</span>
            </div>
            <div className="bd">
              <div className="bd-row">
                <span className="bd-label">Studio</span>
                <span className="bd-value">{preview.payload.profile.studioName}</span>
              </div>
              <div className="bd-row">
                <span className="bd-label">Operation hourly rate</span>
                <span className="bd-value">
                  {preview.payload.rates.electricityPerHour + preview.payload.rates.machinePerHour}{' '}
                  {preview.payload.profile.currencySymbol || preview.payload.profile.currencyCode || 'MMK'}/hr
                </span>
              </div>
              <div className="bd-row">
                <span className="bd-label">Filaments</span>
                <span className="bd-value">{preview.payload.filaments.length}</span>
              </div>
              <div className="bd-row">
                <span className="bd-label">Design fees</span>
                <span className="bd-value">{preview.payload.cadTiers.length}</span>
              </div>
              <div className="bd-row">
                <span className="bd-label">Extras</span>
                <span className="bd-value">{preview.payload.addons.length}</span>
              </div>
            </div>
            <div className="notice">
              <Icon name="alert" size={15} />
              <span>Replace overwrites your catalog. Merge keeps existing spools/extras and adds new ones.</span>
            </div>
          </>
        ) : null}
      </Sheet>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all settings?"
        message="Every filament, rate, design fee and extra returns to the factory defaults. Export your settings first if you want a backup."
        confirmLabel="Reset"
        destructive
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetEverything()
          setConfirmReset(false)
          show('Reset to defaults')
        }}
      />
    </SettingsSectionLayout>
  )
}
