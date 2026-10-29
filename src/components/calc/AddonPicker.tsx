import { formatAmount } from '../../lib/money.ts'
import type { Addon, AddonSelection } from '../../lib/types.ts'
import { Icon } from '../icons/Icons.tsx'

interface AddonPickerProps {
  addons: Addon[]
  selection: AddonSelection[]
  symbol: string
  onToggle: (id: string) => void
  onQty: (id: string, qty: number) => void
}

export function AddonPicker({ addons, selection, symbol, onToggle, onQty }: AddonPickerProps) {
  if (addons.length === 0) {
    return <p className="field-hint">No extras yet. Add packaging or services in Settings.</p>
  }

  return (
    <div className="opt-list">
      {addons.map((addon) => {
        const line = selection.find((item) => item.addonId === addon.id)
        const qty = line?.qty ?? 0
        const on = qty > 0
        return (
          <div key={addon.id} className="opt" data-on={on}>
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-label={addon.name}
              className="opt-mark"
              onClick={() => onToggle(addon.id)}
            >
              <Icon name="check" size={12} strokeWidth={2.75} />
            </button>
            <button type="button" className="opt-main" onClick={() => onToggle(addon.id)}>
              <span className="opt-title">{addon.name}</span>
              <span className="opt-sub">
                {formatAmount(addon.price)} {symbol}
              </span>
            </button>
            {on ? (
              <div className="stepper" role="group" aria-label={`Quantity for ${addon.name}`}>
                <button
                  type="button"
                  className="stepper-btn"
                  aria-label={`Less ${addon.name}`}
                  onClick={() => onQty(addon.id, qty - 1)}
                >
                  <Icon name="minus" size={13} />
                </button>
                <span className="stepper-value">{qty}</span>
                <button
                  type="button"
                  className="stepper-btn"
                  aria-label={`More ${addon.name}`}
                  onClick={() => onQty(addon.id, qty + 1)}
                >
                  <Icon name="plus" size={13} />
                </button>
              </div>
            ) : (
              <span className="opt-price">+{formatAmount(addon.price)}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
