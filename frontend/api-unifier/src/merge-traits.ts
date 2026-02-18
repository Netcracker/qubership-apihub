import { isArray, isObject, JSON_ROOT_KEY, syncClone } from '@netcracker/qubership-apihub-json-crawl'

import {
  DEFAULT_OPTION_MERGE_TRAITS,
  DEFAULT_OPTION_ORIGINS_ALREADY_DEFINED,
  InternalMergeTraitsOptions,
  MergeTraitsOptions,
  MergeTraitsState,
  MergeTraitsSyncCloneHook,
  NormalizationRule,
  NormalizationRules,
  ResolveOptions,
} from './types'
import { mergePatchWithOrigins, copySymbolProperties } from './utils'
import { resolveSpec, SPEC_TYPE_ASYNCAPI_3 } from './spec-type'
import { createCycledJsoHandlerHook } from './cycle-jso'
import { RULES } from './rules'
import { createSelfOriginsCloneHook } from './origins'
import { ASYNCAPI_PROPERTY_TRAITS } from './rules/asyncapi.const'

/* Problems with traits merge

1. Behaviour for some of the cases is not clear from the definition in the specification:
 "Traits MUST be merged with the target object using the JSON Merge Patch algorithm
 in the same order they are defined. A property on a trait MUST NOT override the same property
 on the target object.". It is not clear how to interpret the last statement related
 to the special `null` value semantics of the JSON Merge Patch algorithm.
 https://github.com/asyncapi/spec/issues/1178

2. JSON Merge Patch replaces array values, which could be not what you expect
 e.g. for 'required' or 'allOf' properties in JSON schemas (see 'arrays handling' test cases)

3. Traits merge implementation in reference @asyncapi/parser implementation
 basically follows proposal from https://github.com/asyncapi/spec/issues/505
 (`_.merge({}, trait1, trait2, targetObject);`) and merges root object at the end,
 which applies patch merge `null` values special semantics to the targetObject,
 which results in some funny behaviour (e.g. specification with and without `traits[{}]`
 could yield different result in target object after parsing). See different results
 for top level and nested properties in 'null handling check' group of tests.

4. In api-unifier for correct implementation of traits merge for cases when
 JSON schemas are merged in the process, we need to get rid of synthetic allOfs
 that are created in earlier normalization phases (synthetic titles, description overrides),
 since they are changing the structure of JSON schema and could yield unexpected results
 after traits merge. See 'arrays are copied without merging (allOf array)' test.
 */

export const mergeTraits = (value: unknown, options?: MergeTraitsOptions & ResolveOptions) => {
  const spec = resolveSpec(value)

  // Short-circuit for non-AsyncAPI specs
  if (spec.type !== SPEC_TYPE_ASYNCAPI_3) {
    return value
  }

  const internalMergeTraitsOptions: InternalMergeTraitsOptions = {
    mergeTraits: DEFAULT_OPTION_MERGE_TRAITS,
    originsAlreadyDefined: DEFAULT_OPTION_ORIGINS_ALREADY_DEFINED,
    ...options,
    ignoreSymbols: new Set([
      ...(options?.originsFlag ? [options.originsFlag] : []),
      ...(options?.inlineRefsFlag ? [options.inlineRefsFlag] : []),
      ...(options?.syntheticTitleFlag ? [options.syntheticTitleFlag] : []),
      ...(options?.syntheticAllOfFlag ? [options.syntheticAllOfFlag] : []),
      ...(options?.referenceNameProperty ? [options.referenceNameProperty] : []),
      ...(options?.ignoreSymbols ? options.ignoreSymbols : []),
    ]),
  }

  const cycledJsoHandlerHook = createCycledJsoHandlerHook<MergeTraitsState, NormalizationRule>()
  return syncClone(
    value,
    [
      cycledJsoHandlerHook,
      createMergeTraitsHook(internalMergeTraitsOptions),
      cycledJsoHandlerHook,
      createSelfOriginsCloneHook(internalMergeTraitsOptions.originsFlag),
    ],
    {
      rules: RULES[spec.type] || {},
      state: { ignoreTreeUnderSymbols: false, selfOriginResolver: () => [] }
    }
  )
}

/**
 * Check if the current rules have a mergeTraits flag at the /traits path
 */
const isTraitsMergeRule = (rules?: NormalizationRules): boolean => {
  return !!rules && !!rules[`/${ASYNCAPI_PROPERTY_TRAITS}`] && ('mergeTraits' in rules[`/${ASYNCAPI_PROPERTY_TRAITS}`])
}

/**
 * Create the hook that applies traits merging to objects
 * This implements the exact logic from applyTraitsToObjectV3 in @asyncapi/parser
 */
const createMergeTraitsHook = (options: InternalMergeTraitsOptions): MergeTraitsSyncCloneHook => {
  const traitsResolver: MergeTraitsSyncCloneHook = ({ value, key, path, rules, state }) => {

    if (state.ignoreTreeUnderSymbols) {
      return { value }
    }

    const safeKey = key ?? JSON_ROOT_KEY
    if (typeof safeKey === 'symbol' && options.ignoreSymbols.has(safeKey)) {
      return {
        value,
        state: { ...state, ignoreTreeUnderSymbols: true },
      }
    }

    // Skip if not object or array
    if (!isObject(value) || isArray(value)) {
      return { value }
    }

    // Check if this node has a /traits path with mergeTraits rule
    if (!isTraitsMergeRule(rules)) {
      return { value }
    }

    // Check if the object has a traits array property
    const traits = value[ASYNCAPI_PROPERTY_TRAITS]
    if (!isArray(traits)) {
      return { value }
    }

    // Apply traits merging - optimized to only process properties that appear in traits
    // Merge traits disrupts reference equality on the objects, so some properties of the original object
    // are not in traits- we want them intact
    // Step 1: Collect all top-level properties from all trait objects
    const traitProperties = new Set<string>()
    for (const trait of traits) {
      if (isObject(trait) && !isArray(trait)) {
        for (const k in trait) {
          traitProperties.add(k)
        }
      }
    }

    // Step 2: Create shallow copy (including symbols) and delete properties that are not in traits
    // since they are kept on original object and need not to be processed by merge patch
    const copy = { ...value }
    for (const k in value) {
      if (!traitProperties.has(k)) {
        delete copy[k]
      }
    }

    // Step 3: Delete ONLY properties that exist in traits from the original object
    // Properties not in any trait stay intact on the base object
    const targetValue = { ...value }
    for (const k of traitProperties) {
      if (k in targetValue) {
        delete targetValue[k]
      }
    }

    // Step 4: Merge traits THEN root object (this ensures root properties override trait properties)
    // This is the key part that ensures AsyncAPI spec compliance:
    // "A property on a trait MUST NOT override the same property on the target object"
    const itemsToMerge = [...traits, copy]

    // Create a set of symbols to skip when copying symbol properties
    // originsFlag is managed by separate origins clone hooks and should not be copied here
    const skipSymbols = new Set<symbol>()
    if (options.originsFlag) {
      skipSymbols.add(options.originsFlag)
    }

    // Merge values from traits and root object to the target
    itemsToMerge.forEach((item) => {
      // First, copy symbol properties from the item to value (before merging regular properties)
      // This ensures symbols at the root level of each trait/object are preserved
      copySymbolProperties(item, targetValue, skipSymbols)

      // Then merge regular properties recursively
      // The copySymbolProperties inside mergePatchWithOrigins will handle symbols at deeper levels
      for (const key in item) {
        mergePatchWithOrigins(item, targetValue, key, options.originsFlag, skipSymbols)
      }
    })

    return { value: targetValue }
  }

  return traitsResolver
}
