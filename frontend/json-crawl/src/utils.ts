export const isObject = (value: unknown): value is Record<PropertyKey, any> => typeof value === 'object' && value !== null

export const isArray = (value: unknown): value is Array<any> => Array.isArray(value)

const PURE_ARRAY_KEYS = new Set(Reflect.ownKeys([]))

//[...context.value.keys()] - wrong way cause in doesn't contain symbols for object and include indexed in speared array
//[context.value.map((_, i) => i).filter(() => true)] - wrong way cause in doesn't contain negative values in array
export const anyArrayKeys: (ar: unknown[]) => PropertyKey[] = (ar) => Reflect.ownKeys(ar).flatMap<PropertyKey>(value => {
  switch (typeof value) {
    case 'string':
      if (PURE_ARRAY_KEYS.has(value)) {
        return []
      }
      const tryNumber = +value
      return isNaN(tryNumber) ? [value] : [tryNumber]
    case 'symbol':
      return [value]
    default:
      return []
  }
})
