import { useId, type InputHTMLAttributes } from 'react'
import { Field } from './Field.tsx'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string
  value: string
  onChange: (value: string) => void
  hint?: string
  suffix?: string
  error?: string | null
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  suffix,
  error,
  id,
  className,
  ...rest
}: TextFieldProps) {
  const generated = useId()
  const inputId = id ?? generated

  return (
    <Field label={label} htmlFor={inputId} hint={hint} error={error}>
      <div className="input-wrap" data-invalid={error ? 'true' : undefined}>
        <input
          id={inputId}
          className={`input ${className ?? ''}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          {...rest}
        />
        {suffix ? <span className="input-suffix">{suffix}</span> : null}
      </div>
    </Field>
  )
}
