import { clamp } from './money.ts'
import {
  ADDON_CATEGORIES,
  CONFIG_APP_ID,
  CONFIG_SCHEMA_VERSION,
  ROUNDING_MODES,
  STATE_VERSION,
  THEME_OPTIONS,
  VOUCHER_KINDS,
  VOUCHER_THEMES,
  type Addon,
  type AddonCategory,
  type AddonSelection,
  type AppState,
  type CadTier,
  type ConfigPayload,
  type Filament,
  type Preferences,
  type Profile,
  type QuoteInput,
  type Rates,
  type RoundingMode,
  type ThemePreference,
  type VoucherKind,
  type VoucherTheme,
} from './types.ts'
import { createDefaultState, createDraft } from './defaults.ts'

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/** Rejects input before parsing so a huge file cannot lock the tab. */
export const MAX_IMPORT_BYTES = 1_000_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown, field: string, max = 200): string {
  if (typeof value !== 'string') throw new ValidationError(`${field} must be text.`)
  return value.trim().slice(0, max)
}

function optionalStr(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function num(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(`${field} must be a number.`)
  }
  return clamp(value, min, max)
}

function list<T>(value: unknown, field: string, parse: (item: unknown, index: number) => T): T[] {
  if (!Array.isArray(value)) throw new ValidationError(`${field} must be a list.`)
  return value.map((item, index) => parse(item, index))
}

function parseFilament(item: unknown, index: number): Filament {
  if (!isRecord(item)) throw new ValidationError(`Filament ${index + 1} is not valid.`)
  let pricePerGram: number
  if (typeof item.pricePerGram === 'number') {
    pricePerGram = num(item.pricePerGram, `Filament ${index + 1} price per gram`, 0, 1_000_000)
  } else {
    const spoolWeightG = num(item.spoolWeightG ?? 1000, `Filament ${index + 1} spool weight`, 1, 100_000)
    const spoolPrice = num(item.spoolPrice ?? 0, `Filament ${index + 1} spool price`, 0, 100_000_000)
    pricePerGram = clamp(Math.round(spoolPrice / spoolWeightG), 0, 1_000_000)
  }
  return {
    id: str(item.id, `Filament ${index + 1} id`, 80),
    name: str(item.name, `Filament ${index + 1} name`, 120),
    brand: optionalStr(item.brand, 80),
    pricePerGram,
  }
}

function parseCadTier(item: unknown, index: number): CadTier {
  if (!isRecord(item)) throw new ValidationError(`Design tier ${index + 1} is not valid.`)
  return {
    id: str(item.id, `Design tier ${index + 1} id`, 80),
    name: str(item.name, `Design tier ${index + 1} name`, 160),
    price: num(item.price, `Design tier ${index + 1} price`, 0, 100_000_000),
    note: optionalStr(item.note, 300),
  }
}

function parseAddon(item: unknown, index: number): Addon {
  if (!isRecord(item)) throw new ValidationError(`Add-on ${index + 1} is not valid.`)
  const category = ADDON_CATEGORIES.includes(item.category as AddonCategory)
    ? (item.category as AddonCategory)
    : 'other'
  return {
    id: str(item.id, `Add-on ${index + 1} id`, 80),
    name: str(item.name, `Add-on ${index + 1} name`, 160),
    price: num(item.price, `Add-on ${index + 1} price`, 0, 100_000_000),
    category,
  }
}

function parseProfile(value: unknown): Profile {
  if (!isRecord(value)) throw new ValidationError('Studio profile is missing.')
  return {
    studioName: optionalStr(value.studioName, 80) || 'PolyCrafy',
    phone: optionalStr(value.phone, 40),
    currencyCode: (optionalStr(value.currencyCode, 8) || 'MMK').toUpperCase(),
    currencySymbol: optionalStr(value.currencySymbol, 8) || 'MMK',
    address: optionalStr(value.address, 120),
    footerNote: optionalStr(value.footerNote, 240) || 'Thank you for printing with us!',
  }
}

function parseRates(value: unknown): Rates {
  if (!isRecord(value)) throw new ValidationError('Rates are missing.')
  const mode = ROUNDING_MODES.includes(value.roundingMode as RoundingMode)
    ? (value.roundingMode as RoundingMode)
    : 'up'

  let electricityPerHour: number
  if (typeof value.electricityPerHour === 'number') {
    electricityPerHour = num(value.electricityPerHour, 'Electricity per hour', 0, 1_000_000)
  } else {
    const kwh = typeof value.electricityPerKWh === 'number' ? value.electricityPerKWh : 0
    const watts = typeof value.printerWatts === 'number' ? value.printerWatts : 0
    electricityPerHour = num(Math.round((kwh * watts) / 1000), 'Electricity per hour', 0, 1_000_000)
  }

  let setupFee: number
  if (typeof value.setupFee === 'number') {
    setupFee = num(value.setupFee, 'Setup fee', 0, 10_000_000)
  } else {
    const laborPerHour = typeof value.laborPerHour === 'number' ? value.laborPerHour : 0
    const setupMinutes = typeof value.setupMinutes === 'number' ? value.setupMinutes : 0
    setupFee = num(Math.round((laborPerHour * setupMinutes) / 60), 'Setup fee', 0, 10_000_000)
  }

  return {
    electricityPerHour,
    machinePerHour: num(value.machinePerHour ?? 0, 'Machine hourly', 0, 1_000_000),
    setupFee,
    wastePct: num(value.wastePct ?? 0, 'Waste', 0, 100),
    minimumCharge: num(value.minimumCharge ?? 0, 'Minimum charge', 0, 10_000_000),
    roundingStep: num(value.roundingStep ?? 0, 'Rounding step', 0, 1_000_000),
    roundingMode: mode,
  }
}

/**
 * Validates a settings payload. Imports require a usable catalog; local state
 * does not, because a user is allowed to delete every filament or tier and
 * must not lose the rest of their setup for it.
 */
export function parseConfigPayload(
  value: unknown,
  options: { requireCatalog?: boolean } = {},
): ConfigPayload {
  const requireCatalog = options.requireCatalog ?? true
  if (!isRecord(value)) throw new ValidationError('This file does not contain a settings object.')
  const filaments = list(value.filaments, 'Filaments', parseFilament)
  const cadTiers = list(value.cadTiers, 'Design tiers', parseCadTier)
  const addons = list(value.addons, 'Add-ons', parseAddon)
  if (requireCatalog && filaments.length === 0) throw new ValidationError('The file has no filaments.')
  if (requireCatalog && cadTiers.length === 0) throw new ValidationError('The file has no design tiers.')
  assertUniqueIds(filaments, 'filaments')
  assertUniqueIds(cadTiers, 'design tiers')
  assertUniqueIds(addons, 'add-ons')
  return { profile: parseProfile(value.profile), rates: parseRates(value.rates), filaments, cadTiers, addons }
}

function assertUniqueIds(items: { id: string }[], label: string): void {
  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item.id)) throw new ValidationError(`Two ${label} share the same id (${item.id}).`)
    seen.add(item.id)
  }
}

/**
 * Reads an exported settings file. Rejects other apps and newer schema
 * versions instead of silently mispricing a shop. Version 1 files are
 * migrated on the way in.
 */
export function parseConfigFile(text: string): ConfigPayload {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new ValidationError('That file is not valid JSON.')
  }
  if (!isRecord(parsed)) throw new ValidationError('That file is not a PolyCrafy settings file.')
  if (parsed.app !== CONFIG_APP_ID) {
    throw new ValidationError('That file was not exported by PolyCrafy Calculator.')
  }
  const version = typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 0
  if (version > CONFIG_SCHEMA_VERSION) {
    throw new ValidationError('This settings file is from a newer version of the app. Update first.')
  }
  return parseConfigPayload(parsed)
}

export function buildConfigBundle(payload: ConfigPayload, preferences?: Preferences): Record<string, unknown> {
  return {
    app: CONFIG_APP_ID,
    schemaVersion: CONFIG_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    profile: payload.profile,
    rates: payload.rates,
    filaments: payload.filaments,
    cadTiers: payload.cadTiers,
    addons: payload.addons,
    ...(preferences ? { preferences } : {}),
  }
}

/** Adds imported items after existing ones, skipping ids that already exist. */
export function mergeConfig(current: ConfigPayload, incoming: ConfigPayload): ConfigPayload {
  const mergeList = <T extends { id: string }>(a: T[], b: T[]): T[] => {
    const seen = new Set(a.map((item) => item.id))
    return [...a, ...b.filter((item) => !seen.has(item.id))]
  }
  return {
    profile: incoming.profile,
    rates: incoming.rates,
    filaments: mergeList(current.filaments, incoming.filaments),
    cadTiers: mergeList(current.cadTiers, incoming.cadTiers),
    addons: mergeList(current.addons, incoming.addons),
  }
}

function parseDraft(
  value: unknown,
  fallbackFilamentId: string | null,
  payload: ConfigPayload,
): QuoteInput {
  const base = createDraft(fallbackFilamentId)
  if (!isRecord(value)) return base

  const rawFilamentId = typeof value.filamentId === 'string' ? value.filamentId : ''
  const filamentId = payload.filaments.some((f) => f.id === rawFilamentId)
    ? rawFilamentId
    : (fallbackFilamentId ?? '')

  const rawCadId = typeof value.cadTierId === 'string' ? value.cadTierId : null
  const cadTierId = rawCadId && payload.cadTiers.some((c) => c.id === rawCadId) ? rawCadId : null

  const addons: AddonSelection[] = []
  if (Array.isArray(value.addons)) {
    for (const item of value.addons) {
      if (!isRecord(item) || typeof item.addonId !== 'string') continue
      if (!payload.addons.some((a) => a.id === item.addonId)) continue
      const qty = typeof item.qty === 'number' && Number.isFinite(item.qty) ? Math.floor(item.qty) : 0
      if (qty > 0) addons.push({ addonId: item.addonId, qty: clamp(qty, 1, 10_000) })
    }
  }

  const weightG =
    typeof value.weightG === 'number' && Number.isFinite(value.weightG)
      ? clamp(value.weightG, 0, 1_000_000)
      : 0
  const quantity =
    typeof value.quantity === 'number' && Number.isFinite(value.quantity)
      ? clamp(Math.round(value.quantity), 1, 10_000)
      : 1
  const printHoursPerUnit =
    typeof value.printHoursPerUnit === 'number' && Number.isFinite(value.printHoursPerUnit)
      ? clamp(value.printHoursPerUnit, 0, 2000)
      : 0
  const discount =
    typeof value.discount === 'number' && Number.isFinite(value.discount)
      ? clamp(value.discount, 0, 100_000_000)
      : 0

  return {
    invoiceNo: optionalStr(value.invoiceNo, 60) || base.invoiceNo,
    customerName: optionalStr(value.customerName, 120),
    customerPhone: optionalStr(value.customerPhone, 60),
    productName: optionalStr(value.productName, 160),
    filamentId,
    weightG,
    quantity,
    printHoursPerUnit,
    cadTierId,
    addons,
    discount,
    notes: optionalStr(value.notes, 500),
  }
}

/**
 * Loads persisted state from localStorage. Any problem falls back to defaults
 * rather than leaving the user with a broken calculator.
 */
export function parseStoredState(raw: string): AppState {
  const fallback = createDefaultState()
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return fallback
  }
  if (!isRecord(parsed)) return fallback
  const version = typeof parsed.version === 'number' ? parsed.version : 0

  let payload: ConfigPayload
  try {
    payload = parseConfigPayload(parsed, { requireCatalog: false })
  } catch {
    return fallback
  }

  const preferences = parsePreferences(parsed.preferences, fallback.preferences)
  const initialFilament =
    preferences.lastFilamentId && payload.filaments.some((f) => f.id === preferences.lastFilamentId)
      ? preferences.lastFilamentId
      : (payload.filaments[0]?.id ?? null)

  return {
    version: Math.max(STATE_VERSION, version),
    ...payload,
    preferences: {
      ...preferences,
      lastFilamentId: initialFilament,
    },
    draft: parseDraft(parsed.draft, initialFilament, payload),
  }
}

function parsePreferences(value: unknown, fallback: Preferences): Preferences {
  if (!isRecord(value)) return fallback
  const theme = THEME_OPTIONS.includes(value.theme as ThemePreference)
    ? (value.theme as ThemePreference)
    : fallback.theme
  const lastFilamentId = typeof value.lastFilamentId === 'string' ? value.lastFilamentId : null
  const voucherTheme = VOUCHER_THEMES.includes(value.voucherTheme as VoucherTheme)
    ? (value.voucherTheme as VoucherTheme)
    : (fallback.voucherTheme ?? 'paper')
  const voucherKind = VOUCHER_KINDS.includes(value.voucherKind as VoucherKind)
    ? (value.voucherKind as VoucherKind)
    : (fallback.voucherKind ?? 'VOUCHER')
  const showSpecsOnVoucher =
    typeof value.showSpecsOnVoucher === 'boolean'
      ? value.showSpecsOnVoucher
      : (fallback.showSpecsOnVoucher ?? true)
  return { theme, lastFilamentId, voucherTheme, voucherKind, showSpecsOnVoucher }
}
