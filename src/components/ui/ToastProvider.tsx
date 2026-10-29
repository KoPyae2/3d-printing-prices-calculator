import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastTone } from '../../hooks/useToast.ts'
import { Icon } from '../icons/Icons.tsx'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)
  const timers = useRef<number[]>([])

  const show = useCallback((message: string, tone: ToastTone = 'default') => {
    counter.current += 1
    const id = counter.current
    setItems((current) => [...current.slice(-1), { id, message, tone }])
    const timer = window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id))
    }, 2400)
    timers.current.push(timer)
  }, [])

  useEffect(
    () => () => {
      for (const timer of timers.current) window.clearTimeout(timer)
    },
    [],
  )

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-layer" role="status" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className="toast" data-tone={item.tone}>
            <Icon name={item.tone === 'danger' ? 'alert' : item.tone === 'success' ? 'check' : 'info'} size={15} />
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
