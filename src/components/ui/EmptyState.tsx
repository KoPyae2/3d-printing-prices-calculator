import type { ReactNode } from 'react'
import { Icon, type IconName } from '../icons/Icons.tsx'

interface EmptyStateProps {
  icon: IconName
  title: string
  text: string
  action?: ReactNode
}

export function EmptyState({ icon, title, text, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={24} />
      </div>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-text">{text}</p>
      {action}
    </div>
  )
}
