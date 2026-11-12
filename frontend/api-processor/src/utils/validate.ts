import Ajv, { ErrorObject, ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'
import { loadYaml } from '@netcracker/qubership-apihub-api-unifier'

const ajv = new Ajv({ strict: false })
addFormats(ajv)

const validateFunctions = new WeakMap<object, ValidateFunction>()

export const validateDocument = (schema: any, data: any): ErrorObject[] => {
  if (!validateFunctions.has(schema)) {
    validateFunctions.set(schema, ajv.compile(schema))
  }
  const validate = validateFunctions.get(schema)!
  try {
    validate(data)
    return [...validate.errors || []]
  } catch (error) {
    return [error as any]
  }
}

export function isJson(value: string): boolean {
  try {
    JSON.parse(value)
  } catch (e) {
    return false
  }
  return true
}

export function isYaml(value: string): boolean {
  try {
    loadYaml(value)
  } catch (e) {
    return false
  }
  return true
}
