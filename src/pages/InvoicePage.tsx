import { useMemo, useState } from 'react'
import { useAppStore } from '../store/store.ts'
import { patchDraft, resetDraft, updatePreferences } from '../store/actions.ts'
import { calculateQuote, validateQuoteInput } from '../lib/pricing.ts'
import { generateInvoiceNo } from '../lib/defaults.ts'
import { formatAmount, formatHours, formatMoney } from '../lib/money.ts'
import {
  buildVoucherText,
  canShareFiles,
  copyText,
  downloadVoucherImage,
  isIosDevice,
  renderVoucherDataUrl,
  shareText,
  shareVoucherImage,
} from '../lib/voucher.ts'
import {
  VOUCHER_KINDS,
  VOUCHER_THEMES,
  type InvoiceDocument,
  type VoucherKind,
  type VoucherTheme,
} from '../lib/types.ts'
import { useRouter } from '../router/useRouter.ts'
import { useToast } from '../hooks/useToast.ts'
import { VoucherPreview } from '../components/calc/VoucherPreview.tsx'
import { Button } from '../components/ui/Button.tsx'
import { TextField } from '../components/ui/TextField.tsx'
import { NumberField } from '../components/ui/NumberField.tsx'
import { TextArea } from '../components/ui/TextArea.tsx'
import { SegmentedControl } from '../components/ui/SegmentedControl.tsx'
import { Toggle } from '../components/ui/Toggle.tsx'
import { Sheet } from '../components/ui/Sheet.tsx'
import { Icon } from '../components/icons/Icons.tsx'
import { settingsPath } from '../router/routes.ts'

const KIND_SEGMENTS: { value: VoucherKind; label: string }[] = VOUCHER_KINDS.map((k) => ({
  value: k,
  label: k.charAt(0) + k.slice(1).toLowerCase(),
}))

const THEME_SEGMENTS: { value: VoucherTheme; label: string }[] = VOUCHER_THEMES.map((t) => ({
  value: t,
  label: t === 'paper' ? 'Paper Light' : 'Studio Dark',
}))

export function InvoicePage() {
  const { navigate } = useRouter()
  const { show } = useToast()

  const draft = useAppStore((s) => s.draft)
  const filaments = useAppStore((s) => s.filaments)
  const cadTiers = useAppStore((s) => s.cadTiers)
  const addons = useAppStore((s) => s.addons)
  const rates = useAppStore((s) => s.rates)
  const profile = useAppStore((s) => s.profile)
  const preferences = useAppStore((s) => s.preferences)

  const [exporting, setExporting] = useState(false)
  const [textOpen, setTextOpen] = useState(false)
  const [iosImageUrl, setIosImageUrl] = useState<string | null>(null)
  const isIos = useMemo(() => isIosDevice(), [])

  const voucherTheme = preferences.voucherTheme ?? 'paper'
  const voucherKind = preferences.voucherKind ?? 'VOUCHER'
  const showSpecs = preferences.showSpecsOnVoucher ?? true
  const symbol = profile.currencySymbol || profile.currencyCode || 'MMK'

  const breakdown = useMemo(
    () => calculateQuote(draft, { filaments, cadTiers, addons, rates }),
    [draft, filaments, cadTiers, addons, rates],
  )

  const selectedFilament = filaments.find((item) => item.id === draft.filamentId)
  const selectedCad = draft.cadTierId ? cadTiers.find((item) => item.id === draft.cadTierId) : undefined

  const doc: InvoiceDocument = useMemo(
    () => ({
      ...draft,
      id: draft.invoiceNo || 'voucher',
      createdAt: new Date().toISOString(),
      breakdown,
      snapshot: {
        filamentName: selectedFilament?.name ?? 'PLA',
        filamentBrand: selectedFilament?.brand ?? '',
        pricePerGram: selectedFilament?.pricePerGram ?? 0,
        cadTierName: selectedCad?.name ?? '',
        rates,
      },
    }),
    [draft, breakdown, selectedFilament, selectedCad, rates],
  )

  const voucherText = useMemo(
    () => buildVoucherText(doc, profile, { theme: voucherTheme, kind: voucherKind, showSpecs }),
    [doc, profile, voucherTheme, voucherKind, showSpecs],
  )

  const openIosHoldPreview = () => {
    const err = validateQuoteInput(draft, filaments)
    if (err) {
      show(err, 'danger')
      return
    }
    const url = renderVoucherDataUrl(doc, profile, {
      theme: voucherTheme,
      kind: voucherKind,
      showSpecs,
    })
    if (url) {
      setIosImageUrl(url)
    } else {
      show('Could not render image', 'danger')
    }
  }

  const handleDownloadImage = async () => {
    const err = validateQuoteInput(draft, filaments)
    if (err) {
      show(err, 'danger')
      return
    }
    setExporting(true)
    try {
      const res = await downloadVoucherImage(doc, profile, {
        theme: voucherTheme,
        kind: voucherKind,
        showSpecs,
      })
      if (res === 'saved') {
        show('Voucher PNG downloaded', 'success')
      } else if (res === 'shared') {
        show('Voucher ready to save', 'success')
      } else if (res === 'ios-preview') {
        openIosHoldPreview()
      } else if (res === 'error') {
        show('Could not export image', 'danger')
      }
    } finally {
      setExporting(false)
    }
  }

  const handleShareImage = async () => {
    const err = validateQuoteInput(draft, filaments)
    if (err) {
      show(err, 'danger')
      return
    }
    setExporting(true)
    try {
      const res = await shareVoucherImage(doc, profile, {
        theme: voucherTheme,
        kind: voucherKind,
        showSpecs,
      })
      if (res === 'shared' || res === 'cancelled') return
      const textShared = await shareText(voucherText, `${profile.studioName || 'PolyCrafy'} ${voucherKind}`)
      if (!textShared) {
        await handleDownloadImage()
      }
    } finally {
      setExporting(false)
    }
  }

  const handleCopyText = async () => {
    const ok = await copyText(voucherText)
    show(ok ? 'Voucher text copied' : 'Could not copy text', ok ? 'success' : 'danger')
  }

  return (
    <div className="studio-page">
      <header className="studio-header">
        <div>
          <span className="eyebrow">INVOICE & VOUCHER STUDIO</span>
          <h1 className="page-title">Export Voucher</h1>
        </div>
        <div className="page-head-actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => patchDraft({ invoiceNo: generateInvoiceNo() })}
            icon={<Icon name="refresh" size={14} />}
          >
            New #
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(settingsPath('studio'))}
            icon={<Icon name="sparkles" size={14} />}
          >
            Branding
          </Button>
        </div>
      </header>

      <div className="invoice-workspace">
        <div className="invoice-stage">
          <div className="voucher-frame">
            <VoucherPreview
              doc={doc}
              profile={profile}
              theme={voucherTheme}
              kind={voucherKind}
              showSpecs={showSpecs}
            />
          </div>

          <div className="export-dock">
            <Button
              variant="accent"
              block
              disabled={exporting}
              onClick={() => {
                void handleDownloadImage()
              }}
              icon={<Icon name="download" size={16} />}
            >
              {exporting
                ? 'Rendering PNG…'
                : isIos
                  ? 'Save to Photos (PNG)'
                  : 'Download Image (PNG)'}
            </Button>
            <div className="export-sub-row">
              {isIos ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={openIosHoldPreview}
                  icon={<Icon name="receipt" size={14} />}
                >
                  Hold Save
                </Button>
              ) : canShareFiles() ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={exporting}
                  onClick={() => {
                    void handleShareImage()
                  }}
                  icon={<Icon name="share" size={14} />}
                >
                  Share PNG
                </Button>
              ) : null}
              <Button variant="secondary" size="sm" onClick={handleCopyText} icon={<Icon name="copy" size={14} />}>
                Copy Text
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setTextOpen(true)} icon={<Icon name="file" size={14} />}>
                View Text
              </Button>
            </div>
          </div>
        </div>

        <div className="invoice-controls">
          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Voucher style</h2>
            </div>
            <div className="panel-body stack-sm">
              <div className="field">
                <span className="field-label">Document type</span>
                <SegmentedControl
                  value={voucherKind}
                  segments={KIND_SEGMENTS}
                  onChange={(value) => updatePreferences({ voucherKind: value })}
                  label="Document type"
                />
              </div>
              <div className="field">
                <span className="field-label">Card theme</span>
                <SegmentedControl
                  value={voucherTheme}
                  segments={THEME_SEGMENTS}
                  onChange={(value) => updatePreferences({ voucherTheme: value })}
                  label="Voucher theme"
                />
              </div>
              <Toggle
                label="Show weight & print time"
                description="Include grams and printing hours on the customer voucher."
                checked={showSpecs}
                onChange={(checked) => updatePreferences({ showSpecsOnVoucher: checked })}
              />
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Customer & invoice details</h2>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  resetDraft()
                  show('Cleared current invoice')
                }}
              >
                Clear all
              </button>
            </div>
            <div className="panel-body stack-sm">
              <div className="grid-2">
                <TextField
                  label="Customer name"
                  value={draft.customerName}
                  onChange={(value) => patchDraft({ customerName: value })}
                  placeholder="Walk-in customer"
                  autoComplete="off"
                />
                <TextField
                  label="Customer phone"
                  value={draft.customerPhone}
                  onChange={(value) => patchDraft({ customerPhone: value })}
                  placeholder="09…"
                  inputMode="tel"
                  autoComplete="off"
                />
              </div>
              <div className="grid-2">
                <TextField
                  label="Part / project name"
                  value={draft.productName}
                  onChange={(value) => patchDraft({ productName: value })}
                  placeholder="3D Printed Part"
                />
                <TextField
                  label="Invoice / voucher #"
                  value={draft.invoiceNo ?? ''}
                  onChange={(value) => patchDraft({ invoiceNo: value })}
                  placeholder="INV-261030-101"
                />
              </div>
              <NumberField
                label="Discount"
                value={draft.discount ?? 0}
                onChange={(value) => patchDraft({ discount: value })}
                suffix={symbol}
                placeholder="0"
                min={0}
                max={100_000_000}
                step={500}
                integer
              />
              <TextArea
                label="Order / payment notes"
                value={draft.notes}
                onChange={(value) => patchDraft({ notes: value })}
                placeholder="KBZPay / WavePay details, colour, pickup date…"
                rows={2}
              />
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Cost breakdown summary</h2>
              <button
                type="button"
                className="text-link"
                onClick={() => navigate('#/calculate')}
              >
                Edit calculation →
              </button>
            </div>
            <div className="panel-body">
              <div className="bd">
                <div className="bd-row">
                  <span className="bd-label">
                    Filament Cost ({selectedFilament?.name ?? 'PLA'} · {formatAmount(breakdown.totalGrams)} g)
                  </span>
                  <span className="bd-value tabular">{formatMoney(breakdown.materialCost, symbol)}</span>
                </div>
                <div className="bd-row">
                  <span className="bd-label">
                    Operation Cost ({formatHours(breakdown.machineHours)} print + waste/setup)
                  </span>
                  <span className="bd-value tabular">{formatMoney(breakdown.operationCost, symbol)}</span>
                </div>
                {breakdown.cadCost + breakdown.addonsCost > 0 ? (
                  <div className="bd-row">
                    <span className="bd-label">CAD Design & Extras</span>
                    <span className="bd-value tabular">
                      {formatMoney(breakdown.cadCost + breakdown.addonsCost, symbol)}
                    </span>
                  </div>
                ) : null}
                {(breakdown.discountAmount ?? 0) > 0 ? (
                  <div className="bd-row">
                    <span className="bd-label">Discount</span>
                    <span className="bd-value tabular">-{formatMoney(breakdown.discountAmount ?? 0, symbol)}</span>
                  </div>
                ) : null}
                <div className="bd-divider" />
                <div className="bd-row bd-total">
                  <span className="bd-label">Total Due</span>
                  <span className="bd-value tabular">{formatMoney(breakdown.total, symbol)}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Sheet
        open={iosImageUrl !== null}
        onClose={() => setIosImageUrl(null)}
        title="Save to iPhone / iPad Photos"
      >
        <div className="notice">
          <Icon name="info" size={15} />
          <span>
            Touch and hold the voucher image below, then tap <strong>“Save to Photos”</strong> to save directly to your gallery.
          </span>
        </div>
        {iosImageUrl ? (
          <img
            src={iosImageUrl}
            alt="Voucher PNG — Touch and hold to Save to Photos"
            className="ios-save-img"
          />
        ) : null}
      </Sheet>

      <Sheet
        open={textOpen}
        onClose={() => setTextOpen(false)}
        title="Plain-text voucher"
        footer={
          <Button
            variant="accent"
            onClick={() => {
              void handleCopyText()
              setTextOpen(false)
            }}
            icon={<Icon name="copy" size={16} />}
          >
            Copy to clipboard
          </Button>
        }
      >
        <pre className="voucher">{voucherText}</pre>
      </Sheet>
    </div>
  )
}
