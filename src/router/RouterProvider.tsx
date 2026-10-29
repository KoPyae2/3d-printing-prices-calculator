import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { RouterContext } from './RouterContext.ts'
import { parsePath, type Route } from './routes.ts'
import { persistNow } from '../store/store.ts'

function currentHash(): string {
  return window.location.hash || '#/calculate'
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => parsePath(currentHash()))

  useEffect(() => {
    const initial = parsePath(currentHash())
    if (window.location.hash !== initial.path) {
      window.history.replaceState(null, '', initial.path)
    }
    setRoute(initial)

    const handleChange = () => {
      setRoute(parsePath(window.location.hash))
    }
    window.addEventListener('hashchange', handleChange)
    window.addEventListener('popstate', handleChange)
    return () => {
      window.removeEventListener('hashchange', handleChange)
      window.removeEventListener('popstate', handleChange)
    }
  }, [])

  const navigate = useCallback((to: string) => {
    persistNow()
    const target = to.startsWith('#') ? to : `#${to.startsWith('/') ? to : `/${to}`}`
    const parsed = parsePath(target)
    if (window.location.hash !== parsed.path) {
      window.history.pushState(null, '', parsed.path)
    }
    setRoute(parsed)
  }, [])

  const back = useCallback(() => {
    persistNow()
    const fallback = parsePath('#/settings')
    window.history.pushState(null, '', fallback.path)
    setRoute(fallback)
  }, [])

  const value = useMemo(() => ({ route, navigate, back }), [route, navigate, back])

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}
