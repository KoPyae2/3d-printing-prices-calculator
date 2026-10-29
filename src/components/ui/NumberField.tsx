import { useEffect, useId, useRef, useState } from 'react'
import { clamp, parseNumber } from '../../lib/money.ts'
import { Field } from './Field.tsx'

interface NumberFieldProps {
  label?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
  placeholder?: string
  hint?: string
  error?: string | null
  integer?: boolean
  autoFocus?: boolean
  inputMode?: 'decimal' | 'numeric'
}

function toRaw(value: number): string {
  if (!Number.isFinite(value) || value === 0) return ''
  return String(value)
}

/**
 * Numeric input that keeps exactly what the user typed while focused, so a
 * trailing "." or an empty field never snaps back mid-edit.
 */
export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 1_000_000_000,
  step = 1,
  suffix,
  placeholder,
  hint,
  error,
  integer = false,
  autoFocus = false,
  inputMode = 'decimal',
}: NumberFieldProps) {
  const id = useId()
  const [raw, setRaw] = useState(() => toRaw(value))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setRaw(toRaw(value))
  }, [value])

  const commit = (next: string) => {
    setRaw(next)
    const parsed = parseNumber(next)
    onChange(clamp(integer ? Math.round(parsed) : parsed, min, max))
  }

  const blur = () => {
    focused.current = false
    const parsed = clamp(integer ? Math.round(parseNumber(raw)) : parseNumber(raw), min, max)
    setRaw(toRaw(parsed))
    onChange(parsed)
  }

  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <div className="input-wrap" data-invalid={error ? 'true' : undefined}>
        <input
          id={id}
          className="input"
          inputMode={inputMode}
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={placeholder}
          step={step}
          value={raw}
          onFocus={() => {
            focused.current = true
          }}
          onChange={(event) => commit(event.target.value)}
          onBlur={blur}
        />
        {suffix ? <span className="input-suffix">{suffix}</span> : null}
      </div>
    </Field>
  )
}
