import {
  EMPTY_QUOTE_INPUT,
  STATE_VERSION,
  type Addon,
  type AppState,
  type CadTier,
  type Filament,
  type Profile,
  type QuoteInput,
  type Rates,
} from './types.ts'

export const DEFAULT_PROFILE: Profile = {
  studioName: 'PolyCrafy',
  phone: '',
  currencyCode: 'MMK',
  currencySymbol: 'MMK',
  address: 'Yangon, Myanmar',
  footerNote: 'Thank you for printing with us!',
}

/**
 * Starting values for a small FDM shop in Myanmar, rounded to the prices you
 * see on the street. Every one of them can be changed in Settings.
 */
export const DEFAULT_RATES: Rates = {
  electricityPerHour: 1000,
  machinePerHour: 1000,
  setupFee: 0,
  wastePct: 5,
  minimumCharge: 3000,
  roundingStep: 500,
  roundingMode: 'up',
}

export const DEFAULT_FILAMENTS: Filament[] = [
  { id: 'fil-pla', name: 'PLA', brand: 'Generic', pricePerGram: 150 },
  { id: 'fil-pla-plus', name: 'PLA+', brand: 'eSun', pricePerGram: 200 },
  { id: 'fil-petg', name: 'PETG', brand: 'eSun', pricePerGram: 200 },
  { id: 'fil-abs', name: 'ABS', brand: 'Generic', pricePerGram: 180 },
  { id: 'fil-tpu', name: 'TPU 95A', brand: 'Generic', pricePerGram: 250 },
  { id: 'fil-silk', name: 'PLA Silk', brand: 'Generic', pricePerGram: 220 },
]

export const DEFAULT_CAD_TIERS: CadTier[] = [
  { id: 'cad-free', name: 'Free STL', price: 0, note: 'Customer brings a ready-to-print file.' },
  { id: 'cad-repair', name: 'STL repair', price: 5000, note: 'Fix broken or non-printable geometry.' },
  { id: 'cad-simple', name: 'Simple design', price: 15000, note: 'Small part modelled from a sketch or photo.' },
  { id: 'cad-complex', name: 'Complex design', price: 40000, note: 'Multi-part model with fittings and tolerances.' },
]

export const DEFAULT_ADDONS: Addon[] = [
  { id: 'add-box', name: 'Cardboard box', price: 1500, category: 'packaging' },
  { id: 'add-bubble', name: 'Bubble wrap', price: 1000, category: 'packaging' },
  { id: 'add-gift', name: 'Gift bag & ribbon', price: 2500, category: 'packaging' },
  { id: 'add-sanding', name: 'Sanding & primer', price: 4000, category: 'finishing' },
  { id: 'add-acetone', name: 'Acetone smoothing', price: 5000, category: 'finishing' },
  { id: 'add-inserts', name: 'Brass inserts (4 pcs)', price: 4000, category: 'hardware' },
  { id: 'add-m3', name: 'M3 screw set', price: 3000, category: 'hardware' },
]

export function generateInvoiceNo(): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const rand = String(Math.floor(100 + Math.random() * 900))
  return `INV-${yy}${mm}${dd}-${rand}`
}

/** A blank quote input, pre-selecting the remembered filament. */
export function createDraft(filamentId: string | null): QuoteInput {
  return {
    ...EMPTY_QUOTE_INPUT,
    invoiceNo: generateInvoiceNo(),
    filamentId: filamentId ?? '',
    addons: [],
  }
}

export function createDefaultState(): AppState {
  const firstFilamentId = DEFAULT_FILAMENTS[0]?.id ?? null
  return {
    version: STATE_VERSION,
    profile: { ...DEFAULT_PROFILE },
    rates: { ...DEFAULT_RATES },
    filaments: DEFAULT_FILAMENTS.map((item) => ({ ...item })),
    cadTiers: DEFAULT_CAD_TIERS.map((item) => ({ ...item })),
    addons: DEFAULT_ADDONS.map((item) => ({ ...item })),
    preferences: {
      theme: 'dark',
      lastFilamentId: firstFilamentId,
      voucherTheme: 'paper',
      voucherKind: 'VOUCHER',
      showSpecsOnVoucher: true,
    },
    draft: createDraft(firstFilamentId),
  }
}
