import type { MergeResolver, RawJsonSchema, ValueWithOrigins } from '../types'
import { isPossibleRawJsonSchema, MapArray } from '../utils'
import {
  JSON_SCHEMA_PROPERTY_ADDITIONAL_ITEMS,
  JSON_SCHEMA_PROPERTY_ALL_OF,
  JSON_SCHEMA_PROPERTY_ITEMS,
} from '../rules/jsonschema.const'
import { unifyBooleanSchemas } from '../allOf'
import { and } from './basic'
import { isArray } from '@netcracker/qubership-apihub-json-crawl'
import { jsonSchemaMergeResolver } from './jsonschema'

export const itemsMergeResolver: MergeResolver<RawJsonSchema | RawJsonSchema[]> = (args, ctx) => {
  // if all "items" are not array, merge items as JsonSchema
  const haveArrayItems = args.some(v => Array.isArray(v.value))
  if (!haveArrayItems) { return jsonSchemaMergeResolver(unifyBooleanSchemas(args as ValueWithOrigins<RawJsonSchema>[], ctx.options), ctx) }

  //todo OAS 3.1. origins

  // if any of "items" is array, additionalItems should also be merged with "items"
  const mergeItems: unknown[] = []
  // limit for items length in case of "items" is array and "additionalItems" is false
  let itemsLimit = Infinity
  let maxItemsLength = 0

  // map of additionalItems schemas required for 
  const additionalItemsSchema = new MapArray<number, any>()

  for (const objWithOrigins of ctx.allMergeItemsWithOrigins) {
    const obj = objWithOrigins.value
    // Schema from additionalItems should be merged with all "items" 
    // with index greater then length of "items" in current schema
    // "additionalItems" should be ignored if no "items" in current schema or "items" in object
    if (JSON_SCHEMA_PROPERTY_ADDITIONAL_ITEMS in obj && obj.additionalItems && JSON_SCHEMA_PROPERTY_ITEMS in obj && Array.isArray(obj.items)) {
      additionalItemsSchema.add(obj.items.length, obj.additionalItems)
    }

    if (!(JSON_SCHEMA_PROPERTY_ITEMS in obj)) { continue }
    mergeItems.push(obj.items)

    // set max items length and limit
    if (Array.isArray(obj.items)) {
      maxItemsLength = Math.max(maxItemsLength, obj.items.length)
      if (JSON_SCHEMA_PROPERTY_ADDITIONAL_ITEMS in obj && obj.additionalItems === false) {
        itemsLimit = Math.min(itemsLimit, obj.items.length)
      }
    }
  }

  const len = Math.min(maxItemsLength, itemsLimit)
  const items = [...Array(len)].map(() => ({ [JSON_SCHEMA_PROPERTY_ALL_OF]: [] as unknown[] }))

  // "items" of array type should be merged with additionalItems schema if 
  for (const item of mergeItems) {
    if (!Array.isArray(item)) {
      // merge schema from object "items" with all array "items"
      items.forEach(({ allOf }) => allOf.push(item))
      continue
    }

    for (let j = 0; j < len; j++) {
      const allOf = []
      // copy all additionalItems schemas for merge via allOf
      for (let k = 0; k <= j; k++) {
        additionalItemsSchema.has(k) && allOf.push(...additionalItemsSchema.get(k)!)
      }

      if (j < item.length) {
        // merge existing items with additionals schemas if needed
        items[j].allOf.push(allOf.length ? { ...item[j], allOf } : item[j])
      } else {
        // add new schemas to "items" if itemsLimit > items.length
        items[j].allOf.push(allOf.length ? { allOf } : true)
      }
    }
  }
  return { value: items, origins: [] }
}

export const additionalItemsMergeResolver: MergeResolver<RawJsonSchema> = (_, ctx) => {
  let additionalItems: ValueWithOrigins<RawJsonSchema>[] = []
  const itemsSchema: ValueWithOrigins<RawJsonSchema>[] = []
  //todo OAS 3.1. origins
  //todo OAS 3.1. boolean schema
  // "additionalItems" schema should be merged with object "items" schemas
  for (const objWithOrigins of ctx.allMergeItemsWithOrigins) {
    const obj = objWithOrigins.value
    // store object "items"
    if (JSON_SCHEMA_PROPERTY_ITEMS in obj && !isArray(obj.items) && isPossibleRawJsonSchema(obj.items)) {
      itemsSchema.push({ value: obj.items, origins: [] })
    }

    // ignore "additionalItems" if "items" is not array
    if (
      !(JSON_SCHEMA_PROPERTY_ADDITIONAL_ITEMS in obj)
      || !(JSON_SCHEMA_PROPERTY_ITEMS in obj)
      || !Array.isArray(obj.items)
      || !isPossibleRawJsonSchema(obj.additionalItems)
    ) { continue }
    additionalItems.push({ value: obj.additionalItems, origins: [] })
  }

  // merge "items" schemas to "additionalItems" via allOf
  if (itemsSchema.length) {
    //no tests for that!!!!
    additionalItems = additionalItems.map(itemWithContext => ({
      value: {
        [JSON_SCHEMA_PROPERTY_ALL_OF]:
          [itemWithContext.value, ...itemsSchema.map(valueWithContext => valueWithContext.value)],
      },
      origins: [],
    }))
    //additionalItems.forEach((item) => item.allOf = itemsSchema)
  }

  if (additionalItems.every(valueWithOrigins => typeof valueWithOrigins.value === 'boolean')) {
    return and(additionalItems as ValueWithOrigins<boolean>[], ctx)
  }

  return jsonSchemaMergeResolver(unifyBooleanSchemas(additionalItems, ctx.options), ctx)
}
