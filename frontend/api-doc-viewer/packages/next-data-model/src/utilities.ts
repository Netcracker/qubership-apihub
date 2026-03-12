export function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isObjectWithStringKeys(value: unknown): value is Record<string, unknown> {
  return isObject(value) && Object.keys(value).every(key => typeof key === 'string')
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number'
}

export function isString(value: unknown): value is string {
  return typeof value === 'string'
}
