import { useId } from 'react'
import { Field } from './Field.tsx'

interface TextAreaProps {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  rows?: number
}

export function TextArea({ label, value, onChange, placeholder, hint, rows = 3 }: TextAreaProps) {
  const id = useId()
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <div className="input-wrap" style={{ alignItems: 'stretch' }}>
        <textarea
          id={id}
          className="input"
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </Field>
  )
}
