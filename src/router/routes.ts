export type RouteName = 'calculate' | 'invoice' | 'settings'

export interface Route {
  name: RouteName
  /** Section under #/settings. */
  param: string | null
  path: string
}

export const SETTINGS_SECTIONS = [
  'rates',
  'filaments',
  'design',
  'addons',
  'studio',
  'appearance',
  'data',
  'about',
] as const

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]

const DEFAULT_ROUTE: Route = { name: 'calculate', param: null, path: '#/calculate' }

export function parsePath(hash: string): Route {
  const clean = (hash || '').replace(/^#/, '').replace(/\/+$/, '')
  const parts = clean.split('/').filter(Boolean).map(decodeURIComponent)

  if (parts.length === 0) return DEFAULT_ROUTE

  switch (parts[0]) {
    case 'calculate':
      return { name: 'calculate', param: null, path: '#/calculate' }
    case 'invoice':
    case 'voucher':
      return { name: 'invoice', param: null, path: '#/invoice' }
    case 'settings': {
      const section = parts[1] && isSettingsSection(parts[1]) ? parts[1] : null
      return {
        name: 'settings',
        param: section,
        path: section ? `#/settings/${section}` : '#/settings',
      }
    }
    default:
      return DEFAULT_ROUTE
  }
}

export function isSettingsSection(value: string): value is SettingsSection {
  return (SETTINGS_SECTIONS as readonly string[]).includes(value)
}

export function settingsPath(section: SettingsSection): string {
  return `#/settings/${section}`
}
