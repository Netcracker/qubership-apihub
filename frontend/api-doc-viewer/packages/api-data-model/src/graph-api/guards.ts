import { isObject, isString } from '../utils'
import { schemaNodeTypes } from './constants'
import { GraphSchemaNodeType, graphSchemaNodeTypes, GraphSchemaNodeValue, IGraphSchemaEnumType } from './tree/types'
import { SchemaNodeType } from './tree/schema-types'

export function isSchemaNodeType(type: unknown): type is SchemaNodeType {
  if (!type || !isString(type)) {
    return false
  }
  return schemaNodeTypes.some(schemaNodeType => schemaNodeType === type)
}

export function isGraphApiNodeType(type: unknown): type is GraphSchemaNodeType {
  if (!type || !isString(type)) {
    return false
  }
  return graphSchemaNodeTypes.some(graphSchemaNodeType => graphSchemaNodeType === type)
}

export function isGraphSchemaNodeValue(value: unknown): value is GraphSchemaNodeValue {
  return (
    isObject(value) &&
    'type' in value &&
    graphSchemaNodeTypes.some(type => value.type === type)
  )
}

export function isGraphSchemaNodeEnumValue(value: unknown): value is IGraphSchemaEnumType {
  return isObject(value) && 'type' in value && value.type === 'enum'
}
