import { unwrapAnyType, unwrapNothingType, wrapBySingletonCombiner } from './jsonSchema.utils'
import type { AdapterContext, AdapterResolver } from '../types'
import { isObject } from '../utils'
import {
  JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY,
  JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING,
  JSON_SCHEMA_PROPERTY_ANY_OF,
  JSON_SCHEMA_PROPERTY_ONE_OF,
  JSON_SCHEMA_PROPERTY_TYPE,
} from '@netcracker/qubership-apihub-api-unifier'
import { NativeAnySchemaFactory } from './jsonSchema.types'

export const jsonSchemaAdapter: (factory: NativeAnySchemaFactory) => AdapterResolver = (factory) => (value, reference, ctx) => {
  if (!isObject(value) || !isObject(reference)) { return value }
  let newValue = value
  const valueContext = ctx as AdapterContext<typeof newValue>
  for (const combiner of [JSON_SCHEMA_PROPERTY_ONE_OF, JSON_SCHEMA_PROPERTY_ANY_OF] as const) {
    if (!(combiner in newValue) && combiner in reference) {
      const type = newValue[JSON_SCHEMA_PROPERTY_TYPE]

      switch (type) {
        case JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY: {
          newValue = unwrapAnyType(newValue, combiner, valueContext, factory)
          break
        }
        case JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING: {
          newValue = unwrapNothingType(newValue, combiner, valueContext)
          break
        }
        default:
          newValue = wrapBySingletonCombiner(newValue, combiner, valueContext)
          break
      }
    }
  }
  //todo add more transformation to compare items: {...} vs items: [...]. Don't forget about additionalValues when we start support OAS 3.1
  return newValue
}
