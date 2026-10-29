import type { ReactNode } from 'react'
import { PageHeader } from '../../components/layout/PageHeader.tsx'

interface SettingsSectionLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  actions?: ReactNode
}

/** Shared frame for every settings sub-page: back button, title, content. */
export function SettingsSectionLayout({ title, subtitle, children, actions }: SettingsSectionLayoutProps) {
  return (
    <div className="studio-page settings-subpage">
      <PageHeader title={title} subtitle={subtitle} back backHref="#/settings" actions={actions} />
      <div className="stack">{children}</div>
    </div>
  )
}
