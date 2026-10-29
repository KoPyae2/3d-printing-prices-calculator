import { useRef, useSyncExternalStore } from 'react'
import type { AppState } from '../lib/types.ts'
import { createDefaultState } from '../lib/defaults.ts'
import { parseStoredState } from '../lib/validate.ts'

const STORAGE_KEY = 'polycrafy.state.v2'
const WRITE_DELAY_MS = 150

type Listener = () => void

const listeners = new Set<Listener>()
let state: AppState = loadInitial()
let writeTimer: ReturnType<typeof setTimeout> | null = null
let persistErrorHandler: ((message: string) => void) | null = null

function loadInitial(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultState()
    return parseStoredState(raw)
  } catch {
    return createDefaultState()
  }
}

export function getState(): AppState {
  return state
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notify(): void {
  for (const listener of listeners) listener()
}

/** Replaces state with the result of the updater and persists it shortly after. */
export function setState(updater: (current: AppState) => AppState): void {
  const next = updater(state)
  if (next === state) return
  state = next
  notify()
  schedulePersist()
}

function schedulePersist(): void {
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = setTimeout(persistNow, WRITE_DELAY_MS)
}

/** Writes immediately; used on page hide so nothing is lost when the tab closes or refreshes. */
export function persistNow(): void {
  if (writeTimer) {
    clearTimeout(writeTimer)
    writeTimer = null
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    persistErrorHandler?.('Could not save locally. Storage may be full or blocked.')
  }
}

export function setPersistErrorHandler(handler: ((message: string) => void) | null): void {
  persistErrorHandler = handler
}

/**
 * Reads a slice of the store. The selector must return a stable reference or a
 * primitive; the result is cached per state object so identity is preserved
 * between renders, which keeps useSyncExternalStore happy.
 */
export function useAppStore<T>(select: (snapshot: AppState) => T): T {
  const snapshot = useSyncExternalStore(subscribe, getState, getState)
  const cache = useRef<{ source: AppState; value: T } | null>(null)
  if (!cache.current || cache.current.source !== snapshot) {
    cache.current = { source: snapshot, value: select(snapshot) }
  }
  return cache.current.value
}
