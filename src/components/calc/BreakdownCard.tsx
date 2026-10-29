import { formatAmount, formatHours, formatMoney } from '../../lib/money.ts'
import type { PriceBreakdown } from '../../lib/types.ts'

interface BreakdownCardProps {
  breakdown: PriceBreakdown
  symbol: string
}

export function BreakdownCard({ breakdown, symbol }: BreakdownCardProps) {
  const b = breakdown
  return (
    <div className="bd">
      <div className="bd-row">
        <span className="bd-label">
          Filament Cost · {formatAmount(b.totalGrams)} g × {formatAmount(b.costPerGram)} {symbol}/g
        </span>
        <span className="bd-value tabular">{formatMoney(b.materialCost, symbol)}</span>
      </div>

      <div className="bd-divider" />

      <div className="bd-row">
        <span className="bd-label">
          <strong>Operation Cost</strong>
        </span>
        <span className="bd-value tabular">
          <strong>{formatMoney(b.operationCost, symbol)}</strong>
        </span>
      </div>
      <div className="bd-row">
        <span className="bd-label">
          ↳ Machine & electricity ({formatHours(b.machineHours)})
        </span>
        <span className="bd-value tabular">{formatMoney(b.machineCost, symbol)}</span>
      </div>
      {b.wasteCost > 0 ? (
        <div className="bd-row">
          <span className="bd-label">↳ Waste & failed prints</span>
          <span className="bd-value tabular">{formatMoney(b.wasteCost, symbol)}</span>
        </div>
      ) : null}
      {b.setupCost > 0 ? (
        <div className="bd-row">
          <span className="bd-label">↳ Setup & handling</span>
          <span className="bd-value tabular">{formatMoney(b.setupCost, symbol)}</span>
        </div>
      ) : null}

      {b.addonLines.length > 0 || b.cadCost > 0 ? <div className="bd-divider" /> : null}

      {b.addonLines.map((line) => (
        <div className="bd-row" key={line.addonId}>
          <span className="bd-label">
            {line.name}
            {line.qty > 1 ? ` × ${line.qty}` : ''}
          </span>
          <span className="bd-value tabular">{formatMoney(line.amount, symbol)}</span>
        </div>
      ))}
      {b.cadCost > 0 ? (
        <div className="bd-row">
          <span className="bd-label">Design fee</span>
          <span className="bd-value tabular">{formatMoney(b.cadCost, symbol)}</span>
        </div>
      ) : null}

      {b.minimumApplied || b.roundedUpBy > 0 || (b.discountAmount ?? 0) > 0 ? (
        <>
          <div className="bd-divider" />
          <div className="bd-row">
            <span className="bd-label">Subtotal</span>
            <span className="bd-value tabular">{formatMoney(b.subtotal, symbol)}</span>
          </div>
          {b.minimumApplied ? (
            <div className="bd-row">
              <span className="bd-label">Raised to minimum charge</span>
              <span className="bd-value tabular">+{formatMoney(b.minimumChargeDelta ?? 0, symbol)}</span>
            </div>
          ) : null}
          {b.roundedUpBy > 0 ? (
            <div className="bd-row">
              <span className="bd-label">Rounded for the counter</span>
              <span className="bd-value tabular">+{formatAmount(b.roundedUpBy)}</span>
            </div>
          ) : null}
          {(b.discountAmount ?? 0) > 0 ? (
            <div className="bd-row">
              <span className="bd-label">Discount</span>
              <span className="bd-value tabular">-{formatMoney(b.discountAmount ?? 0, symbol)}</span>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="bd-divider" />
      <div className="bd-row bd-total">
        <span className="bd-label">Total</span>
        <span className="bd-value tabular">
          {formatMoney(b.total, symbol)}
          {b.perUnit > 0 && b.total !== b.perUnit ? <span className="bd-total-per">each {formatAmount(b.perUnit)}</span> : null}
        </span>
      </div>
    </div>
  )
}
