import { formatAmount, formatHours } from '../../lib/money.ts'
import type { InvoiceDocument, Profile, VoucherKind, VoucherTheme } from '../../lib/types.ts'

interface VoucherPreviewProps {
  doc: InvoiceDocument
  profile: Profile
  theme?: VoucherTheme
  kind?: VoucherKind
  showSpecs?: boolean
}

export function VoucherPreview({
  doc,
  profile,
  theme = 'paper',
  kind = 'VOUCHER',
  showSpecs = true,
}: VoucherPreviewProps) {
  const currency = profile.currencySymbol || profile.currencyCode || 'MMK'
  const partTitle = doc.productName.trim() || '3D Printed Part'
  const hasCustomer = Boolean(doc.customerName.trim() || doc.customerPhone.trim())
  const hasCad = Boolean(doc.breakdown.cadCost > 0 || doc.snapshot.cadTierName)
  const hasDiscount = (doc.breakdown.discountAmount ?? 0) > 0
  const roundingOrMinDelta = (doc.breakdown.minimumChargeDelta ?? 0) + doc.breakdown.roundedUpBy

  const dateObj = new Date(doc.createdAt)
  const dateStr = Number.isNaN(dateObj.getTime())
    ? ''
    : dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const matLabel = [
    doc.snapshot.filamentName,
    doc.snapshot.filamentBrand && doc.snapshot.filamentBrand.toLowerCase() !== 'generic'
      ? doc.snapshot.filamentBrand
      : '',
  ]
    .filter(Boolean)
    .join(' · ')

  const opSubParts = [
    showSpecs && doc.breakdown.machineHours > 0
      ? `Machine & electricity (${formatHours(doc.breakdown.machineHours)})`
      : 'Machine & electricity',
    doc.breakdown.wasteCost > 0 ? 'Waste' : '',
    doc.breakdown.setupCost > 0 ? 'Setup' : '',
  ].filter(Boolean)

  return (
    <article className="inv-card" data-voucher-theme={theme} aria-label="Invoice voucher preview">
      <header className="inv-head">
        <div className="inv-brand">
          <h3 className="inv-studio">{profile.studioName || 'PolyCrafy'}</h3>
          <p className="inv-studio-sub">
            {[profile.phone.trim(), profile.address?.trim()].filter(Boolean).join(' · ') || '3D Printing Studio'}
          </p>
        </div>
        <div className="inv-meta">
          <span className="inv-badge">{kind}</span>
          <span className="inv-number">{[doc.invoiceNo?.trim(), dateStr].filter(Boolean).join(' · ')}</span>
        </div>
      </header>

      <div className="inv-divider" />

      {hasCustomer ? (
        <div className="inv-customer">
          <span className="inv-customer-label">CUSTOMER</span>
          <div className="inv-customer-val">
            <span>{doc.customerName.trim() || 'Walk-in'}</span>
            {doc.customerPhone.trim() ? <span className="inv-customer-phone">{doc.customerPhone.trim()}</span> : null}
          </div>
        </div>
      ) : null}

      <div className="inv-table">
        <div className="inv-thead">
          <span>ITEM / DESCRIPTION</span>
          <span className="inv-col-qty">QTY</span>
          <span className="inv-col-amt">AMOUNT ({currency})</span>
        </div>

        {/* Filament Cost Row */}
        <div className="inv-row inv-row-main">
          <div className="inv-item-main">
            <span className="inv-item-title">{partTitle} · Filament Cost</span>
            <span className="inv-item-sub">
              {matLabel}
              {showSpecs && doc.weightG > 0
                ? ` · ${formatAmount(doc.weightG)}g/pc (${formatAmount(doc.breakdown.totalGrams)}g)`
                : ''}
            </span>
          </div>
          <span className="inv-col-qty">{doc.quantity}</span>
          <span className="inv-col-amt inv-amt-strong">{formatAmount(doc.breakdown.materialCost)}</span>
        </div>

        {/* Operation Cost Row */}
        <div className="inv-row">
          <div className="inv-item-main">
            <span className="inv-item-title">Operation Cost</span>
            <span className="inv-item-sub">{opSubParts.join(' + ')}</span>
          </div>
          <span className="inv-col-qty">
            {doc.breakdown.machineHours > 0 ? formatHours(doc.breakdown.machineHours) : '1'}
          </span>
          <span className="inv-col-amt inv-amt-strong">{formatAmount(doc.breakdown.operationCost)}</span>
        </div>

        {hasCad ? (
          <div className="inv-row">
            <div className="inv-item-main">
              <span className="inv-item-title">
                CAD / Design <span className="inv-item-inline-sub">· {doc.snapshot.cadTierName || 'Service'}</span>
              </span>
            </div>
            <span className="inv-col-qty">1</span>
            <span className="inv-col-amt">
              {doc.breakdown.cadCost > 0 ? formatAmount(doc.breakdown.cadCost) : 'Free'}
            </span>
          </div>
        ) : null}

        {doc.breakdown.addonLines.map((line) => (
          <div className="inv-row" key={line.addonId}>
            <div className="inv-item-main">
              <span className="inv-item-title">{line.name}</span>
            </div>
            <span className="inv-col-qty">{line.qty}</span>
            <span className="inv-col-amt">{formatAmount(line.amount)}</span>
          </div>
        ))}

        {roundingOrMinDelta > 0 ? (
          <div className="inv-row">
            <div className="inv-item-main">
              <span className="inv-item-title">
                {doc.breakdown.minimumApplied ? 'Minimum Charge Adjustment' : 'Rounding Adjustment'}
              </span>
            </div>
            <span className="inv-col-qty">—</span>
            <span className="inv-col-amt">+{formatAmount(roundingOrMinDelta)}</span>
          </div>
        ) : null}

        {hasDiscount ? (
          <div className="inv-row inv-row-discount">
            <div className="inv-item-main">
              <span className="inv-item-title">Discount</span>
            </div>
            <span className="inv-col-qty">—</span>
            <span className="inv-col-amt">-{formatAmount(doc.breakdown.discountAmount ?? 0)}</span>
          </div>
        ) : null}
      </div>

      <div className="inv-total-box">
        <div className="inv-total-main">
          <div>
            <span className="inv-total-label">TOTAL DUE</span>
            {doc.quantity > 1 ? (
              <span className="inv-total-each">
                {formatAmount(doc.breakdown.perUnit)} {currency} / piece
              </span>
            ) : null}
          </div>
          <div className="inv-total-figure">
            {formatAmount(doc.breakdown.total)} <small>{currency}</small>
          </div>
        </div>
        {showSpecs ? (
          <div className="inv-total-specs">
            <span>Weight: {formatAmount(doc.breakdown.totalGrams)} g</span>
            <span>·</span>
            <span>Time: {formatHours(doc.breakdown.machineHours)}</span>
          </div>
        ) : null}
      </div>

      {doc.notes.trim() ? (
        <div className="inv-notes">
          <span className="inv-customer-label">NOTES</span>
          <p>{doc.notes.trim()}</p>
        </div>
      ) : null}

      <footer className="inv-foot">
        <p>{profile.footerNote?.trim() || 'Thank you for printing with us!'}</p>
      </footer>
    </article>
  )
}

