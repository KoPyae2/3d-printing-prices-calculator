import { useAppStore } from '../../store/store.ts'
import { updateRates } from '../../store/actions.ts'
import { SettingsSectionLayout } from './SettingsSectionLayout.tsx'
import { NumberField } from '../../components/ui/NumberField.tsx'
import { SegmentedControl } from '../../components/ui/SegmentedControl.tsx'
import { Icon } from '../../components/icons/Icons.tsx'
import { calculateQuote, electricityPerHour } from '../../lib/pricing.ts'
import { formatAmount } from '../../lib/money.ts'
import { ROUNDING_MODE_LABEL, ROUNDING_MODES, type RoundingMode } from '../../lib/types.ts'
import { EMPTY_QUOTE_INPUT } from '../../lib/types.ts'

const ROUND_SEGMENTS = ROUNDING_MODES.map((value) => ({ value, label: ROUNDING_MODE_LABEL[value] }))

export function RatesSection() {
  const rates = useAppStore((s) => s.rates)
  const profile = useAppStore((s) => s.profile)
  const filaments = useAppStore((s) => s.filaments)
  const cadTiers = useAppStore((s) => s.cadTiers)
  const addons = useAppStore((s) => s.addons)
  const symbol = profile.currencySymbol || profile.currencyCode

  const electric = electricityPerHour(rates)

  const hourlyCombined = electric + rates.machinePerHour

  const sample = calculateQuote(
    {
      ...EMPTY_QUOTE_INPUT,
      filamentId: filaments[0]?.id ?? '',
      weightG: 100,
      quantity: 1,
      printHoursPerUnit: 2,
    },
    { rates, filaments, cadTiers, addons },
  )

  return (
    <SettingsSectionLayout
      title="Operation costs & rounding"
      subtitle="Machine & electricity hourly rates, waste allowance, setup fee, and rounding."
    >
      <section className="group">
        <header className="group-head">
          <h2 className="group-title">Machine & electricity (per hour)</h2>
        </header>
        <div className="group-body">
          <div className="grid-2">
            <NumberField
              label="Electricity per hour"
              value={rates.electricityPerHour}
              onChange={(value) => updateRates({ electricityPerHour: value })}
              suffix={`${symbol}/hr`}
              min={0}
              max={1_000_000}
              step={100}
              integer
              hint="Direct hourly electricity rate."
            />
            <NumberField
              label="Machine per hour"
              value={rates.machinePerHour}
              onChange={(value) => updateRates({ machinePerHour: value })}
              suffix={`${symbol}/hr`}
              min={0}
              max={1_000_000}
              step={100}
              integer
              hint="Machine usage, wear & maintenance."
            />
          </div>
          <p className="field-hint" style={{ marginTop: 'var(--s-3)' }}>
            Combined hourly rate: <strong>{formatAmount(hourlyCombined)} {symbol}/hr</strong> (e.g. 2 hours = {formatAmount(hourlyCombined * 2)} {symbol}).
          </p>
        </div>
      </section>

      <section className="group">
        <header className="group-head">
          <h2 className="group-title">Waste & setup</h2>
        </header>
        <div className="group-body">
          <div className="grid-2">
            <NumberField
              label="Waste & failed prints"
              value={rates.wastePct}
              onChange={(value) => updateRates({ wastePct: value })}
              suffix="%"
              min={0}
              max={100}
              step={1}
              integer
              hint="Added to operation cost as % of filament."
            />
            <NumberField
              label="Setup & handling fee"
              value={rates.setupFee}
              onChange={(value) => updateRates({ setupFee: value })}
              suffix={symbol}
              min={0}
              max={10_000_000}
              step={500}
              integer
              hint="Flat per-order fee. Set 0 if not needed."
            />
          </div>
        </div>
      </section>

      <section className="group">
        <header className="group-head">
          <h2 className="group-title">Minimum charge & rounding</h2>
        </header>
        <div className="group-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
          <NumberField
            label="Minimum charge"
            value={rates.minimumCharge}
            onChange={(value) => updateRates({ minimumCharge: value })}
            suffix={symbol}
            min={0}
            max={10_000_000}
            step={500}
            integer
            hint="No job is quoted below this. Set 0 to turn it off."
          />
          <NumberField
            label="Round to the nearest"
            value={rates.roundingStep}
            onChange={(value) => updateRates({ roundingStep: value })}
            suffix={symbol}
            min={0}
            max={1_000_000}
            step={100}
            integer
            hint="Common in Myanmar: 500 or 1,000. Set 0 for exact figures."
          />
          <SegmentedControl
            value={rates.roundingMode}
            segments={ROUND_SEGMENTS}
            onChange={(value) => updateRates({ roundingMode: value as RoundingMode })}
            label="Rounding rule"
          />
        </div>
      </section>

      <div className="notice">
        <Icon name="info" size={15} />
        <span>
          Example: a 100 g part with 2 hours of printing: Filament ={' '}
          <strong>{formatAmount(sample.materialCost)} {symbol}</strong> + Operation ={' '}
          <strong>{formatAmount(sample.operationCost)} {symbol}</strong> → Total{' '}
          <strong>{formatAmount(sample.total)} {symbol}</strong>.
        </span>
      </div>
    </SettingsSectionLayout>
  )
}
