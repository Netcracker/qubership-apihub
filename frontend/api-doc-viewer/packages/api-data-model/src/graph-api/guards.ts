import { isObject, isString } from '../utils'
import { GraphSchemaNodeType, graphSchemaNodeTypes, GraphSchemaNodeValue, IGraphSchemaEnumType } from './tree/types'

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
