import type { Addon, CadTier, Filament, QuoteInput, Rates } from '../src/lib/types.ts'
import type { PricingConfig } from '../src/lib/pricing.ts'

export type PricingConfigFactory = PricingConfig

const baseRates: Rates = {
  electricityPerHour: 1000,
  machinePerHour: 1000,
  setupFee: 0,
  wastePct: 0,
  minimumCharge: 0,
  roundingStep: 0,
  roundingMode: 'exact',
}

const baseFilaments: Filament[] = [
  { id: 'f1', name: 'PLA+', brand: 'eSun', pricePerGram: 200 },
]

const baseCad: CadTier[] = [{ id: 'c1', name: 'Free STL', price: 0, note: '' }]

const baseAddons: Addon[] = []

export function makeConfig(overrides: Partial<PricingConfig> = {}): PricingConfig {
  return {
    rates: { ...baseRates, ...(overrides.rates ?? {}) },
    filaments: overrides.filaments ?? baseFilaments,
    cadTiers: overrides.cadTiers ?? baseCad,
    addons: overrides.addons ?? baseAddons,
  }
}

export function makeInput(overrides: Partial<QuoteInput> = {}): QuoteInput {
  return {
    customerName: '',
    customerPhone: '',
    productName: '',
    filamentId: '',
    weightG: 0,
    quantity: 1,
    printHoursPerUnit: 0,
    cadTierId: null,
    addons: [],
    notes: '',
    ...overrides,
  }
}
