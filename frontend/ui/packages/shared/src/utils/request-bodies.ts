import { deepEqual } from 'fast-equals'

export function getOptionalBody(obj: object): object | undefined {
  Object.keys(obj).forEach((key) => {
    if (obj[key as keyof typeof obj] && typeof obj[key as keyof typeof obj] === 'object') {
      const childObject = getOptionalBody(obj[key as keyof typeof obj])
      if (childObject === undefined) {
        delete obj[key as keyof typeof obj]
      }
    } else if (obj[key as keyof typeof obj] === '' || obj[key as keyof typeof obj] === null || obj[key as keyof typeof obj] === undefined) {
      delete obj[key as keyof typeof obj]
    }
  })

  return Object.keys(obj).length > 0 || obj instanceof Array ? obj : undefined
}

export function getPatchedBody(value: unknown, oldValue: unknown): unknown {
  if (!value || !oldValue) {
    return value
  }

  const updatedFields = {}
  for (const field of Object.keys(value)) {
    const currentValue = (value as never)?.[field]
    const previousValue = (oldValue as never)?.[field]
    if (Array.isArray(currentValue)) {
      // JSON-Patch approach for arrays is not applicable.
      if (!deepEqual(currentValue, previousValue)) {
        Reflect.set(updatedFields, field, currentValue)
      }
    } else if (typeof currentValue === 'object') {
      const diffObject = getPatchedBody(currentValue, previousValue)
      diffObject && Object.keys(diffObject).length && Reflect.set(updatedFields, field, diffObject)
    } else if (currentValue !== previousValue) {
      Reflect.set(updatedFields, field, currentValue)
    }
  }
  return updatedFields
}
