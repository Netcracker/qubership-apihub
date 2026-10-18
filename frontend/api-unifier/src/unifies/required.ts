import { OriginLeafs, UnifyFunction } from '../types'
import { isArray, isObject } from '@netcracker/qubership-apihub-json-crawl'
import { isBroken, isPureCombiner } from './type'
import { JSON_SCHEMA_PROPERTY_PROPERTIES, JSON_SCHEMA_PROPERTY_REQUIRED } from '../rules/jsonschema.const'
import { resolveOrigins, setOriginsForArray } from '../origins'

// todo i think this is wrong (but was moved from original library). 
// Cause required can be matched not only with properties. 
// It can be matched with additionalProperties and patternProperties too.
export const unifyJsonSchemaRequired: UnifyFunction = (jso, ctx) => {
  if (!isObject(jso) || isArray(jso)) {
    return jso
  }
  if (isPureCombiner(jso)) {
    return jso
  }
  if (isBroken(jso)) {
    return jso
  }
  if (!(JSON_SCHEMA_PROPERTY_PROPERTIES in jso) || !(JSON_SCHEMA_PROPERTY_REQUIRED in jso)) {
    return jso
  }
  const required = jso[JSON_SCHEMA_PROPERTY_REQUIRED] as string[]
  const existing = new Set(Object.keys(jso[JSON_SCHEMA_PROPERTY_PROPERTIES]))
  const itemOriginsMap = new Map<string, OriginLeafs>()

  const newRequired = required.reduce((aggr, current, currentIndex) => {
    if (!existing.has(current)) {
      return aggr
    }

    const currentOrigins = resolveOrigins(required, currentIndex, ctx.options.originsFlag) ?? []
    const previousOrigins = itemOriginsMap.get(current)
    if (!previousOrigins) {
      aggr.push(current)
    }

    itemOriginsMap.set(current, [...(previousOrigins ?? []), ...currentOrigins])
    return aggr
  }, [] as string[])
  setOriginsForArray(newRequired, ctx.options.originsFlag, newRequired.map(item => itemOriginsMap.get(item)))

  return required.length === newRequired.length ? jso : { ...jso, [JSON_SCHEMA_PROPERTY_REQUIRED]: newRequired }
}
