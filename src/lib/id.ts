let counter = 0

/** Stable-enough unique id that also works in non-secure contexts. */
export function newId(prefix = 'id'): string {
  counter += 1
  const cryptoObj = globalThis.crypto
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return `${prefix}-${cryptoObj.randomUUID()}`
  }
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}-${Date.now().toString(36)}-${counter}-${random}`
}
