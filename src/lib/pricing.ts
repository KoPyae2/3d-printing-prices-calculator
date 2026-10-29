import type {
  Addon,
  AddonBreakdownLine,
  AppState,
  CadTier,
  Filament,
  Money,
  PriceBreakdown,
  QuoteInput,
  Rates,
} from './types.ts'
import { applyRounding } from './money.ts'

export interface PricingConfig {
  filaments: Filament[]
  cadTiers: CadTier[]
  addons: Addon[]
  rates: Rates
}

/** Minimal slice of app state the calculator needs. */
export type PricingSource = Pick<AppState, 'filaments' | 'cadTiers' | 'addons' | 'rates'>

/**
 * Direct selling price of one gram of filament (profit included).
 */
export function costPerGram(filament: Filament | undefined): number {
  if (!filament) return 0
  return sanitizeNonNegative(filament.pricePerGram)
}

/** Electricity cost of running the printer for one hour. */
export function electricityPerHour(rates: Rates): number {
  return sanitizeNonNegative(rates.electricityPerHour)
}

/**
 * The quote, built from two main operational pillars:
 *
 *   filamentCost  = grams x pricePerGram (profit built into filament rate)
 *   operationCost = machine & electricity ((electricityPerHour + machinePerHour) x hours)
 *                 + waste & failed prints (filamentCost x wastePct%)
 *                 + setup & handling (flat setupFee when printing)
 *   add-ons       = sum of extras, design fee added once
 *   subtotal      = filamentCost + operationCost + addonsCost + cadCost
 *   rawTotal      = subtotal raised to minimumCharge if needed
 *   total         = rawTotal rounded for the counter (minus optional discount)
 */
export function calculateQuote(input: QuoteInput, config: PricingConfig): PriceBreakdown {
  const rates = config.rates
  const quantity = sanitizeQuantity(input.quantity)
  const weightPerPart = sanitizeNonNegative(input.weightG)
  const hoursPerPart = sanitizeNonNegative(input.printHoursPerUnit)

  const filament = config.filaments.find((item) => item.id === input.filamentId)
  const perGram = costPerGram(filament)
  const totalGrams = weightPerPart * quantity
  const materialCost = totalGrams * perGram

  const wastePct = sanitizeNonNegative(rates.wastePct)
  const wasteCost = materialCost * (wastePct / 100)

  const machineHours = hoursPerPart * quantity
  const electricRate = electricityPerHour(rates)
  const electricityCost = electricRate * machineHours
  const wearCost = sanitizeNonNegative(rates.machinePerHour) * machineHours
  const machineCost = electricityCost + wearCost

  // Setup & handling fee only applies when something is actually being printed.
  const hasPrintWork = totalGrams > 0 || machineHours > 0
  const setupCost = hasPrintWork ? sanitizeNonNegative(rates.setupFee) : 0

  const operationCost = machineCost + wasteCost + setupCost

  const addonLines: AddonBreakdownLine[] = []
  const seen = new Set<string>()
  for (const selection of input.addons) {
    const addon = config.addons.find((item) => item.id === selection.addonId)
    if (!addon || seen.has(addon.id)) continue
    const qty = Math.max(0, Math.floor(sanitizeNonNegative(selection.qty)))
    if (qty === 0) continue
    seen.add(addon.id)
    addonLines.push({
      addonId: addon.id,
      name: addon.name,
      qty,
      amount: sanitizeNonNegative(addon.price) * qty,
    })
  }
  const addonsCost = addonLines.reduce((sum, line) => sum + line.amount, 0)

  const cadTier = input.cadTierId ? config.cadTiers.find((item) => item.id === input.cadTierId) : undefined
  const cadCost = cadTier ? sanitizeNonNegative(cadTier.price) : 0

  const subtotal = materialCost + operationCost + addonsCost + cadCost

  const minimum = sanitizeNonNegative(rates.minimumCharge)
  const minimumApplied = minimum > 0 && subtotal > 0 && subtotal < minimum
  const rawTotal = minimumApplied ? minimum : subtotal
  const minimumChargeDelta = minimumApplied ? minimum - subtotal : 0

  const grossTotal = applyRounding(rawTotal, sanitizeNonNegative(rates.roundingStep), rates.roundingMode)
  const roundedUpBy = Math.max(0, grossTotal - rawTotal)
  const discountAmount = Math.min(grossTotal, sanitizeNonNegative(input.discount ?? 0))
  const total = Math.max(0, grossTotal - discountAmount)

  return {
    costPerGram: perGram,
    totalGrams,
    materialCost,
    machineHours,
    electricityPerHour: electricRate,
    electricityCost,
    wearCost,
    machineCost,
    wasteCost,
    setupCost,
    operationCost,
    addonsCost,
    cadCost,
    addonLines,
    subtotal,
    minimumApplied,
    minimumChargeDelta,
    rawTotal,
    roundedUpBy,
    grossTotal,
    discountAmount,
    total,
    perUnit: quantity > 0 ? total / quantity : 0,
    pricePerGram: totalGrams > 0 ? total / totalGrams : 0,
  }
}

/** A quote/invoice is ready once it has a filament, some weight, and a quantity. */
export function validateQuoteInput(input: QuoteInput, filaments: Filament[]): string | null {
  if (!input.filamentId || !filaments.some((item) => item.id === input.filamentId)) {
    return 'Choose a filament first.'
  }
  if (!(input.weightG > 0)) return 'Enter the part weight in grams.'
  if (!(input.quantity >= 1)) return 'Quantity must be at least 1.'
  return null
}

export function sanitizeQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.floor(value))
}

function sanitizeNonNegative(value: number): Money {
  if (!Number.isFinite(value) || value < 0) return 0
  return value
}
