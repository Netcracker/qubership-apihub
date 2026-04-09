const SPECIFICATION_EXTENSION_PREFIX = 'x-'

export type SpecificationExtensionKey = `${typeof SPECIFICATION_EXTENSION_PREFIX}${string}`

export function isSpecificationExtensionKey(value?: string | number | symbol): value is SpecificationExtensionKey {
  if (value === undefined || typeof value === 'symbol') {
    return false
  }

  return (typeof value === 'string' ? value : `${value}`).startsWith(SPECIFICATION_EXTENSION_PREFIX)
}