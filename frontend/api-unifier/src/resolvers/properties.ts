import type { JsonSchema, MergeContext, MergeResolver, RawJsonSchema, ValueWithOrigins } from '../types'
import { isPossibleRawJsonSchema, MapArray } from '../utils'
import {
  JSON_SCHEMA_PROPERTY_ADDITIONAL_PROPERTIES,
  JSON_SCHEMA_PROPERTY_ALL_OF,
  JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES,
  JSON_SCHEMA_PROPERTY_PROPERTIES,
} from '../rules/jsonschema.const'
import { isObject } from '@netcracker/qubership-apihub-json-crawl'
import { allOrigins, and } from './basic'
import { groupValuesByProperty, jsonSchemaMergeResolver } from './jsonschema'
import { unifyBooleanSchemas } from '../allOf'
import { copyOrigins, resolveOrigins, setOrigins, setOriginsForArray } from '../origins'

export const preparePropertiesForMerge = (itemWithOrigins: ValueWithOrigins<JsonSchema>[], ctx: MergeContext) => {
  const properties: ValueWithOrigins<Record<string, unknown>>[] = []

  for (const thisItemWithOrigins of itemWithOrigins) {
    const thisItem = thisItemWithOrigins.value
    if (!(JSON_SCHEMA_PROPERTY_PROPERTIES in thisItem)) {
      continue
    }
    const schemaProperties = thisItem.properties
    if (!isObject(schemaProperties)) {
      ctx.mergeError?.(itemWithOrigins, 'properties should be an object')
      continue
    }
    const ownProperties = new Set(Object.keys(schemaProperties))
    const additionalPropertiesPerProperty = new MapArray<PropertyKey, ValueWithOrigins<RawJsonSchema>>()
    const patterPropertyPerProperty = new MapArray<PropertyKey, ValueWithOrigins<RawJsonSchema>>()

    // all "properties" should be filtered with "patternProperties"
    // all non-comman properties should be merged with "additionalProperties" schema
    for (const prop of ownProperties.values()) {
      for (const anotherItemWithContext of itemWithOrigins) {
        const anotherItem = anotherItemWithContext.value
        if (anotherItem == thisItem || (isObject(anotherItem.properties) && prop in anotherItem.properties)) { continue }
        if (JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES in anotherItem && isObject(anotherItem.patternProperties)) {
          let anyMath = false
          for (const pattern of Object.keys(anotherItem.patternProperties)) {
            const patternSchema = anotherItem.patternProperties[pattern]
            if (new RegExp(pattern).test(prop) && isPossibleRawJsonSchema(patternSchema)) {
              patterPropertyPerProperty.add(prop, {
                value: patternSchema,
                origins: resolveOrigins(anotherItem.patternProperties, pattern, ctx.options.originsFlag) ?? [],
              })
              anyMath = true
            }
          }
          if (!anyMath) {
            patterPropertyPerProperty.add(prop, {
              value: false,
              origins: resolveOrigins(anotherItem, JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES, ctx.options.originsFlag) ?? [],
            })
          } else {
            continue
          }
        }
        if (JSON_SCHEMA_PROPERTY_ADDITIONAL_PROPERTIES in anotherItem && isPossibleRawJsonSchema(anotherItem.additionalProperties)) {
          additionalPropertiesPerProperty.add(prop, {
            value: anotherItem.additionalProperties,
            origins: resolveOrigins(anotherItem, JSON_SCHEMA_PROPERTY_ADDITIONAL_PROPERTIES, ctx.options.originsFlag) ?? [],
          })
        }
      }
    }

    if (!ownProperties.size) { continue }

    //todo check should we cache this or not
    const props: Record<string, unknown> = {}
    for (const prop of ownProperties.values()) {
      const schemaProperty = schemaProperties[prop]
      const additionalPropertiesWithOrigins = additionalPropertiesPerProperty.get(prop) ?? []
      const patternPropertiesWithOrigins = patterPropertyPerProperty.get(prop) ?? []
      const propOrigins = resolveOrigins(schemaProperties, prop, ctx.options.originsFlag)
      const overallConstraints = [...additionalPropertiesWithOrigins, ...patternPropertiesWithOrigins]
      if (overallConstraints.length !== 0) {
        const allOf = { [JSON_SCHEMA_PROPERTY_ALL_OF]: [schemaProperty, ...overallConstraints.map(valueWithOrigin => valueWithOrigin.value)] }
        const allOfOrigins = allOrigins([{
          value: schemaProperty,
          origins: propOrigins ?? [],
        }, ...overallConstraints])
        setOrigins(allOf, JSON_SCHEMA_PROPERTY_ALL_OF, ctx.options.originsFlag, allOfOrigins)
        setOriginsForArray(allOf[JSON_SCHEMA_PROPERTY_ALL_OF], ctx.options.originsFlag, [propOrigins, ...overallConstraints.map(valueWithOrigin => valueWithOrigin.origins)])
        props[prop] = allOf
      } else {
        props[prop] = schemaProperty
        copyOrigins(schemaProperties, props, prop, prop, ctx.options.originsFlag)
      }
      setOrigins(props, prop, ctx.options.originsFlag, propOrigins)
    }
    properties.push({
      value: props,
      origins: resolveOrigins(thisItem, JSON_SCHEMA_PROPERTY_PROPERTIES, ctx.options.originsFlag) ?? [],
    })
  }
  return properties
}

export const preparePatternPropertiesForMerge = (itemWithOrigins: ValueWithOrigins<JsonSchema>[], ctx: MergeContext) => {
  const patternProperties: ValueWithOrigins<Record<string, unknown>>[] = []
  for (const thisItemWithOrigins of itemWithOrigins) {
    const thisItem = thisItemWithOrigins.value
    if (!(JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES in thisItem)) { continue }
    const thisPatterProperties = thisItem[JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES]
    if (!isObject(thisPatterProperties)) { continue }
    const props: Record<string, unknown> = {}
    for (const pattern of Object.keys(thisPatterProperties)) {
      props[pattern] = thisPatterProperties[pattern]
      copyOrigins(thisPatterProperties, props, pattern, pattern, ctx.options.originsFlag)
    }
    patternProperties.push({
      value: props,
      origins: resolveOrigins(thisItem, JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES, ctx.options.originsFlag) ?? [],
    })
  }

  return patternProperties
}

export const propertiesMergeResolver: MergeResolver<JsonSchema/*cause have preparation*/> = (args, ctx) => {
  const result: Record<string, any> = {}
  const props = groupValuesByProperty(args, ctx.options)
  for (const [prop, itemsWithOrigins] of Object.entries(props)) {
    if (itemsWithOrigins.length > 1) {
      const obj = { [JSON_SCHEMA_PROPERTY_ALL_OF]: itemsWithOrigins.map(item => item.value) }
      const propOrigins = allOrigins(itemsWithOrigins)
      setOrigins(result, prop, ctx.options.originsFlag, propOrigins)
      setOrigins(obj, JSON_SCHEMA_PROPERTY_ALL_OF, ctx.options.originsFlag, propOrigins)
      setOriginsForArray(obj[JSON_SCHEMA_PROPERTY_ALL_OF], ctx.options.originsFlag, itemsWithOrigins.map(item => item.origins))
      result[prop] = obj
    } else {
      const singleton = itemsWithOrigins[0]
      result[prop] = singleton.value
      setOrigins(result, prop, ctx.options.originsFlag, singleton.origins)
    }
  }
  return { value: result, origins: allOrigins(args) }
}

export const additionalPropertiesMergeResolver: MergeResolver<RawJsonSchema> = (args, ctx) => {
  if (args.every(valueWithOrigins => typeof valueWithOrigins.value === 'boolean')) {
    return and(args as ValueWithOrigins<boolean>[], ctx)
  }
  return jsonSchemaMergeResolver(unifyBooleanSchemas(args, ctx.options), ctx)
}
