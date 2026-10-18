import { isObject, JSON_ROOT_KEY, syncClone } from '@netcracker/qubership-apihub-json-crawl'

import {
  DEFAULT_OPTION_LIFT_COMBINERS,
  DEFAULT_OPTION_MERGE_ALL_OF,
  DEFAULT_OPTION_ORIGINS_ALREADY_DEFINED,
  DEFAULT_OPTION_RESOLVE_REF,
  InternalMergeOptions,
  type JsonSchema,
  LiftCombinersOptions,
  MergeAndLiftCombinersState,
  MergeAndLiftCombinersSyncCloneHook,
  MergeError,
  MergeOptions,
  MergeResolver,
  NormalizationRule,
  NormalizationRules,
  RawJsonSchema,
  ResolveOptions,
  ValueWithOrigins,
} from './types'
import { copyDescriptors, isRefNode } from './utils'
import { jsonSchemaMergeResolver } from './resolvers'
import { flattenAllOfItems, isSiblingKeysAreImportant, unifyBooleanSchemas } from './allOf'
import { ErrorMessage } from './errors'
import { resolveSpec, SPEC_TYPE_GRAPH_API } from './spec-type'
import { createCycledJsoHandlerHook } from './cycle-jso'
import { createEvaluationCacheService, createPropertySpreadWithCacheService } from './cache'
import { RULES } from './rules'
import { createLiftCombinersHook } from './lift-combiners'
import { JSON_SCHEMA_PROPERTY_ALL_OF } from './rules/jsonschema.const'
import { createSyntheticMetaDefinitions } from './unifies/meta-types'
import { createSelfOriginsCloneHook, resolveOrigins } from './origins'

export const merge = (value: unknown, options?: MergeOptions & ResolveOptions & LiftCombinersOptions) => {
  const spec = resolveSpec(value)
  if (spec.type === SPEC_TYPE_GRAPH_API){
    return value //cause no need
  }
  const internalMergeOptions = {
    resolveRef: DEFAULT_OPTION_RESOLVE_REF,
    originsAlreadyDefined: DEFAULT_OPTION_ORIGINS_ALREADY_DEFINED,
    mergeAllOf: DEFAULT_OPTION_MERGE_ALL_OF,
    ...options,
    syntheticMetaDefinitions: createSyntheticMetaDefinitions(spec.type, options?.originsFlag),
    evaluationCacheService: createEvaluationCacheService(),
    spreadAllOfCache: createPropertySpreadWithCacheService(JSON_SCHEMA_PROPERTY_ALL_OF),
    liftCombiners: options?.liftCombiners ?? DEFAULT_OPTION_LIFT_COMBINERS,
    ignoreSymbols: new Set([
      ...(options?.originsFlag ? [options.originsFlag] : []),
      ...(options?.inlineRefsFlag ? [options.inlineRefsFlag] : []),
      ...(options?.syntheticTitleFlag ? [options.syntheticTitleFlag] : []),
      ...(options?.syntheticAllOfFlag ? [options.syntheticAllOfFlag] : []),
      ...(options?.ignoreSymbols ? options.ignoreSymbols : []),
    ]),
  } satisfies InternalMergeOptions & LiftCombinersOptions

  const cycledJsoHandlerHook = createCycledJsoHandlerHook<MergeAndLiftCombinersState, NormalizationRule>()
  const liftCombinersHook = createLiftCombinersHook(internalMergeOptions)
  return syncClone(value,
    [
      cycledJsoHandlerHook,
      createAllOfResolverHook(internalMergeOptions),
      cycledJsoHandlerHook,
      ...(internalMergeOptions.liftCombiners ? [liftCombinersHook] : []),
      createSelfOriginsCloneHook(internalMergeOptions.originsFlag),
    ], { rules: RULES[spec.type] || {}, state: { ignoreTreeUnderSymbols: false, selfOriginResolver: () => [] } })
}

const isAllOfMergeRule = (rules?: NormalizationRules): rules is {
  '/allOf': { merge: MergeResolver<unknown> },
  [key: string]: NormalizationRules
} => {
  return !!rules && rules[`/${JSON_SCHEMA_PROPERTY_ALL_OF}`] && ('merge' in rules[`/${JSON_SCHEMA_PROPERTY_ALL_OF}`])
}

const createAllOfResolverHook = (options: InternalMergeOptions): MergeAndLiftCombinersSyncCloneHook => {
  //do not inline cause need to separate hooks in debug
  const allOfResolver: MergeAndLiftCombinersSyncCloneHook = ({ value, key, path, rules, state }) => {

    if (state.ignoreTreeUnderSymbols) {
      return { value }
    }
    const safeKey = key ?? JSON_ROOT_KEY
    if (typeof safeKey === 'symbol' && options.ignoreSymbols.has(safeKey)) {
      return {
        value,
        state: { ...state, ignoreTreeUnderSymbols: true },
      } //set state to ignore next work
    }
    const mergeError: MergeError = (valuesWithOrigins, message = ErrorMessage.mergeError()) => options.onMergeError?.(message, path, valuesWithOrigins.map(valueWithOrigins => valueWithOrigins.value))

    // skip if not object
    if (!isObject(value) || Array.isArray(value)) {
      return { value }
    }

    // check if in current node expected allOf merge rule in rules
    if (!isAllOfMergeRule(rules)) {
      return { value }
    }

    const [allOf, sibling] = options.spreadAllOfCache.spreadOrReuse(value) //todo problem that we loose order and possible that allOf goes BEFORE sibling

    const rawAllOfItemsWithOrigins: ValueWithOrigins<RawJsonSchema>[] = []
    // remove allOf from schema if is wrong type
    if (Array.isArray(allOf)) {
      rawAllOfItemsWithOrigins.push(...allOf.map((item, index) => ({
        value: item,
        origins: resolveOrigins(allOf, index, options.originsFlag) ?? [],
      })))
    }

    if (isSiblingKeysAreImportant(sibling, options)) {
      rawAllOfItemsWithOrigins.push({ value: sibling, origins: state.selfOriginResolver(key) ?? [] })
    }

    if (!rawAllOfItemsWithOrigins.length) {
      return { value: sibling }
    }

    const rawPlainAllOfItemsWithOrigins = flattenAllOfItems(rawAllOfItemsWithOrigins, options)
    const plainAllOfItemsWithOrigins = unifyBooleanSchemas(rawPlainAllOfItemsWithOrigins, options)

    if (plainAllOfItemsWithOrigins.some(valueWithOrigins => isRefNode(valueWithOrigins.value) /*all this refs means broken after resolve-allOf*/)) {
      options.onMergeError?.(ErrorMessage.mergeWithBrokenRef(), path, plainAllOfItemsWithOrigins.map(valueWithOrigins => valueWithOrigins.value))
      return { value }
    }

    const plainAllOfItemsWithOriginsAsKey = plainAllOfItemsWithOrigins.map(pair => pair.value/*origins should be in a key cause same value instance can have different origins*/)
    const resultValue = options.evaluationCacheService.cacheEvaluationResultByFootprint(plainAllOfItemsWithOriginsAsKey, () => {
      let result: JsonSchema | undefined
      if (plainAllOfItemsWithOrigins.length < 2) {
        result = plainAllOfItemsWithOrigins.length ? plainAllOfItemsWithOrigins[0].value : {}
      } else {
        const complexResult = jsonSchemaMergeResolver(plainAllOfItemsWithOrigins, {
          options,
          allMergeItemsWithOrigins: plainAllOfItemsWithOrigins,
          mergeRules: rules,
          mergeError,
        })
        result = complexResult?.value
      }
      return result
    }, {},
      (result, guard) => result && guard ? copyDescriptors(guard, result) : result,
    )
    if (!resultValue) {
      state.node[safeKey] = value
      return { done: true }
    }
    return {
      value: resultValue,
      state: { ...state },
    }
  }
  return allOfResolver
}
