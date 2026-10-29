import { useContext } from 'react'
import { RouterContext } from './RouterContext.ts'

export function useRouter() {
  return useContext(RouterContext)
}
