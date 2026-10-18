import { JSONSchema7 } from 'json-schema'
import { hashCode } from './string'
import { getOriginalObject } from './ref-resolving'

export function schemaHashCode(schema: JSONSchema7): number {
  return hashCode(JSON.stringify(getOriginalObject(schema)))
}
