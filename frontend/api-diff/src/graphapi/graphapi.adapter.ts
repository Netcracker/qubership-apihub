import { isArray } from '@netcracker/qubership-apihub-json-crawl'
import type { AdapterContext, AdapterResolver } from '../types'
import { isObject } from '../utils'
import { wrapBySingletonUnion } from './graphapi.utils'
import { GRAPH_API_NODE_KIND_UNION } from '@netcracker/qubership-apihub-graphapi'

export const graphApiSchemaAdapter: AdapterResolver = (value, reference, ctx) => {
  if (!isObject(value) || !isObject(reference)) { return value }
  let newValue = value
  const valueContext = ctx as AdapterContext<typeof newValue>
  const { type: valueType } = newValue
  const { type: referenceType } = reference
  if (!isObject(valueType) || !isObject(referenceType)) {
    return value
  }
  const { kind: valueKind } = valueType
  const { kind: referenceKind } = referenceType
  if (valueKind !== referenceKind && referenceKind === GRAPH_API_NODE_KIND_UNION) {
    newValue = wrapBySingletonUnion(newValue, valueContext)
  }
  return newValue
}

export const removeNotCorrectlySupportedInterfacesAdapter: AdapterResolver = (value, _, ctx) => {
  if (!isArray(value)) {
    return value
  }
  return ctx.transformer(value, 'to-empty-array', () => [])
}
