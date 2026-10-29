/**
 * Domain model for PolyCrafy — 3D print price calculator & invoice/voucher maker.
 *
 * Money is whole Kyat (MMK) by default. Costs are built from the things a real
 * shop actually pays for: the spool, the machine hour, electricity, and the
 * operator's time. Profit is applied to the whole cost, and the final figure is
 * rounded for the counter.
 */

export type Money = number

export const ADDON_CATEGORIES = ['packaging', 'finishing', 'hardware', 'other'] as const
export type AddonCategory = (typeof ADDON_CATEGORIES)[number]

export const ADDON_CATEGORY_LABEL: Record<AddonCategory, string> = {
  packaging: 'Packaging',
  finishing: 'Finishing',
  hardware: 'Hardware',
  other: 'Other',
}

export const THEME_OPTIONS = ['dark', 'light', 'system'] as const
export type ThemePreference = (typeof THEME_OPTIONS)[number]

export const ROUNDING_MODES = ['up', 'nearest', 'exact'] as const
export type RoundingMode = (typeof ROUNDING_MODES)[number]

export const ROUNDING_MODE_LABEL: Record<RoundingMode, string> = {
  up: 'Round up',
  nearest: 'Nearest',
  exact: 'Exact',
}

export const VOUCHER_THEMES = ['paper', 'dark'] as const
export type VoucherTheme = (typeof VOUCHER_THEMES)[number]

export const VOUCHER_KINDS = ['INVOICE', 'VOUCHER', 'QUOTATION'] as const
export type VoucherKind = (typeof VOUCHER_KINDS)[number]

/**
 * A filament with its direct selling price per gram (profit included).
 */
export interface Filament {
  id: string
  name: string
  brand: string
  /** Selling price per gram in MMK (includes filament profit, e.g. 200 MMK/g). */
  pricePerGram: Money
}

export interface CadTier {
  id: string
  name: string
  price: Money
  note: string
}

export interface Addon {
  id: string
  name: string
  price: Money
  category: AddonCategory
}

export interface Profile {
  studioName: string
  phone: string
  currencyCode: string
  currencySymbol: string
  address?: string
  footerNote?: string
}

export interface Rates {
  /** Direct electricity cost per printing hour in MMK, e.g. 1000. */
  electricityPerHour: Money
  /** Machine wear, depreciation and maintenance per printing hour in MMK, e.g. 1000. */
  machinePerHour: Money
  /** Flat per-order setup & handling fee in MMK (can be 0). */
  setupFee: Money
  /** Waste & failed prints, as a percentage of filament cost. */
  wastePct: number
  /** A job never quotes below this figure. Set 0 to disable. */
  minimumCharge: Money
  /** Rounding step in MMK, e.g. 500 or 1000. */
  roundingStep: Money
  roundingMode: RoundingMode
}

export interface Preferences {
  theme: ThemePreference
  lastFilamentId: string | null
  voucherTheme?: VoucherTheme
  voucherKind?: VoucherKind
  showSpecsOnVoucher?: boolean
}

export interface AddonSelection {
  addonId: string
  qty: number
}

/** Everything entered on the Calculator & Invoice builder. */
export interface QuoteInput {
  invoiceNo?: string
  customerName: string
  customerPhone: string
  productName: string
  filamentId: string
  weightG: number
  quantity: number
  /** Print time for a single part, in hours. */
  printHoursPerUnit: number
  cadTierId: string | null
  addons: AddonSelection[]
  discount?: Money
  notes: string
}

export interface AddonBreakdownLine {
  addonId: string
  name: string
  qty: number
  amount: Money
}

export interface PriceBreakdown {
  /** Direct filament selling rate per gram. */
  costPerGram: number
  totalGrams: number
  /** Filament cost = totalGrams * costPerGram. */
  materialCost: Money
  machineHours: number
  electricityPerHour: number
  electricityCost: Money
  wearCost: Money
  /** Machine & electricity cost = (electricityPerHour + machinePerHour) * machineHours. */
  machineCost: Money
  /** Waste & failed prints = materialCost * (wastePct / 100). */
  wasteCost: Money
  /** Setup & handling flat fee when print work is present. */
  setupCost: Money
  /** Total operation cost = machineCost + wasteCost + setupCost. */
  operationCost: Money
  addonsCost: Money
  cadCost: Money
  addonLines: AddonBreakdownLine[]
  /** Subtotal of filament + operation + design + extras. */
  subtotal: Money
  minimumApplied: boolean
  /** How much the minimum charge added on top of subtotal. */
  minimumChargeDelta: Money
  /** Total before rounding. */
  rawTotal: Money
  roundedUpBy: Money
  /** Rounded total before optional invoice discount. */
  grossTotal?: Money
  /** Optional discount deducted on the invoice. */
  discountAmount?: Money
  total: Money
  perUnit: Money
  /** Effective final selling price per gram. */
  pricePerGram: number
}

export interface VoucherSnapshot {
  filamentName: string
  filamentBrand: string
  pricePerGram: Money
  cadTierName: string
  rates: Rates
}

export interface InvoiceDocument extends QuoteInput {
  id: string
  createdAt: string
  breakdown: PriceBreakdown
  snapshot: VoucherSnapshot
}

export const CONFIG_APP_ID = 'polycrafy-calculator'
export const CONFIG_SCHEMA_VERSION = 2
export const STATE_VERSION = 4

export interface ConfigPayload {
  profile: Profile
  rates: Rates
  filaments: Filament[]
  cadTiers: CadTier[]
  addons: Addon[]
}

/** The exported settings file. */
export interface ConfigBundle extends ConfigPayload {
  app: typeof CONFIG_APP_ID
  schemaVersion: number
  exportedAt: string
  preferences?: Preferences
}

export interface AppState extends ConfigPayload {
  version: number
  preferences: Preferences
  /** Current active calculator / invoice state. */
  draft: QuoteInput
}

export const EMPTY_QUOTE_INPUT: QuoteInput = {
  invoiceNo: '',
  customerName: '',
  customerPhone: '',
  productName: '',
  filamentId: '',
  weightG: 0,
  quantity: 1,
  printHoursPerUnit: 0,
  cadTierId: null,
  addons: [],
  discount: 0,
  notes: '',
}
