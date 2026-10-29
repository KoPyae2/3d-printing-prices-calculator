import { useId } from 'react'
import { Field } from './Field.tsx'
import { Icon } from '../icons/Icons.tsx'

export interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps {
  label?: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  hint?: string
}

export function SelectField({ label, value, options, onChange, hint }: SelectFieldProps) {
  const id = useId()
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <div className="select-wrap">
        <select id={id} className="select" value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="select-caret">
          <Icon name="chevronDown" size={16} />
        </span>
      </div>
    </Field>
  )
}
