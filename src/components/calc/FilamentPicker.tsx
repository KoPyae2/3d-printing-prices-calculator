import { formatAmount } from '../../lib/money.ts'
import type { Filament } from '../../lib/types.ts'

interface FilamentPickerProps {
  filaments: Filament[]
  value: string
  symbol: string
  onChange: (id: string) => void
}

/** Compact grid of material tiles so the shop can pick a spool at a glance. */
export function FilamentPicker({ filaments, value, symbol, onChange }: FilamentPickerProps) {
  return (
    <div className="filament-grid" role="radiogroup" aria-label="Filament">
      {filaments.map((filament) => {
        const selected = filament.id === value
        const perGram = filament.pricePerGram
        const showBrand = filament.brand && filament.brand.toLowerCase() !== 'generic'
        return (
          <button
            key={filament.id}
            type="button"
            role="radio"
            aria-checked={selected}
            className="filament-tile"
            data-on={selected}
            onClick={() => onChange(filament.id)}
          >
            <span className="filament-tile-top">
              <span className="filament-tile-name">{filament.name}</span>
              {showBrand ? <span className="filament-tile-brand">{filament.brand}</span> : null}
            </span>
            <span className="filament-tile-meta">
              {formatAmount(perGram)} {symbol}/g
            </span>
          </button>
        )
      })}
    </div>
  )
}
