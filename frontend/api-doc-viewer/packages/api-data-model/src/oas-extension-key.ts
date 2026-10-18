const OPEN_API_EXTENSION_PREFIX = 'x-'

export type OpenApiExtensionKey = `${typeof OPEN_API_EXTENSION_PREFIX}${string}`

export function isOpenApiExtensionKey(value?: string | number | symbol): value is OpenApiExtensionKey {
  if (value === undefined || typeof value === 'symbol') {
    return false
  }

  return (typeof value === 'string' ? value : `${value}`).startsWith(OPEN_API_EXTENSION_PREFIX)
}