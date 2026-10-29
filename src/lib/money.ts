import type { Money, RoundingMode } from './types.ts'

const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const precise = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

/** 28000 -> "28,000" */
export function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return Number.isInteger(value) ? whole.format(value) : precise.format(value)
}

/** 28000, "MMK" -> "28,000 MMK" */
export function formatMoney(value: number, symbol: string): string {
  const clean = symbol.trim()
  return clean ? `${formatAmount(value)} ${clean}` : formatAmount(value)
}

/**
 * Small numbers that appear inside sentences, such as a per-gram rate.
 * Keeps up to two decimals and never shows a trailing ".00".
 */
export function formatRate(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return precise.format(value)
}

/**
 * Parses a user-typed number. Tolerates thousands separators, spaces and a
 * trailing decimal point while the user is still typing.
 */
export function parseNumber(raw: string): number {
  if (typeof raw !== 'string') return 0
  const cleaned = raw.replace(/[\s,_]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return 0
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : 0
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

/** Rounds up to the next step, with an epsilon so 1000 does not become 2000. */
export function ceilTo(value: number, step: number): number {
  if (!Number.isFinite(value) || step <= 0 || value <= 0) return Math.max(0, value || 0)
  return Math.ceil((value - 1e-9) / step) * step
}

/** Rounds to the closest step, halves going up. */
export function nearestTo(value: number, step: number): number {
  if (!Number.isFinite(value) || step <= 0) return Math.max(0, value || 0)
  return Math.round(value / step) * step
}

/** Applies the configured rounding rule. Returns the value unchanged for "exact". */
export function applyRounding(value: number, step: Money, mode: RoundingMode): number {
  if (mode === 'exact' || !(step > 0) || !(value > 0)) return Math.max(0, value || 0)
  return mode === 'nearest' ? nearestTo(value, step) : ceilTo(value, step)
}

/** 2.5 -> "2h 30m" */
export function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return '0m'
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function splitHours(hours: number): { h: string; m: string } {
  if (!Number.isFinite(hours) || hours <= 0) return { h: '', m: '' }
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return { h: h ? String(h) : '', m: m ? String(m) : '' }
}

export function hoursFromParts(h: string, m: string): number {
  const hh = parseNumber(h)
  const mm = parseNumber(m)
  return clamp(hh, 0, 1000) + clamp(mm, 0, 59) / 60
}
