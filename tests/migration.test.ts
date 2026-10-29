import test from 'node:test'
import assert from 'node:assert/strict'
import { buildConfigBundle, mergeConfig, parseConfigFile, parseStoredState } from '../src/lib/validate.ts'
import { createDefaultState } from '../src/lib/defaults.ts'

const legacyState = {
  version: 2,
  profile: { studioName: 'My Shop', phone: '09123456', currencyCode: 'MMK', currencySymbol: 'MMK' },
  rates: {
    electricityPerKWh: 200,
    printerWatts: 500,
    machinePerHour: 800,
    laborPerHour: 3000,
    setupMinutes: 30,
    roundingStep: 1000,
  },
  filaments: [
    { id: 'fil-pla-black', name: 'PLA Standard Black', brand: 'Generic', color: '#23262B', pricePerGram: 175 },
    { id: 'fil-spool-legacy', name: 'PETG Spool', brand: 'eSun', spoolWeightG: 1000, spoolPrice: 48000 },
  ],
  cadTiers: [{ id: 'cad-free', name: 'Free STL', price: 0, note: '' }],
  addons: [{ id: 'add-box', name: 'Cardboard box', price: 2500, category: 'packaging' }],
  preferences: { theme: 'dark', lastFilamentId: 'fil-pla-black' },
}

test('an old settings file loads with the new operation rate fields', () => {
  const state = parseStoredState(JSON.stringify(legacyState))
  assert.equal(state.rates.electricityPerHour, 100)
  assert.equal(state.rates.machinePerHour, 800)
  assert.equal(state.rates.setupFee, 1500)
  assert.equal(state.rates.roundingMode, 'up')
  assert.equal(state.rates.minimumCharge, 0)
})

test('both direct pricePerGram and legacy spoolPrice/spoolWeightG filaments load as pricePerGram', () => {
  const state = parseStoredState(JSON.stringify(legacyState))
  assert.equal(state.filaments[0].pricePerGram, 175)
  assert.equal(state.filaments[1].pricePerGram, 48)
  assert.equal('color' in state.filaments[0], false)
})

test('exported settings bundle can be re-imported and merged cleanly', () => {
  const defaults = createDefaultState()
  const bundle = buildConfigBundle(defaults, defaults.preferences)
  const imported = parseConfigFile(JSON.stringify(bundle))
  assert.equal(imported.profile.studioName, 'PolyCrafy')
  assert.equal(imported.filaments.length, defaults.filaments.length)

  const merged = mergeConfig(defaults, {
    ...imported,
    filaments: [
      ...imported.filaments,
      { id: 'fil-custom-asa', name: 'ASA', brand: 'Polymaker', pricePerGram: 240 },
    ],
  })
  assert.equal(merged.filaments.length, defaults.filaments.length + 1)
})

test('broken storage falls back to defaults instead of crashing', () => {
  const state = parseStoredState('{not json')
  assert.equal(state.filaments.length > 0, true)
  assert.equal(Boolean(state.draft.filamentId), true)
})

test('persisted draft data is restored across page reloads and tab changes', () => {
  const defaults = createDefaultState()
  const withDraft = {
    ...defaults,
    draft: {
      ...defaults.draft,
      customerName: 'Ko Min',
      customerPhone: '09987654321',
      productName: 'Gear Housing',
      weightG: 145,
      quantity: 4,
      printHoursPerUnit: 3.5,
      discount: 1000,
      notes: 'Urgent order',
    },
  }
  const restored = parseStoredState(JSON.stringify(withDraft))
  assert.equal(restored.draft.customerName, 'Ko Min')
  assert.equal(restored.draft.customerPhone, '09987654321')
  assert.equal(restored.draft.productName, 'Gear Housing')
  assert.equal(restored.draft.weightG, 145)
  assert.equal(restored.draft.quantity, 4)
  assert.equal(restored.draft.printHoursPerUnit, 3.5)
  assert.equal(restored.draft.discount, 1000)
  assert.equal(restored.draft.notes, 'Urgent order')
})
