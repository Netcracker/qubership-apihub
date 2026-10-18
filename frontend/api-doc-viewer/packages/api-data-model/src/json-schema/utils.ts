import { JSON_SCHEMA_PROPERTY_REF } from '@netcracker/qubership-apihub-api-unifier'

import { IModelTreeNode } from '../abstract/model/types'
import { modelTreeNodeType } from "../abstract/constants"
import { isObject } from '../utils'
import { jsonSchemaCommonProps, jsonSchemaNodeTypes, jsonSchemaTypeProps } from './constants'
import type {
  JsonSchemaNodeKind,
  JsonSchemaNodeMeta,
  JsonSchemaNodeType,
  JsonSchemaNodeValue,
  JsonSchemaTreeNode
} from './tree/types'

export const isRequired = (key: string | number, parent: IModelTreeNode<any, any, any> | null): boolean => {
  if (!parent || typeof key === 'number' || !key) {
    return false
  }
  const value = parent?.value()
  return !!value && 'required' in value && Array.isArray(value.required) && value.required.includes(key)
}

export function isBrokenRef(value: unknown): value is Record<typeof JSON_SCHEMA_PROPERTY_REF, unknown> {
  return isObject(value) && JSON_SCHEMA_PROPERTY_REF in value
}

export const isValidType = (maybeType: unknown): maybeType is JsonSchemaNodeType =>
  typeof maybeType === 'string' && jsonSchemaNodeTypes.includes(maybeType as JsonSchemaNodeType)

export function inferTypes(fragment: unknown): JsonSchemaNodeType[] {
  if (typeof fragment !== 'object' || !fragment) {
    return []
  }

  const types: JsonSchemaNodeType[] = []
  for (const type of Object.keys(jsonSchemaTypeProps) as JsonSchemaNodeType[]) {
    const props = jsonSchemaTypeProps[type].slice(jsonSchemaCommonProps.length)
    for (const prop of props) {
      if (prop in fragment) {
        types.push(type)
        break
      }
    }
  }
  return types
}

export const isJsonSchemaTreeNode = (
  node?: IModelTreeNode<JsonSchemaNodeValue<any>, JsonSchemaNodeKind, JsonSchemaNodeMeta>,
): node is JsonSchemaTreeNode<any> => {
  return !!node && node.type === modelTreeNodeType.simple
}

export const isJsonSchemaComplexNode = (
  node?: IModelTreeNode<JsonSchemaNodeValue<any>, JsonSchemaNodeKind, JsonSchemaNodeMeta>,
): node is JsonSchemaTreeNode<any> => {
  return !!node && node.type !== modelTreeNodeType.simple
}

