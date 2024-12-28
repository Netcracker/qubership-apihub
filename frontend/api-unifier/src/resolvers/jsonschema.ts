import { preparePatternPropertiesForMerge, preparePropertiesForMerge } from './properties'
import {
  InternalMergeOptions,
  JsonSchema,
  MergeResolver,
  NormalizationRule,
  ValueWithOrigins,
} from '../types'
import { ErrorMessage } from '../errors'
import { getNodeRules, isArray, isObject } from '@netcracker/qubership-apihub-json-crawl'
import { prepareTitleForMerge, RichTitle } from './title'
import {
  JSON_SCHEMA_PROPERTY_ALL_OF,
  JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES,
  JSON_SCHEMA_PROPERTY_PROPERTIES,
  JSON_SCHEMA_PROPERTY_TITLE,
} from '../rules/jsonschema.const'
import { allOrigins, mergeStringSets } from './basic'
import { resolveOrigins, setOrigins } from '../origins'

export const groupValuesByProperty = (records: ValueWithOrigins<Record<PropertyKey, unknown>>[], options: InternalMergeOptions): Record<PropertyKey, ValueWithOrigins<unknown>[]> => {
  const result: Record<PropertyKey, ValueWithOrigins<unknown>[]> = {}

  for (const schemaWithOrigins of records) {
    const schema = schemaWithOrigins.value
    if (!isObject(schema)) {
      continue
    }
    for (const key of Reflect.ownKeys(schema).filter(key => key !== options.originsFlag)) {
      const itemWithOrigins = { value: schema[key], origins: resolveOrigins(schema, key, options.originsFlag) ?? [] }
      if (isArray(result[key])) {
        result[key].push(itemWithOrigins)
      } else {
        result[key] = [itemWithOrigins]
      }
    }
  }
  return result
}

//todo This method doesn't support ORIGINS merge. Fix it before usage
export const dependenciesMergeResolver: MergeResolver<Record<PropertyKey, unknown>> = (args, ctx) => {
  const result: Record<string, unknown> = {}
  const props = groupValuesByProperty(args, ctx.options)

  for (const [prop, itemsWithOrigins] of Object.entries(props)) {
    const items = itemsWithOrigins.map(itemWithOrigin => itemWithOrigin.value)
    const required = items.reduce((r, v) => r && Array.isArray(v), true)
    if (required) {
      result[prop] = mergeStringSets(itemsWithOrigins as ValueWithOrigins<string[]>[], ctx)?.value
    } else {
      const _items = items.map((v) => Array.isArray(v) ? { required: v } : v)
      result[prop] = _items.length > 1 ? { [JSON_SCHEMA_PROPERTY_ALL_OF]: _items } : _items[0]
    }
  }

  return { value: result, origins: [] }
}

export const jsonSchemaMergeResolver: MergeResolver<JsonSchema> = (args, ctx) => {
  const result: Record<PropertyKey, unknown> = {}
  const groupedValues = groupValuesByProperty(args, ctx.options)
  //todo may be in future we should add preprocessing instead of this or more complex logic like in itemsMergeResolver
  if (JSON_SCHEMA_PROPERTY_PROPERTIES in groupedValues) {
    groupedValues.properties = preparePropertiesForMerge(args, ctx)
  }
  if (JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES in groupedValues) {
    groupedValues.patternProperties = preparePatternPropertiesForMerge(args, ctx)
  }
  if (JSON_SCHEMA_PROPERTY_TITLE in groupedValues && ctx.options.syntheticTitleFlag) {
    groupedValues.title = prepareTitleForMerge(args, ctx.options.syntheticTitleFlag, ctx.options)
    delete groupedValues[ctx.options.syntheticTitleFlag]
  }

  for (const [key, valuesWithOrigins] of Object.entries(groupedValues)) {
    if (!valuesWithOrigins.length) { continue }
    const rules = ctx.mergeRules

    //1. this is performase pitfail. 2. not so clear that merge rule CAN'T use path or value during rule resolve, so how we should handle items or type in OAS 3.1 that can be array or single?
    const rule = getNodeRules<NormalizationRule>(rules, key, []/*never mind*/, undefined/*nevermind*/)
    const mergeFunc = rule?.merge

    if (valuesWithOrigins.length === 1) {
      const valueWithOrigins = valuesWithOrigins[0]
      result[key] = valueWithOrigins.value
      setOrigins(result, key, ctx.options.originsFlag, valueWithOrigins.origins)
    } else {
      if (!mergeFunc) {
        throw new Error(ErrorMessage.ruleNotFound(key))
      }
      const merged = mergeFunc(valuesWithOrigins, { ...ctx, allMergeItemsWithOrigins: args })
      if (merged === undefined) {
        ctx.mergeError(valuesWithOrigins, 'undefined after merge')
      } else {
        result[key] = merged.value
        setOrigins(result, key, ctx.options.originsFlag, merged.origins)
      }
    }
  }

  if (JSON_SCHEMA_PROPERTY_TITLE in result && ctx.options.syntheticTitleFlag) {
    const rich = result.title as RichTitle
    result.title = rich.title
    if (rich.synthetic) {
      result[ctx.options.syntheticTitleFlag] = true
    }
  }

  if (ctx.options.inlineRefsFlag && ctx.options.inlineRefsFlag in groupedValues) {
    const refs = groupedValues[ctx.options.inlineRefsFlag]
    const uniqueRefs = refs.flatMap(m => m.value as unknown[]).reduce((r: unknown[], i) => {
      if (!r.includes(i)) {
        r.push(i)
      }
      return r;
    }, [] as unknown[])
    result[ctx.options.inlineRefsFlag] = uniqueRefs
  }

  const origins = ctx.options.originsFlag ? allOrigins(args) : []
  return Object.keys(result).length ? { value: result, origins: origins } : undefined
}
