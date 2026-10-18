import { InternalLiftCombinersOptions, UnifyFunction } from '../types'
import { isArray, isObject } from '@netcracker/qubership-apihub-json-crawl'
import { mergeProhibitLiftCombiners } from '../lift-combiners'

import { mergeOrigins } from '../origins'

//todo copy-paste with merge preprocessing. Think about it
export const extractEmptyJsonSchema: UnifyFunction = (jsoOrBoolean, { origins, options }) => {
  if (typeof jsoOrBoolean === 'boolean') {
    return jsoOrBoolean ? options.syntheticMetaDefinitions.emptyJsonSchema(origins) : options.syntheticMetaDefinitions.invertedEmptyJsonSchema(origins)
  }
  if (isObject(jsoOrBoolean) && !isArray(jsoOrBoolean) && Object.keys(jsoOrBoolean).length === 0) {
    return combineJsonSchemaWithMetaJso(jsoOrBoolean, options.syntheticMetaDefinitions.emptyJsonSchema(options.createOriginsForDefaults(origins)), options)
  }
  return jsoOrBoolean
}

export const combineJsonSchemaWithMetaJso: (
  jsonSchema: Record<PropertyKey, unknown>,
  metaJsonSchema: Record<PropertyKey, unknown>,
  opt: InternalLiftCombinersOptions,
) => Record<PropertyKey, unknown> = (jsonSchema, metaJsonSchema, opt) => {
  if (Reflect.ownKeys(jsonSchema).length === 0) {return metaJsonSchema}
  const mergedSchema = {
    ...jsonSchema,
    ...metaJsonSchema,
  }
  mergeOrigins(mergedSchema, [jsonSchema, metaJsonSchema], opt.originsFlag)
  return mergeProhibitLiftCombiners(mergedSchema, opt)
}