export function getFirstKey(object: object): string | undefined {
  const [key] = Object.keys(object)
  return key
}

export function takeIf(value: object, condition: boolean): object {
  return {
    ...(condition ? value : {}),
  }
}

export function takeIfDefined(value: object): object {
  const [propertyValue] = Object.values(value)
  const valueIsNotDefined = !value ||
    propertyValue === undefined ||
    propertyValue === null ||
    propertyValue === ''

  return {
    ...takeIf(value, !valueIsNotDefined),
  }
}

export function isObject(obj: unknown): obj is Record<PropertyKey, unknown> {
  return typeof obj === 'object' && obj !== null
}
