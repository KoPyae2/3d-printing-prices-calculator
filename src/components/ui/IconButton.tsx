import type { ButtonHTMLAttributes } from 'react'
import { Icon, type IconName } from '../icons/Icons.tsx'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  name: IconName
  label: string
  size?: number
  small?: boolean
  danger?: boolean
}

export function IconButton({ name, label, size = 20, small, danger, className, type = 'button', ...rest }: IconButtonProps) {
  const classes = ['icon-btn', small ? 'icon-btn-sm' : '', danger ? 'icon-btn-danger' : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} aria-label={label} title={label} {...rest}>
      <Icon name={name} size={size} />
    </button>
  )
}
