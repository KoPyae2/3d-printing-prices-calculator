import { useEffect, useState } from 'react'
import type { ThemePreference } from '../lib/types.ts'

const THEME_COLOR: Record<'dark' | 'light', string> = {
  dark: '#0a0a0b',
  light: '#f7f7f9',
}

function systemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/**
 * Applies the theme preference to <html> and keeps the browser chrome colour
 * in sync. "system" follows the OS and reacts to changes live.
 */
export function useTheme(preference: ThemePreference): 'dark' | 'light' {
  const [system, setSystem] = useState<'dark' | 'light'>(systemTheme)
  const resolved = preference === 'system' ? system : preference

  useEffect(() => {
    if (!window.matchMedia) return
    const query = window.matchMedia('(prefers-color-scheme: light)')
    const listener = (event: MediaQueryListEvent) => setSystem(event.matches ? 'light' : 'dark')
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', resolved)
    root.style.colorScheme = resolved
    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'theme-color')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', THEME_COLOR[resolved])
  }, [resolved])

  return resolved
}
