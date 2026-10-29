import { formatAmount, formatHours } from './money.ts'
import type { InvoiceDocument, Profile, VoucherKind, VoucherTheme } from './types.ts'

export interface VoucherRenderOptions {
  theme?: VoucherTheme
  kind?: VoucherKind
  showSpecs?: boolean
}

/**
 * Computes the customer-facing line price for the 3D printed part itself so
 * that (partLineAmount + cadCost + addonsCost - discount === total).
 */
export function getPartLineAmount(doc: InvoiceDocument): number {
  const b = doc.breakdown
  const gross = b.grossTotal ?? b.total
  const extras = b.cadCost + b.addonsCost
  return Math.max(0, gross - extras)
}

/**
 * Plain-text price voucher for pasting into Viber, WhatsApp, Messenger, or Telegram.
 */
export function buildVoucherText(
  doc: InvoiceDocument,
  profile: Profile,
  options: VoucherRenderOptions = {},
): string {
  const currency = profile.currencySymbol || profile.currencyCode || 'MMK'
  const kind = options.kind ?? 'VOUCHER'
  const showSpecs = options.showSpecs ?? true
  const lines: string[] = []
  const date = new Date(doc.createdAt)
  const stamp = Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

  lines.push(`${(profile.studioName || 'PolyCrafy').toUpperCase()} — ${kind}`)
  if (doc.invoiceNo?.trim()) lines.push(`No: ${doc.invoiceNo.trim()}`)
  if (stamp) lines.push(`Date: ${stamp}`)
  if (profile.phone.trim()) lines.push(`Tel: ${profile.phone.trim()}`)
  if (profile.address?.trim()) lines.push(profile.address.trim())
  lines.push('--------------------------------')

  if (doc.customerName.trim()) lines.push(`Customer: ${doc.customerName.trim()}`)
  if (doc.customerPhone.trim()) lines.push(`Phone: ${doc.customerPhone.trim()}`)
  if (doc.customerName.trim() || doc.customerPhone.trim()) {
    lines.push('')
  }

  const partTitle = doc.productName.trim() || '3D Print Job'
  const roundingOrMinDelta = (doc.breakdown.minimumChargeDelta ?? 0) + doc.breakdown.roundedUpBy

  lines.push(`${partTitle} · Filament Cost (${doc.quantity} pcs): ${formatAmount(doc.breakdown.materialCost)} ${currency}`)
  lines.push(`  Material: ${doc.snapshot.filamentName}`)
  if (showSpecs && doc.weightG > 0) {
    lines.push(`  Weight: ${formatAmount(doc.weightG)} g × ${doc.quantity} (${formatAmount(doc.breakdown.totalGrams)} g)`)
  }

  lines.push(`Operation Cost: ${formatAmount(doc.breakdown.operationCost)} ${currency}`)
  if (showSpecs && doc.printHoursPerUnit > 0) {
    lines.push(`  Print time: ${formatHours(doc.printHoursPerUnit)}/pc (${formatHours(doc.breakdown.machineHours)} total)`)
  }

  if (doc.breakdown.cadCost > 0 || doc.snapshot.cadTierName) {
    lines.push(
      `Design (${doc.snapshot.cadTierName || 'CAD'}): ${
        doc.breakdown.cadCost > 0 ? `${formatAmount(doc.breakdown.cadCost)} ${currency}` : 'Free'
      }`,
    )
  }

  for (const line of doc.breakdown.addonLines) {
    lines.push(`${line.name}${line.qty > 1 ? ` × ${line.qty}` : ''}: ${formatAmount(line.amount)} ${currency}`)
  }

  if (roundingOrMinDelta > 0) {
    const label = doc.breakdown.minimumApplied ? 'Minimum Charge Adjustment' : 'Rounding Adjustment'
    lines.push(`${label}: +${formatAmount(roundingOrMinDelta)} ${currency}`)
  }

  if ((doc.breakdown.discountAmount ?? 0) > 0) {
    lines.push(`Discount: -${formatAmount(doc.breakdown.discountAmount ?? 0)} ${currency}`)
  }

  lines.push('--------------------------------')
  lines.push(`TOTAL: ${formatAmount(doc.breakdown.total)} ${currency}`)
  if (doc.quantity > 1) {
    lines.push(`Per piece: ${formatAmount(doc.breakdown.perUnit)} ${currency}`)
  }

  if (doc.notes.trim()) {
    lines.push('')
    lines.push(`Note: ${doc.notes.trim()}`)
  }

  lines.push('')
  lines.push(profile.footerNote?.trim() || 'Thank you for printing with us!')

  return lines.join('\n')
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall through to legacy path.
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

export function canShareText(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

export async function shareText(text: string, title: string): Promise<boolean> {
  if (!canShareText()) return false
  try {
    await navigator.share({ title, text })
    return true
  } catch {
    return false
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const lines: string[] = []
  let current = words[0]
  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate
    } else {
      lines.push(current)
      current = words[i]
    }
  }
  lines.push(current)
  return lines
}

/**
 * Renders a studio-quality high-DPI HTML5 Canvas 2D of the Invoice / Voucher
 * synchronously so iOS WebKit preserves user-gesture activation for saving to Photos.
 */
export function renderVoucherCanvas(
  doc: InvoiceDocument,
  profile: Profile,
  options: VoucherRenderOptions = {},
): HTMLCanvasElement | null {
  const theme = options.theme ?? 'paper'
  const kind = options.kind ?? 'VOUCHER'
  const showSpecs = options.showSpecs ?? true
  const currency = profile.currencySymbol || profile.currencyCode || 'MMK'

  const isDark = theme === 'dark'
  const palette = isDark
    ? {
        outerBg: '#09090b',
        cardBg: '#121216',
        cardBorder: '#27272f',
        surfaceSubtle: '#1a1a20',
        text: '#f4f4f5',
        textSecondary: '#a1a1aa',
        muted: '#71717a',
        accent: '#3b82f6',
        accentSoft: 'rgba(59, 130, 246, 0.16)',
        divider: '#26262e',
        totalBg: '#18181f',
        totalBorder: '#2e2e38',
      }
    : {
        outerBg: '#ececef',
        cardBg: '#ffffff',
        cardBorder: '#e2e2e8',
        surfaceSubtle: '#f6f6f9',
        text: '#111113',
        textSecondary: '#52525b',
        muted: '#71717a',
        accent: '#2563eb',
        accentSoft: 'rgba(37, 99, 235, 0.1)',
        divider: '#e6e6ec',
        totalBg: '#f8f9fc',
        totalBorder: '#dfe3ec',
      }

  const W = 680
  const PAD = 32
  const CARD_X = PAD
  const CARD_W = W - PAD * 2
  const INNER_X = CARD_X + 36
  const INNER_W = CARD_W - 72
  const RIGHT_X = INNER_X + INNER_W

  const fontSans = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif"
  const fontMono = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"

  // Measure dynamic height first
  const dummy = document.createElement('canvas')
  const mctx = dummy.getContext('2d')
  if (!mctx) return null

  mctx.font = `400 13px ${fontSans}`
  const noteLines = doc.notes.trim() ? wrapTextLines(mctx, doc.notes.trim(), INNER_W - 28) : []
  const footerLines = wrapTextLines(
    mctx,
    profile.footerNote?.trim() || 'Thank you for printing with us!',
    INNER_W,
  )

  const hasCustomer = Boolean(doc.customerName.trim() || doc.customerPhone.trim())
  const hasCad = Boolean(doc.breakdown.cadCost > 0 || doc.snapshot.cadTierName)
  const addonCount = doc.breakdown.addonLines.length
  const hasDiscount = (doc.breakdown.discountAmount ?? 0) > 0
  const roundingOrMinDelta = (doc.breakdown.minimumChargeDelta ?? 0) + doc.breakdown.roundedUpBy

  let H = 0
  H += 36 // top card pad
  H += 64 // header block
  H += 24 // divider gap
  if (hasCustomer) {
    H += 68 // customer block
  }
  H += 34 // table header
  H += showSpecs ? 66 : 52 // filament cost row
  H += 56 // operation cost row
  if (hasCad) H += 44
  H += addonCount * 42
  if (roundingOrMinDelta > 0) H += 42
  if (hasDiscount) H += 42
  H += 24 // spacing before total box
  H += showSpecs ? 108 : 84 // total highlight box
  if (noteLines.length > 0) {
    H += 18 + 34 + noteLines.length * 19
  }
  H += 28 + footerLines.length * 18 + 26 // footer
  H += 32 // bottom card pad

  const TOTAL_H = H + PAD * 2
  const SCALE = 2.5

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(W * SCALE)
  canvas.height = Math.round(TOTAL_H * SCALE)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.scale(SCALE, SCALE)

  // Background
  ctx.fillStyle = palette.outerBg
  ctx.fillRect(0, 0, W, TOTAL_H)

  // Card shadow & body
  ctx.save()
  ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.55)' : 'rgba(15, 23, 42, 0.08)'
  ctx.shadowBlur = 28
  ctx.shadowOffsetY = 10
  drawRoundedRect(ctx, CARD_X, PAD, CARD_W, H, 20)
  ctx.fillStyle = palette.cardBg
  ctx.fill()
  ctx.restore()

  drawRoundedRect(ctx, CARD_X, PAD, CARD_W, H, 20)
  ctx.strokeStyle = palette.cardBorder
  ctx.lineWidth = 1
  ctx.stroke()

  let y = PAD + 36

  // Header: Studio Name + Kind Pill
  ctx.fillStyle = palette.text
  ctx.font = `700 22px ${fontSans}`
  ctx.textBaseline = 'top'
  ctx.fillText(profile.studioName || 'PolyCrafy', INNER_X, y)

  // Kind badge on right
  ctx.font = `700 11px ${fontMono}`
  const badgeText = kind.toUpperCase()
  const badgeW = ctx.measureText(badgeText).width + 20
  const badgeH = 24
  drawRoundedRect(ctx, RIGHT_X - badgeW, y, badgeW, badgeH, 6)
  ctx.fillStyle = palette.accentSoft
  ctx.fill()
  ctx.fillStyle = palette.accent
  ctx.textAlign = 'center'
  ctx.fillText(badgeText, RIGHT_X - badgeW / 2, y + 6)
  ctx.textAlign = 'left'

  // Sub-header: Phone / Address on left, Invoice # & Date on right
  const subLeft = [profile.phone.trim(), profile.address?.trim()].filter(Boolean).join(' · ') || '3D Printing Studio'
  ctx.fillStyle = palette.muted
  ctx.font = `400 12.5px ${fontSans}`
  ctx.fillText(subLeft, INNER_X, y + 30)

  const dateObj = new Date(doc.createdAt)
  const dateStr = Number.isNaN(dateObj.getTime())
    ? ''
    : dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const metaRight = [doc.invoiceNo?.trim(), dateStr].filter(Boolean).join(' · ')
  ctx.font = `500 12px ${fontMono}`
  ctx.textAlign = 'right'
  ctx.fillText(metaRight, RIGHT_X, y + 31)
  ctx.textAlign = 'left'

  y += 64

  // Divider
  ctx.strokeStyle = palette.divider
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(INNER_X, y)
  ctx.lineTo(RIGHT_X, y)
  ctx.stroke()
  y += 20

  // Customer section if present
  if (hasCustomer) {
    drawRoundedRect(ctx, INNER_X, y, INNER_W, 52, 10)
    ctx.fillStyle = palette.surfaceSubtle
    ctx.fill()

    ctx.fillStyle = palette.muted
    ctx.font = `600 10px ${fontMono}`
    ctx.fillText('CUSTOMER', INNER_X + 14, y + 10)

    const custLine = [doc.customerName.trim() || 'Walk-in', doc.customerPhone.trim()].filter(Boolean).join('  ·  ')
    ctx.fillStyle = palette.text
    ctx.font = `600 14px ${fontSans}`
    ctx.fillText(custLine, INNER_X + 14, y + 26)

    y += 68
  }

  // Table header
  ctx.fillStyle = palette.muted
  ctx.font = `600 10.5px ${fontMono}`
  ctx.fillText('ITEM / DESCRIPTION', INNER_X, y)
  ctx.textAlign = 'right'
  ctx.fillText('QTY', RIGHT_X - 125, y)
  ctx.fillText(`AMOUNT (${currency})`, RIGHT_X, y)
  ctx.textAlign = 'left'

  y += 20
  ctx.strokeStyle = palette.divider
  ctx.beginPath()
  ctx.moveTo(INNER_X, y)
  ctx.lineTo(RIGHT_X, y)
  ctx.stroke()
  y += 14

  // Row 1: Filament Cost
  const partTitle = `${doc.productName.trim() || '3D Printed Part'} · Filament Cost`

  ctx.fillStyle = palette.text
  ctx.font = `600 15px ${fontSans}`
  ctx.fillText(partTitle, INNER_X, y)

  ctx.font = `500 13.5px ${fontMono}`
  ctx.textAlign = 'right'
  ctx.fillStyle = palette.textSecondary
  ctx.fillText(`${doc.quantity}`, RIGHT_X - 125, y + 1)

  ctx.font = `700 15px ${fontMono}`
  ctx.fillStyle = palette.text
  ctx.fillText(formatAmount(doc.breakdown.materialCost), RIGHT_X, y)
  ctx.textAlign = 'left'

  // Subtitle under filament row
  const matLabel = [
    doc.snapshot.filamentName,
    doc.snapshot.filamentBrand && doc.snapshot.filamentBrand.toLowerCase() !== 'generic'
      ? doc.snapshot.filamentBrand
      : '',
  ]
    .filter(Boolean)
    .join(' · ')

  const specParts = [matLabel]
  if (showSpecs && doc.weightG > 0) {
    specParts.push(`${formatAmount(doc.weightG)}g/pc (${formatAmount(doc.breakdown.totalGrams)}g total)`)
  }

  ctx.fillStyle = palette.muted
  ctx.font = `400 12.5px ${fontSans}`
  ctx.fillText(specParts.join('  ·  '), INNER_X, y + 23)

  y += showSpecs ? 54 : 42

  // Row 2: Operation Cost
  ctx.strokeStyle = palette.divider
  ctx.beginPath()
  ctx.moveTo(INNER_X, y - 8)
  ctx.lineTo(RIGHT_X, y - 8)
  ctx.stroke()

  ctx.fillStyle = palette.text
  ctx.font = `600 14.5px ${fontSans}`
  ctx.fillText('Operation Cost', INNER_X, y + 4)

  const opSubParts = [
    showSpecs && doc.breakdown.machineHours > 0
      ? `Machine & electricity (${formatHours(doc.breakdown.machineHours)})`
      : 'Machine & electricity',
    doc.breakdown.wasteCost > 0 ? 'Waste' : '',
    doc.breakdown.setupCost > 0 ? 'Setup' : '',
  ].filter(Boolean)

  ctx.fillStyle = palette.muted
  ctx.font = `400 12.5px ${fontSans}`
  ctx.fillText(opSubParts.join(' + '), INNER_X, y + 25)

  ctx.textAlign = 'right'
  ctx.fillStyle = palette.textSecondary
  ctx.font = `500 13px ${fontMono}`
  ctx.fillText(
    doc.breakdown.machineHours > 0 ? formatHours(doc.breakdown.machineHours) : '1',
    RIGHT_X - 125,
    y + 5,
  )

  ctx.fillStyle = palette.text
  ctx.font = `700 14.5px ${fontMono}`
  ctx.fillText(formatAmount(doc.breakdown.operationCost), RIGHT_X, y + 4)
  ctx.textAlign = 'left'

  y += 56

  const drawSecondaryRow = (title: string, sub: string, qtyText: string, amountText: string, isDiscount = false) => {
    ctx.strokeStyle = palette.divider
    ctx.beginPath()
    ctx.moveTo(INNER_X, y - 8)
    ctx.lineTo(RIGHT_X, y - 8)
    ctx.stroke()

    ctx.fillStyle = isDiscount ? palette.accent : palette.text
    ctx.font = `500 14px ${fontSans}`
    ctx.fillText(title, INNER_X, y + 4)

    if (sub) {
      const w = ctx.measureText(title).width
      ctx.fillStyle = palette.muted
      ctx.font = `400 12.5px ${fontSans}`
      ctx.fillText(` · ${sub}`, INNER_X + w, y + 5)
    }

    ctx.textAlign = 'right'
    ctx.fillStyle = palette.textSecondary
    ctx.font = `500 13px ${fontMono}`
    ctx.fillText(qtyText, RIGHT_X - 125, y + 5)

    ctx.fillStyle = isDiscount ? palette.accent : palette.text
    ctx.font = `600 14px ${fontMono}`
    ctx.fillText(amountText, RIGHT_X, y + 4)
    ctx.textAlign = 'left'

    y += 42
  }

  if (hasCad) {
    drawSecondaryRow(
      'CAD / Design',
      doc.snapshot.cadTierName || 'Service',
      '1',
      doc.breakdown.cadCost > 0 ? formatAmount(doc.breakdown.cadCost) : 'Free',
    )
  }

  for (const line of doc.breakdown.addonLines) {
    drawSecondaryRow(line.name, '', `${line.qty}`, formatAmount(line.amount))
  }

  if (roundingOrMinDelta > 0) {
    drawSecondaryRow(
      doc.breakdown.minimumApplied ? 'Minimum Charge Adjustment' : 'Rounding Adjustment',
      '',
      '—',
      `+${formatAmount(roundingOrMinDelta)}`,
    )
  }

  if (hasDiscount) {
    drawSecondaryRow('Discount', '', '—', `-${formatAmount(doc.breakdown.discountAmount ?? 0)}`, true)
  }

  y += 12

  // Total Box
  const totalBoxH = showSpecs ? 96 : 74
  drawRoundedRect(ctx, INNER_X, y, INNER_W, totalBoxH, 14)
  ctx.fillStyle = palette.totalBg
  ctx.fill()
  ctx.strokeStyle = palette.totalBorder
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = palette.muted
  ctx.font = `700 11px ${fontMono}`
  ctx.fillText('TOTAL DUE', INNER_X + 18, y + 18)

  if (doc.quantity > 1) {
    ctx.fillStyle = palette.textSecondary
    ctx.font = `500 12px ${fontMono}`
    ctx.fillText(`${formatAmount(doc.breakdown.perUnit)} ${currency} / piece`, INNER_X + 18, y + 38)
  }

  ctx.textAlign = 'right'
  ctx.fillStyle = palette.text
  ctx.font = `800 28px ${fontMono}`
  ctx.fillText(`${formatAmount(doc.breakdown.total)} ${currency}`, RIGHT_X - 18, y + 16)
  ctx.textAlign = 'left'

  if (showSpecs) {
    ctx.strokeStyle = palette.divider
    ctx.beginPath()
    ctx.moveTo(INNER_X + 18, y + 60)
    ctx.lineTo(RIGHT_X - 18, y + 60)
    ctx.stroke()

    const chipSummary = [
      `Weight: ${formatAmount(doc.breakdown.totalGrams)} g`,
      `Print time: ${formatHours(doc.breakdown.machineHours)}`,
    ]
      .filter(Boolean)
      .join('   ·   ')

    ctx.fillStyle = palette.muted
    ctx.font = `500 11.5px ${fontMono}`
    ctx.fillText(chipSummary, INNER_X + 18, y + 71)
  }

  y += totalBoxH + 18

  // Notes section
  if (noteLines.length > 0) {
    const noteBoxH = 30 + noteLines.length * 19
    drawRoundedRect(ctx, INNER_X, y, INNER_W, noteBoxH, 10)
    ctx.fillStyle = palette.surfaceSubtle
    ctx.fill()

    ctx.fillStyle = palette.muted
    ctx.font = `600 10px ${fontMono}`
    ctx.fillText('NOTES', INNER_X + 14, y + 10)

    ctx.fillStyle = palette.textSecondary
    ctx.font = `400 13px ${fontSans}`
    noteLines.forEach((line, idx) => {
      ctx.fillText(line, INNER_X + 14, y + 26 + idx * 19)
    })

    y += noteBoxH + 18
  }

  // Footer
  ctx.textAlign = 'center'
  ctx.fillStyle = palette.textSecondary
  ctx.font = `500 12.5px ${fontSans}`
  footerLines.forEach((line, idx) => {
    ctx.fillText(line, W / 2, y + 6 + idx * 18)
  })

  return canvas
}

export function renderVoucherDataUrl(
  doc: InvoiceDocument,
  profile: Profile,
  options: VoucherRenderOptions = {},
): string | null {
  const canvas = renderVoucherCanvas(doc, profile, options)
  if (!canvas) return null
  return canvas.toDataURL('image/png')
}

export async function renderVoucherBlob(
  doc: InvoiceDocument,
  profile: Profile,
  options: VoucherRenderOptions = {},
): Promise<Blob | null> {
  const canvas = renderVoucherCanvas(doc, profile, options)
  if (!canvas) return null
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 1)
  })
}

function canvasToPngFile(canvas: HTMLCanvasElement, fileName: string): { file: File; dataUrl: string } {
  const dataUrl = canvas.toDataURL('image/png')
  const parts = dataUrl.split(',')
  const bstr = atob(parts[1] ?? '')
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  const file = new File([u8arr], fileName, { type: 'image/png', lastModified: Date.now() })
  return { file, dataUrl }
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function voucherFileName(doc: InvoiceDocument): string {
  const slug = (doc.customerName.trim() || doc.productName.trim() || doc.invoiceNo?.trim() || 'voucher')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
  const date = new Date().toISOString().slice(0, 10)
  return `polycrafy-${slug || 'voucher'}-${date}.png`
}

export type SaveImageResult = 'saved' | 'shared' | 'cancelled' | 'ios-preview' | 'error'

/**
 * Saves the voucher PNG image:
 * - On iOS (iPhone/iPad): Uses `navigator.share({ files: [file] })` with ONLY `{ files }`
 *   so iOS shows "Save Image" (which saves directly to the iOS Photos Gallery instead of
 *   the Files app). If `navigator.share` is unavailable on an iOS webview, returns `'ios-preview'`
 *   so the caller can open a long-press "Save to Photos" image sheet.
 * - On Desktop / Android: Downloads the PNG file directly.
 */
export async function downloadVoucherImage(
  doc: InvoiceDocument,
  profile: Profile,
  options: VoucherRenderOptions = {},
): Promise<SaveImageResult> {
  const canvas = renderVoucherCanvas(doc, profile, options)
  if (!canvas) return 'error'
  const fileName = voucherFileName(doc)

  if (isIosDevice()) {
    try {
      const { file } = canvasToPngFile(canvas, fileName)
      if (canShareFiles() && navigator.canShare({ files: [file] })) {
        // Passing ONLY { files } (without title/text) ensures iOS shows "Save Image" to Photos Gallery
        await navigator.share({ files: [file] })
        return 'shared'
      }
      return 'ios-preview'
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return 'cancelled'
      }
      return 'ios-preview'
    }
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 1))
  if (!blob) return 'error'
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    return 'saved'
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1500)
  }
}

export function canShareFiles(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && typeof navigator.share === 'function'
}

export async function shareVoucherImage(
  doc: InvoiceDocument,
  profile: Profile,
  options: VoucherRenderOptions = {},
): Promise<SaveImageResult> {
  if (!canShareFiles()) return 'error'
  const canvas = renderVoucherCanvas(doc, profile, options)
  if (!canvas) return 'error'
  const { file } = canvasToPngFile(canvas, voucherFileName(doc))
  try {
    if (!navigator.canShare({ files: [file] })) return 'error'
    // On iOS, omit title so iOS treats the payload as a pure image (enables "Save Image" to Photos)
    if (isIosDevice()) {
      await navigator.share({ files: [file] })
    } else {
      await navigator.share({
        title: `${profile.studioName || 'PolyCrafy'} Voucher`,
        files: [file],
      })
    }
    return 'shared'
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return 'cancelled'
    }
    return 'error'
  }
}
