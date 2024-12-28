import { ValidateFunction } from '../types'

const TYPE_UNDEFINED = 'undefined' /*null here*/
export const TYPE_OBJECT = 'object'
export const TYPE_ARRAY = 'array'
export const TYPE_BOOLEAN = 'boolean'
export const TYPE_NUMBER = 'number'
export const TYPE_BIGINT = 'bigint'
export const TYPE_STRING = 'string'
export const TYPE_SYMBOL = 'symbol'
export const TYPE_FUNCTION = 'function'
type ValueType =
  typeof TYPE_UNDEFINED
  | typeof TYPE_OBJECT
  | typeof TYPE_ARRAY
  | typeof TYPE_BOOLEAN
  | typeof TYPE_NUMBER
  | typeof TYPE_BIGINT
  | typeof TYPE_STRING
  | typeof TYPE_SYMBOL
  | typeof TYPE_FUNCTION

export function checkType(...expectedTypes: ValueType[]): ValidateFunction {
  const f: ValidateFunction = (value) => {
    let actualType: ValueType = typeof value
    if (actualType === 'object') {
      if (value === null) {
        actualType = TYPE_UNDEFINED
      }
      if (Array.isArray(value)) {
        actualType = TYPE_ARRAY
      }
    }
    return expectedTypes.some(type => actualType === type)
  }
  Object.defineProperty(f, 'name', { value: `checkType: ${expectedTypes.join()}`, writable: false })
  return f
}

export function checkContains(...allowedValues: (string | number)[]): ValidateFunction {
  const f: ValidateFunction = (value) => {
    return allowedValues.some(allowed => allowed === value)
  }
  Object.defineProperty(f, 'name', { value: `checkContains: ${allowedValues.join()}`, writable: false })
  return f
}

export const TYPE_JSON_ANY: ValueType[] = [TYPE_OBJECT, TYPE_ARRAY, TYPE_BOOLEAN, TYPE_NUMBER, TYPE_STRING]

export function checkNotEmptyType(): ValidateFunction {
  const f: ValidateFunction = (value) => {
    if (typeof value === 'string') {
      return value.trim().length > 0
    }
    return value !== undefined
  }
  Object.defineProperty(f, 'name', { value: `checkNotEmptyType`, writable: false })
  return f
}
