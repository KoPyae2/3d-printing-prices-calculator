import type { ReactNode } from 'react'
import { IconButton } from '../ui/IconButton.tsx'
import { useRouter } from '../../router/useRouter.ts'
import { Icon } from '../icons/Icons.tsx'

interface PageHeaderProps {
  title: string
  subtitle?: string
  back?: boolean
  backHref?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, back = false, backHref, actions }: PageHeaderProps) {
  const { back: goBack, navigate } = useRouter()

  const handleBack = () => {
    if (backHref) {
      navigate(backHref)
    } else {
      goBack()
    }
  }

  return (
    <header className="page-head">
      {back ? (
        <button type="button" className="back-btn" onClick={handleBack} aria-label="Go back">
          <Icon name="chevronLeft" size={18} />
        </button>
      ) : null}
      <div className="page-head-main">
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-head-actions">{actions}</div> : null}
    </header>
  )
}

export { IconButton }
