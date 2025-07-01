import { JsonSchemaNodeType } from './tree/types'
import { isString } from '../utils'
import { jsonSchemaNodeTypes } from './constants'

export function isJsonSchemaNodeType(type: unknown): type is JsonSchemaNodeType {
  if (!type || !isString(type)) {
    return false
  }
  return jsonSchemaNodeTypes.some(jsonSchemaNodeType => jsonSchemaNodeType === type)
}

