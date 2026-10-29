import { createContext } from 'react'
import type { Route } from './routes.ts'

export interface RouterValue {
  route: Route
  navigate: (to: string) => void
  back: () => void
}

export const RouterContext = createContext<RouterValue>({
  route: { name: 'calculate', param: null, path: '#/calculate' },
  navigate: () => {},
  back: () => {},
})
