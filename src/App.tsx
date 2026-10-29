import type { ComponentType } from 'react'
import { useAppStore } from './store/store.ts'
import { useTheme } from './hooks/useTheme.ts'
import { RouterProvider } from './router/RouterProvider.tsx'
import { useRouter } from './router/useRouter.ts'
import { ToastProvider } from './components/ui/ToastProvider.tsx'
import { TabBar } from './components/layout/TabBar.tsx'
import { PWABadge } from './pwa/PWABadge.tsx'
import { CalculatePage } from './pages/CalculatePage.tsx'
import { InvoicePage } from './pages/InvoicePage.tsx'
import { SettingsPage } from './pages/SettingsPage.tsx'
import { StudioSection } from './pages/settings/StudioSection.tsx'
import { RatesSection } from './pages/settings/RatesSection.tsx'
import { FilamentsSection } from './pages/settings/FilamentsSection.tsx'
import { DesignSection } from './pages/settings/DesignSection.tsx'
import { AddonsSection } from './pages/settings/AddonsSection.tsx'
import { AppearanceSection } from './pages/settings/AppearanceSection.tsx'
import { DataSection } from './pages/settings/DataSection.tsx'
import { AboutSection } from './pages/settings/AboutSection.tsx'
import type { SettingsSection } from './router/routes.ts'

const SectionModules: Record<SettingsSection, ComponentType> = {
  studio: StudioSection,
  rates: RatesSection,
  filaments: FilamentsSection,
  design: DesignSection,
  addons: AddonsSection,
  appearance: AppearanceSection,
  data: DataSection,
  about: AboutSection,
}

function SettingsRoute({ section }: { section: SettingsSection | null }) {
  if (!section) return <SettingsPage />
  const Component = SectionModules[section]
  return <Component />
}

function Screen() {
  const { route } = useRouter()

  return (
    <>
      <div hidden={route.name !== 'calculate'} aria-hidden={route.name !== 'calculate'}>
        <CalculatePage />
      </div>
      <div hidden={route.name !== 'invoice'} aria-hidden={route.name !== 'invoice'}>
        <InvoicePage />
      </div>
      {route.name === 'settings' ? <SettingsRoute section={route.param as SettingsSection | null} /> : null}
    </>
  )
}

function AppShell() {
  const theme = useAppStore((s) => s.preferences.theme)
  useTheme(theme)

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <TabBar />
      <main className="app-body" id="main" tabIndex={-1}>
        <Screen />
      </main>
      <PWABadge />
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <RouterProvider>
        <AppShell />
      </RouterProvider>
    </ToastProvider>
  )
}
