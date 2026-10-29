import { useMemo, useState } from 'react'
import { useAppStore } from '../store/store.ts'
import { patchDraft, resetDraft, setDraftAddonQty, toggleDraftAddon } from '../store/actions.ts'
import { calculateQuote, validateQuoteInput } from '../lib/pricing.ts'
import { formatAmount, formatHours, formatMoney, hoursFromParts, splitHours } from '../lib/money.ts'
import {
  buildVoucherText,
  copyText,
  downloadVoucherImage,
  shareVoucherImage,
} from '../lib/voucher.ts'
import type { InvoiceDocument } from '../lib/types.ts'
import { useRouter } from '../router/useRouter.ts'
import { useToast } from '../hooks/useToast.ts'
import { IconButton } from '../components/ui/IconButton.tsx'
import { Button } from '../components/ui/Button.tsx'
import { NumberField } from '../components/ui/NumberField.tsx'
import { TextField } from '../components/ui/TextField.tsx'
import { TextArea } from '../components/ui/TextArea.tsx'
import { Icon } from '../components/icons/Icons.tsx'
import { FilamentPicker } from '../components/calc/FilamentPicker.tsx'
import { AddonPicker } from '../components/calc/AddonPicker.tsx'
import { BreakdownCard } from '../components/calc/BreakdownCard.tsx'
import { VoucherPreview } from '../components/calc/VoucherPreview.tsx'
import { settingsPath } from '../router/routes.ts'

const WEIGHT_PRESETS = [10, 25, 50, 100]
const TIME_PRESETS = [
  { label: '+15m', hours: 0.25 },
  { label: '+30m', hours: 0.5 },
  { label: '+1h', hours: 1 },
  { label: '+2h', hours: 2 },
]

export function CalculatePage() {
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
  const [showBreakdown, setShowBreakdown] = useState(false)

  const timeParts = useMemo(() => splitHours(draft.printHoursPerUnit), [draft.printHoursPerUnit])
  const setHoursPart = (h: number) => {
    const next = hoursFromParts(String(Math.max(0, Math.round(h))), timeParts.m)
    patchDraft({ printHoursPerUnit: next })
  }
  const setMinutesPart = (m: number) => {
    const next = hoursFromParts(timeParts.h, String(Math.min(59, Math.max(0, Math.round(m)))))
    patchDraft({ printHoursPerUnit: next })
  }
  const addTimeHours = (delta: number) => {
    const next = Math.max(0, Math.round((draft.printHoursPerUnit + delta) * 60) / 60)
    patchDraft({ printHoursPerUnit: next })
  }

  const breakdown = useMemo(
    () => calculateQuote(draft, { filaments, cadTiers, addons, rates }),
    [draft, filaments, cadTiers, addons, rates],
  )

  const symbol = profile.currencySymbol || profile.currencyCode || 'MMK'
  const selectedFilament = filaments.find((item) => item.id === draft.filamentId)
  const selectedCad = draft.cadTierId ? cadTiers.find((item) => item.id === draft.cadTierId) : undefined
  const ready = Boolean(draft.filamentId) && draft.weightG > 0

  const hasAnyInput =
    draft.weightG > 0 ||
    draft.printHoursPerUnit > 0 ||
    draft.quantity > 1 ||
    Boolean(draft.cadTierId) ||
    draft.addons.length > 0 ||
    (draft.discount ?? 0) > 0 ||
    Boolean(draft.customerName.trim() || draft.customerPhone.trim() || draft.productName.trim() || draft.notes.trim())

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

  const voucherTheme = preferences.voucherTheme ?? 'paper'
  const voucherKind = preferences.voucherKind ?? 'VOUCHER'
  const showSpecs = preferences.showSpecsOnVoucher ?? true

  const handleDownloadPng = async () => {
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
      if (res === 'saved' || res === 'shared') {
        show('Voucher image ready', 'success')
      } else if (res === 'ios-preview') {
        navigate('#/invoice')
      } else if (res === 'error') {
        show('Could not export image', 'danger')
      }
    } finally {
      setExporting(false)
    }
  }

  const handleSharePng = async () => {
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
      if (res === 'error') {
        await handleDownloadPng()
      }
    } finally {
      setExporting(false)
    }
  }

  const handleCopyText = async () => {
    const text = buildVoucherText(doc, profile, {
      theme: voucherTheme,
      kind: voucherKind,
      showSpecs,
    })
    const ok = await copyText(text)
    show(ok ? 'Voucher copied to clipboard' : 'Could not copy', ok ? 'success' : 'danger')
  }

  const costSum = Math.max(1, breakdown.subtotal)
  const matPct = Math.round((breakdown.materialCost / costSum) * 100)
  const opPct = Math.round((breakdown.operationCost / costSum) * 100)
  const extPct = Math.max(0, 100 - matPct - opPct)

  return (
    <div className="studio-page calc-page">
      <header className="studio-header">
        <div>
          <span className="eyebrow">{profile.studioName || 'PolyCrafy'} · 3D PRINT STUDIO</span>
          <h1 className="page-title">Price & Invoice Calculator</h1>
        </div>
        <div className="page-head-actions">
          {hasAnyInput ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetDraft()
                show('Calculator reset')
              }}
              icon={<Icon name="refresh" size={14} />}
            >
              Reset
            </Button>
          ) : null}
          <IconButton name="settings" label="Rates & settings" onClick={() => navigate(settingsPath('rates'))} />
        </div>
      </header>

      {/* Live Instrument Readout */}
      <section className="readout-card" data-ready={ready} aria-label="Live quote readout">
        <div className="readout-top">
          <div className="readout-primary">
            <span className="readout-label">
              {ready ? 'ESTIMATED TOTAL' : 'ENTER WEIGHT TO CALCULATE'}
              {breakdown.minimumApplied ? <span className="badge-pill">MIN CHARGE</span> : null}
            </span>
            <div className="readout-figure-wrap" aria-live="polite" aria-atomic="true">
              <span className="readout-figure">{formatAmount(breakdown.total)}</span>
              <span className="readout-currency">{symbol}</span>
              {draft.quantity > 1 && ready ? (
                <span className="readout-each">· {formatAmount(breakdown.perUnit)}/pc</span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            className="readout-voucher-btn"
            onClick={() => navigate('#/invoice')}
          >
            <Icon name="receipt" size={14} />
            <span>Voucher</span>
          </button>
        </div>

        <div className="readout-metrics">
          <div className="metric-box">
            <span className="metric-label">FILAMENT</span>
            <span className="metric-val">
              {formatAmount(breakdown.materialCost)} <small>{symbol}</small>
            </span>
          </div>
          <div className="metric-box">
            <span className="metric-label">OPERATION</span>
            <span className="metric-val">
              {formatAmount(breakdown.operationCost)} <small>{symbol}</small>
            </span>
          </div>
          <div className="metric-box">
            <span className="metric-label">PRINT TIME</span>
            <span className="metric-val">{formatHours(breakdown.machineHours)}</span>
          </div>
        </div>

        {breakdown.subtotal > 0 ? (
          <div className="readout-bar-area">
            <div className="cost-meter" aria-hidden="true">
              {matPct > 0 ? <span className="cm-seg cm-mat" style={{ width: `${matPct}%` }} /> : null}
              {opPct > 0 ? <span className="cm-seg cm-mac" style={{ width: `${opPct}%` }} /> : null}
              {extPct > 0 && breakdown.addonsCost + breakdown.cadCost > 0 ? (
                <span className="cm-seg cm-ext" style={{ width: `${extPct}%` }} />
              ) : null}
            </div>
            <div className="cost-legend">
              <span className="cl-item">
                <i className="cl-dot cm-mat" /> Filament {formatAmount(breakdown.materialCost)}
              </span>
              <span className="cl-item">
                <i className="cl-dot cm-mac" /> Operation {formatAmount(breakdown.operationCost)}
              </span>
              {breakdown.addonsCost + breakdown.cadCost > 0 ? (
                <span className="cl-item">
                  <i className="cl-dot cm-ext" /> Design & Extras {formatAmount(breakdown.addonsCost + breakdown.cadCost)}
                </span>
              ) : null}
              <button
                type="button"
                className="cl-toggle"
                onClick={() => setShowBreakdown((v) => !v)}
              >
                {showBreakdown ? 'Hide details' : 'Full breakdown'}
              </button>
            </div>
          </div>
        ) : null}

        {showBreakdown ? (
          <div className="readout-Register">
            <BreakdownCard breakdown={breakdown} symbol={symbol} />
          </div>
        ) : null}
      </section>

      <div className="calc-grid">
        <div className="calc-form-col">
          {/* 1. Material */}
          <section className="panel">
            <header className="panel-head">
              <div>
                <span className="step-num">01</span>
                <h2 className="panel-title">Filament material</h2>
              </div>
              <div className="panel-head-right">
                {selectedFilament ? (
                  <span className="panel-meta">
                    {formatMoney(selectedFilament.pricePerGram, symbol)} / g
                  </span>
                ) : null}
                <IconButton
                  name="edit"
                  label="Edit filaments"
                  small
                  onClick={() => navigate(settingsPath('filaments'))}
                />
              </div>
            </header>
            <div className="panel-body">
              {filaments.length === 0 ? (
                <p className="field-hint">No filaments configured. Add one in Settings.</p>
              ) : (
                <FilamentPicker
                  filaments={filaments}
                  value={draft.filamentId}
                  symbol={symbol}
                  onChange={(id) => patchDraft({ filamentId: id })}
                />
              )}
            </div>
          </section>

          {/* 2. Part & Print Time */}
          <section className="panel">
            <header className="panel-head">
              <div>
                <span className="step-num">02</span>
                <h2 className="panel-title">Part weight & print time</h2>
              </div>
              {draft.weightG > 0 || draft.printHoursPerUnit > 0 ? (
                <span className="panel-meta">
                  {formatAmount(breakdown.totalGrams)}g total · {formatHours(breakdown.machineHours)}
                </span>
              ) : null}
            </header>
            <div className="panel-body stack-sm">
              <div className="grid-2">
                <div>
                  <NumberField
                    label="Weight per piece"
                    value={draft.weightG}
                    onChange={(value) => patchDraft({ weightG: value })}
                    suffix="g"
                    placeholder="0"
                    min={0}
                    max={1_000_000}
                    step={5}
                  />
                  <div className="quick-chips">
                    {WEIGHT_PRESETS.map((w) => (
                      <button
                        key={w}
                        type="button"
                        className="q-chip"
                        onClick={() => patchDraft({ weightG: draft.weightG + w })}
                      >
                        +{w}g
                      </button>
                    ))}
                    {draft.weightG > 0 ? (
                      <button
                        type="button"
                        className="q-chip q-chip-clear"
                        onClick={() => patchDraft({ weightG: 0 })}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>

                <div>
                  <NumberField
                    label="Quantity"
                    value={draft.quantity}
                    onChange={(value) => patchDraft({ quantity: Math.max(1, Math.round(value)) })}
                    suffix="pcs"
                    min={1}
                    max={10_000}
                    integer
                    inputMode="numeric"
                  />
                  <div className="quick-chips">
                    {[1, 2, 5, 10].map((q) => (
                      <button
                        key={q}
                        type="button"
                        className="q-chip"
                        data-active={draft.quantity === q}
                        onClick={() => patchDraft({ quantity: q })}
                      >
                        {q}×
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="field">
                <span className="field-label">Print time per piece</span>
                <div className="grid-2">
                  <NumberField
                    value={Number(timeParts.h || 0)}
                    onChange={setHoursPart}
                    placeholder="0"
                    min={0}
                    max={1000}
                    integer
                    suffix="hr"
                    inputMode="numeric"
                  />
                  <NumberField
                    value={Number(timeParts.m || 0)}
                    onChange={setMinutesPart}
                    placeholder="0"
                    min={0}
                    max={59}
                    integer
                    suffix="min"
                    inputMode="numeric"
                  />
                </div>
                <div className="quick-chips">
                  {TIME_PRESETS.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      className="q-chip"
                      onClick={() => addTimeHours(t.hours)}
                    >
                      {t.label}
                    </button>
                  ))}
                  {draft.printHoursPerUnit > 0 ? (
                    <button
                      type="button"
                      className="q-chip q-chip-clear"
                      onClick={() => patchDraft({ printHoursPerUnit: 0 })}
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {/* 3. Design & Extras */}
          <section className="panel">
            <header className="panel-head">
              <div>
                <span className="step-num">03</span>
                <h2 className="panel-title">CAD design & extras</h2>
              </div>
              <div className="panel-head-right">
                <IconButton
                  name="edit"
                  label="Manage extras & design"
                  small
                  onClick={() => navigate(settingsPath('addons'))}
                />
              </div>
            </header>
            <div className="panel-body stack-sm">
              <div className="field">
                <span className="field-label">Design / CAD tier</span>
                <div className="tier-pills" role="radiogroup" aria-label="Design fee">
                  <button
                    type="button"
                    className="tier-pill"
                    data-on={draft.cadTierId === null}
                    onClick={() => patchDraft({ cadTierId: null })}
                  >
                    <span className="tier-pill-name">No CAD fee</span>
                    <span className="tier-pill-price">0 {symbol}</span>
                  </button>
                  {cadTiers.map((tier) => {
                    const active = draft.cadTierId === tier.id
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        className="tier-pill"
                        data-on={active}
                        onClick={() => patchDraft({ cadTierId: active ? null : tier.id })}
                      >
                        <span className="tier-pill-name">{tier.name}</span>
                        <span className="tier-pill-price">
                          {tier.price > 0 ? `+${formatAmount(tier.price)}` : 'Free'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="field">
                <span className="field-label">Packaging, finishing & hardware</span>
                <AddonPicker
                  addons={addons}
                  selection={draft.addons}
                  symbol={symbol}
                  onToggle={toggleDraftAddon}
                  onQty={setDraftAddonQty}
                />
              </div>
            </div>
          </section>

          {/* 4. Customer & Voucher Info */}
          <section className="panel">
            <header className="panel-head">
              <div>
                <span className="step-num">04</span>
                <h2 className="panel-title">Customer & voucher info</h2>
              </div>
              <span className="panel-meta">Appears on exported voucher</span>
            </header>
            <div className="panel-body stack-sm">
              <div className="grid-2">
                <TextField
                  label="Customer name"
                  value={draft.customerName}
                  onChange={(value) => patchDraft({ customerName: value })}
                  placeholder="Walk-in"
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
                  label="Part / item title"
                  value={draft.productName}
                  onChange={(value) => patchDraft({ productName: value })}
                  placeholder="3D Printed Part"
                />
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
              </div>
              <TextArea
                label="Notes / payment instructions"
                value={draft.notes}
                onChange={(value) => patchDraft({ notes: value })}
                placeholder="Colour, infill, deadline, or KBZPay / WavePay details…"
                rows={2}
              />
            </div>
          </section>

          <div className="calc-mobile-cta">
            <Button
              variant="accent"
              block
              onClick={() => navigate('#/invoice')}
              icon={<Icon name="receipt" size={17} />}
            >
              View & Save Voucher
            </Button>
            <Button
              variant="secondary"
              disabled={exporting}
              onClick={() => {
                void handleDownloadPng()
              }}
              icon={<Icon name="download" size={17} />}
              aria-label="Save voucher PNG"
            >
              PNG
            </Button>
          </div>
        </div>

        {/* Desktop live voucher preview column */}
        <aside className="calc-preview-col" aria-label="Live voucher preview">
          <div className="sticky-preview">
            <div className="preview-bar-head">
              <span className="preview-bar-title">LIVE VOUCHER PREVIEW</span>
              <button type="button" className="text-link" onClick={() => navigate('#/invoice')}>
                Customize →
              </button>
            </div>

            <VoucherPreview
              doc={doc}
              profile={profile}
              theme={voucherTheme}
              kind={voucherKind}
              showSpecs={showSpecs}
            />

            <div className="preview-actions">
              <Button
                variant="accent"
                block
                disabled={exporting}
                onClick={() => {
                  void handleDownloadPng()
                }}
                icon={<Icon name="download" size={16} />}
              >
                {exporting ? 'Exporting PNG…' : 'Export Voucher Image (PNG)'}
              </Button>
              <div className="btn-row">
                <Button
                  variant="secondary"
                  onClick={() => {
                    void handleSharePng()
                  }}
                  icon={<Icon name="share" size={15} />}
                >
                  Share PNG
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    void handleCopyText()
                  }}
                  icon={<Icon name="copy" size={15} />}
                >
                  Copy Text
                </Button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
