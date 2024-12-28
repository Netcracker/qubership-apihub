import { isObject, syncCrawl } from '@netcracker/qubership-apihub-json-crawl'
import { resolveOrigins } from './origins'
import { JSON_SCHEMA_PROPERTY_DEPRECATED } from './rules/jsonschema.const'
import { pathItemToFullPath } from './utils'
import { Jso, NormalizationRule } from './types'
import { resolveSpec } from './spec-type'
import { RULES } from './rules'

export interface DeprecatedItem {
  value: Jso<unknown>
  description: string
  deprecatedReason?: string
}

export interface DeprecatedItemsCrawlState {
  deprecatedItems: DeprecatedItem[]
  cycleGuard: Set<unknown>
  inlineDescriptionSuffix: string
}

export function calculateDeprecatedItems(data: unknown, originsSymbol: symbol | undefined): DeprecatedItem[] {
  const spec = resolveSpec(data)

  const deprecatedState: DeprecatedItemsCrawlState = {
    deprecatedItems: [],
    cycleGuard: new Set(),
    inlineDescriptionSuffix: '',
  }

  syncCrawl<DeprecatedItemsCrawlState, NormalizationRule>(
    data,
    [({ key, value, state, rules }) => {
      if (state.cycleGuard.has(value) || typeof key === 'symbol') { // do not go into origin
        return { done: true }
      }
      if (!isObject(value)) {
        return { done: true }
      }
      const localState = {
        ...state,
        values: state.cycleGuard.add(value),
      }

      const descriptionCtx = {
        key: key,
        source: value,
        paths: resolveOrigins(value, JSON_SCHEMA_PROPERTY_DEPRECATED, originsSymbol)?.map(pathItemToFullPath) ?? [],
        suffix: state.inlineDescriptionSuffix,
      }

      const deprecatedRules = rules?.deprecation
      if (deprecatedRules?.inlineDescriptionSuffixCalculator) {
        localState.inlineDescriptionSuffix = deprecatedRules?.inlineDescriptionSuffixCalculator(descriptionCtx)
      }

      // deprecated value candidate condition
      if (!(deprecatedRules && deprecatedRules.descriptionCalculator && deprecatedRules.deprecationResolver)) {
        return {
          value: value,
          state: localState,
        }
      }

      const deprecatedReason = deprecatedRules.deprecationResolver(value)
      if (deprecatedReason !== undefined) { // if the value of deprecatedReason is not undefined, then it means this is a deprecated item
        if (areDeprecatedOriginsNotEmpty(value, originsSymbol)) {
          state.deprecatedItems.push({
            value: value,
            description: deprecatedRules.descriptionCalculator(descriptionCtx),
            ...deprecatedReason ? { deprecatedReason } : {},
          })
        } else {
          throw new Error('Something wrong with origins')
        }
      }

      return {
        value: value,
        state: localState,
      }
    }],
    { state: deprecatedState, rules: RULES[spec.type] },
  )
  return deprecatedState.deprecatedItems
}

export function areDeprecatedOriginsNotEmpty(value: Record<PropertyKey, unknown>, originsSymbol: symbol | undefined): boolean {
  const deprecatedOrigins = resolveOrigins(value, JSON_SCHEMA_PROPERTY_DEPRECATED, originsSymbol)

  if (!deprecatedOrigins) {
    return false
  }

  return deprecatedOrigins.every(item => Object.keys(item).length > 0)
}

