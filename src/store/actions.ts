import { createDefaultState, createDraft } from '../lib/defaults.ts'
import { newId } from '../lib/id.ts'
import type {
  Addon,
  AddonSelection,
  CadTier,
  ConfigPayload,
  Filament,
  Preferences,
  Profile,
  QuoteInput,
  Rates,
} from '../lib/types.ts'
import { setState } from './store.ts'

type Updater<T> = Partial<T>

export function updateProfile(patch: Updater<Profile>): void {
  setState((current) => ({ ...current, profile: { ...current.profile, ...patch } }))
}

export function updateRates(patch: Updater<Rates>): void {
  setState((current) => ({ ...current, rates: { ...current.rates, ...patch } }))
}

export function updatePreferences(patch: Updater<Preferences>): void {
  setState((current) => ({ ...current, preferences: { ...current.preferences, ...patch } }))
}

export function addFilament(input: Omit<Filament, 'id'> & { id?: string }): string {
  const id = input.id ?? newId('fil')
  setState((current) => ({
    ...current,
    filaments: [...current.filaments, { ...input, id }],
    draft: current.draft.filamentId ? current.draft : { ...current.draft, filamentId: id },
  }))
  return id
}

export function updateFilament(id: string, patch: Updater<Filament>): void {
  setState((current) => ({
    ...current,
    filaments: current.filaments.map((item) => (item.id === id ? { ...item, ...patch, id } : item)),
  }))
}

export function removeFilament(id: string): void {
  setState((current) => {
    const remaining = current.filaments.filter((item) => item.id !== id)
    const fallbackId = remaining[0]?.id ?? ''
    return {
      ...current,
      filaments: remaining,
      preferences: {
        ...current.preferences,
        lastFilamentId: current.preferences.lastFilamentId === id ? (fallbackId || null) : current.preferences.lastFilamentId,
      },
      draft:
        current.draft.filamentId === id
          ? { ...current.draft, filamentId: fallbackId }
          : current.draft,
    }
  })
}

export function addCadTier(input: Omit<CadTier, 'id'> & { id?: string }): string {
  const id = input.id ?? newId('cad')
  setState((current) => ({ ...current, cadTiers: [...current.cadTiers, { ...input, id }] }))
  return id
}

export function updateCadTier(id: string, patch: Updater<CadTier>): void {
  setState((current) => ({
    ...current,
    cadTiers: current.cadTiers.map((item) => (item.id === id ? { ...item, ...patch, id } : item)),
  }))
}

export function removeCadTier(id: string): void {
  setState((current) => ({
    ...current,
    cadTiers: current.cadTiers.filter((item) => item.id !== id),
    draft: current.draft.cadTierId === id ? { ...current.draft, cadTierId: null } : current.draft,
  }))
}

export function addAddon(input: Omit<Addon, 'id'> & { id?: string }): string {
  const id = input.id ?? newId('add')
  setState((current) => ({ ...current, addons: [...current.addons, { ...input, id }] }))
  return id
}

export function updateAddon(id: string, patch: Updater<Addon>): void {
  setState((current) => ({
    ...current,
    addons: current.addons.map((item) => (item.id === id ? { ...item, ...patch, id } : item)),
  }))
}

export function removeAddon(id: string): void {
  setState((current) => ({
    ...current,
    addons: current.addons.filter((item) => item.id !== id),
    draft: {
      ...current.draft,
      addons: current.draft.addons.filter((line) => line.addonId !== id),
    },
  }))
}

export function patchDraft(patch: Partial<QuoteInput>): void {
  setState((current) => {
    const nextDraft = { ...current.draft, ...patch }
    const nextLastFilament =
      patch.filamentId && current.filaments.some((f) => f.id === patch.filamentId)
        ? patch.filamentId
        : current.preferences.lastFilamentId
    return {
      ...current,
      draft: nextDraft,
      preferences:
        nextLastFilament !== current.preferences.lastFilamentId
          ? { ...current.preferences, lastFilamentId: nextLastFilament }
          : current.preferences,
    }
  })
}

export function toggleDraftAddon(addonId: string): void {
  setState((current) => {
    const exists = current.draft.addons.some((line) => line.addonId === addonId)
    const addons: AddonSelection[] = exists
      ? current.draft.addons.filter((line) => line.addonId !== addonId)
      : [...current.draft.addons, { addonId, qty: 1 }]
    return {
      ...current,
      draft: { ...current.draft, addons },
    }
  })
}

export function setDraftAddonQty(addonId: string, qty: number): void {
  setState((current) => ({
    ...current,
    draft: {
      ...current.draft,
      addons:
        qty <= 0
          ? current.draft.addons.filter((line) => line.addonId !== addonId)
          : current.draft.addons.map((line) => (line.addonId === addonId ? { ...line, qty } : line)),
    },
  }))
}

export function resetDraft(): void {
  setState((current) => ({
    ...current,
    draft: createDraft(
      current.draft.filamentId || current.preferences.lastFilamentId || current.filaments[0]?.id || null,
    ),
  }))
}

/** Applies an imported settings payload. */
export function applyConfig(payload: ConfigPayload): void {
  setState((current) => {
    const nextFilamentId = payload.filaments.some((item) => item.id === current.preferences.lastFilamentId)
      ? current.preferences.lastFilamentId
      : (payload.filaments[0]?.id ?? null)
    const draftFilamentId = payload.filaments.some((item) => item.id === current.draft.filamentId)
      ? current.draft.filamentId
      : (nextFilamentId ?? '')
    return {
      ...current,
      profile: payload.profile,
      rates: payload.rates,
      filaments: payload.filaments,
      cadTiers: payload.cadTiers,
      addons: payload.addons,
      preferences: {
        ...current.preferences,
        lastFilamentId: nextFilamentId,
      },
      draft: {
        ...current.draft,
        filamentId: draftFilamentId,
      },
    }
  })
}

export function resetEverything(): void {
  const fresh = createDefaultState()
  setState(() => fresh)
}
