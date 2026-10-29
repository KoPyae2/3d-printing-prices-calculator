import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateQuote, costPerGram, electricityPerHour, validateQuoteInput } from '../src/lib/pricing.ts'
import { applyRounding, ceilTo, formatHours, hoursFromParts, nearestTo, parseNumber, splitHours } from '../src/lib/money.ts'
import type { Addon, CadTier, Rates } from '../src/lib/types.ts'
import { makeConfig, makeInput } from './helpers.ts'

test('filament returns direct selling price per gram', () => {
  assert.equal(costPerGram({ id: 'f', name: 'PLA+', brand: '', pricePerGram: 200 }), 200)
  assert.equal(costPerGram({ id: 'f', name: 'PLA', brand: '', pricePerGram: 150 }), 150)
  assert.equal(costPerGram(undefined), 0)
  assert.equal(costPerGram({ id: 'f', name: 'PLA', brand: '', pricePerGram: -10 }), 0)
})

test('material cost uses grams times direct per-gram price, with quantity', () => {
  const breakdown = calculateQuote(makeInput({ filamentId: 'f1', weightG: 20, quantity: 3 }), makeConfig())
  assert.equal(breakdown.costPerGram, 200)
  assert.equal(breakdown.totalGrams, 60)
  assert.equal(breakdown.materialCost, 12000)
})

test('waste & failed prints is added into operation cost, keeping filament cost pure', () => {
  const config = makeConfig({ rates: { ...makeConfig().rates, wastePct: 10, electricityPerHour: 0, machinePerHour: 0 } })
  const breakdown = calculateQuote(makeInput({ filamentId: 'f1', weightG: 100, quantity: 1 }), config)
  assert.equal(breakdown.materialCost, 20000)
  assert.equal(breakdown.wasteCost, 2000)
  assert.equal(breakdown.operationCost, 2000)
  assert.equal(breakdown.subtotal, 22000)
})

test('electricity uses direct hourly rate times printing hours', () => {
  const rates: Rates = { ...makeConfig().rates, electricityPerHour: 1000, machinePerHour: 0 }
  assert.equal(electricityPerHour(rates), 1000)
  const breakdown = calculateQuote(makeInput({ printHoursPerUnit: 2, quantity: 2 }), makeConfig({ rates }))
  assert.equal(breakdown.machineHours, 4)
  assert.equal(breakdown.electricityCost, 4000)
})

test('machine wear and electricity both scale with printing hours inside operation cost', () => {
  const rates: Rates = { ...makeConfig().rates, electricityPerHour: 1000, machinePerHour: 1000 }
  const breakdown = calculateQuote(makeInput({ printHoursPerUnit: 2, quantity: 1 }), makeConfig({ rates }))
  assert.equal(breakdown.electricityCost, 2000)
  assert.equal(breakdown.wearCost, 2000)
  assert.equal(breakdown.machineCost, 4000)
  assert.equal(breakdown.operationCost, 4000)
})

test('setup & handling fee is charged once per quote inside operation cost', () => {
  const rates: Rates = { ...makeConfig().rates, setupFee: 1500, electricityPerHour: 0, machinePerHour: 0 }
  const one = calculateQuote(makeInput({ filamentId: 'f1', weightG: 10, quantity: 1 }), makeConfig({ rates }))
  const five = calculateQuote(makeInput({ filamentId: 'f1', weightG: 10, quantity: 5 }), makeConfig({ rates }))
  assert.equal(one.setupCost, 1500)
  assert.equal(five.setupCost, 1500)
  assert.equal(five.operationCost, 1500)
})

test('user example: 100g @ 200/g + 2h @ (1000 elec + 1000 machine) + waste', () => {
  const config = makeConfig({
    rates: {
      ...makeConfig().rates,
      electricityPerHour: 1000,
      machinePerHour: 1000,
      setupFee: 0,
      wastePct: 5,
    },
  })
  const breakdown = calculateQuote(
    makeInput({ filamentId: 'f1', weightG: 100, quantity: 1, printHoursPerUnit: 2 }),
    config,
  )
  // Filament = 100g * 200 = 20,000
  assert.equal(breakdown.materialCost, 20000)
  // Machine & electricity = 2h * (1000 + 1000) = 4,000
  assert.equal(breakdown.machineCost, 4000)
  // Waste = 5% of 20,000 = 1,000
  assert.equal(breakdown.wasteCost, 1000)
  // Operation cost = 4,000 + 1,000 + 0 = 5,000
  assert.equal(breakdown.operationCost, 5000)
  // Total = 25,000
  assert.equal(breakdown.subtotal, 25000)
  assert.equal(breakdown.total, 25000)
})

test('the minimum charge lifts a cheap job and reports the difference', () => {
  const config = makeConfig({ rates: { ...makeConfig().rates, minimumCharge: 5000, setupFee: 500 } })
  const cheap = calculateQuote(makeInput({ filamentId: 'f1', weightG: 10 }), config)
  assert.equal(cheap.minimumApplied, true)
  assert.equal(cheap.rawTotal, 5000)
  // 2000 of filament + 500 of setup = 2500, lifted to the 5,000 minimum (+2500).
  assert.equal(cheap.minimumChargeDelta, 2500)
  const empty = calculateQuote(makeInput(), config)
  assert.equal(empty.minimumApplied, false)
  assert.equal(empty.total, 0)
})

test('add-ons charge price times quantity and ignore unknown or zero lines', () => {
  const addons: Addon[] = [
    { id: 'a1', name: 'Box', price: 1500, category: 'packaging' },
    { id: 'a2', name: 'Wrap', price: 1000, category: 'packaging' },
  ]
  const breakdown = calculateQuote(
    makeInput({ addons: [{ addonId: 'a1', qty: 2 }, { addonId: 'a2', qty: 0 }, { addonId: 'missing', qty: 3 }] }),
    makeConfig({ addons }),
  )
  assert.equal(breakdown.addonsCost, 3000)
  assert.equal(breakdown.addonLines.length, 1)
})

test('free design tier adds nothing, paid tier adds its fee once', () => {
  const cadTiers: CadTier[] = [
    { id: 'c0', name: 'Free STL', price: 0, note: '' },
    { id: 'c1', name: 'Simple design', price: 15000, note: '' },
  ]
  const config = makeConfig({ cadTiers })
  assert.equal(calculateQuote(makeInput({ cadTierId: 'c0' }), config).cadCost, 0)
  assert.equal(calculateQuote(makeInput({ cadTierId: 'c1', quantity: 5 }), config).cadCost, 15000)
})

test('rounding supports up, nearest and exact', () => {
  assert.equal(ceilTo(1000, 500), 1000)
  assert.equal(ceilTo(1001, 500), 1500)
  assert.equal(nearestTo(1249, 500), 1000)
  assert.equal(nearestTo(1250, 500), 1500)
  assert.equal(applyRounding(1200, 500, 'up'), 1500)
  assert.equal(applyRounding(1200, 500, 'nearest'), 1000)
  assert.equal(applyRounding(1200, 500, 'exact'), 1200)
  assert.equal(applyRounding(0, 500, 'up'), 0)
})

test('a full quote adds up and reports price per gram', () => {
  const config = makeConfig({
    rates: {
      ...makeConfig().rates,
      electricityPerHour: 1000,
      machinePerHour: 1000,
      setupFee: 1000,
      wastePct: 5,
      roundingStep: 500,
      roundingMode: 'up',
    },
  })
  const breakdown = calculateQuote(
    makeInput({ filamentId: 'f1', weightG: 100, quantity: 2, printHoursPerUnit: 1.5 }),
    config,
  )
  // filament: 200 g x 200 = 40,000
  // machine & electricity: 3 h x (1000 + 1000) = 6,000
  // waste: 5% of 40,000 = 2,000
  // setup: 1,000
  // operationCost = 6,000 + 2,000 + 1,000 = 9,000
  assert.equal(breakdown.materialCost, 40000)
  assert.equal(breakdown.machineCost, 6000)
  assert.equal(breakdown.wasteCost, 2000)
  assert.equal(breakdown.setupCost, 1000)
  assert.equal(breakdown.operationCost, 9000)
  assert.equal(breakdown.subtotal, 49000)
  assert.equal(breakdown.rawTotal, 49000)
  assert.equal(breakdown.total, 49000)
  assert.equal(breakdown.perUnit, 24500)
  assert.equal(breakdown.pricePerGram, 245)
})

test('an empty quote costs nothing, not even setup fee', () => {
  const breakdown = calculateQuote(makeInput(), makeConfig({ rates: { ...makeConfig().rates, setupFee: 2000 } }))
  assert.equal(breakdown.setupCost, 0)
  assert.equal(breakdown.operationCost, 0)
  assert.equal(breakdown.rawTotal, 0)
  assert.equal(breakdown.total, 0)
  assert.equal(Number.isNaN(breakdown.perUnit), false)
  assert.equal(Number.isNaN(breakdown.pricePerGram), false)
})

test('validation requires filament, weight and quantity', () => {
  const config = makeConfig()
  assert.equal(validateQuoteInput(makeInput(), config.filaments), 'Choose a filament first.')
  assert.equal(validateQuoteInput(makeInput({ filamentId: 'f1', weightG: 0 }), config.filaments), 'Enter the part weight in grams.')
  assert.equal(validateQuoteInput(makeInput({ filamentId: 'f1', weightG: 5, quantity: 0 }), config.filaments), 'Quantity must be at least 1.')
  assert.equal(validateQuoteInput(makeInput({ filamentId: 'f1', weightG: 5, quantity: 1 }), config.filaments), null)
})

test('number parsing tolerates separators and partial input', () => {
  assert.equal(parseNumber('1,250'), 1250)
  assert.equal(parseNumber('12.'), 12)
  assert.equal(parseNumber(''), 0)
  assert.equal(parseNumber('abc'), 0)
})

test('hours split and recombine without losing minutes', () => {
  assert.deepEqual(splitHours(2.5), { h: '2', m: '30' })
  assert.equal(hoursFromParts('2', '30'), 2.5)
  assert.equal(hoursFromParts('', '45'), 0.75)
  assert.equal(formatHours(2.5), '2h 30m')
  assert.equal(formatHours(0), '0m')
})
