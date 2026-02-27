import { syncClone } from '@netcracker/qubership-apihub-json-crawl'

import {
  ClassifyRule,
  ClassifyRuleTransformer,
  CompareContext,
  CompareRules,
  CompareRulesTransformer,
  DiffType,
  DiffTypeClassifier,
  RuleDiffType,
} from '../types'
import { isFunc, isObject, isString } from '../utils'
import { breaking, DiffAction, nonBreaking, risky } from './constants'

export type ReversePredicate = (ctx: CompareContext) => boolean

export const transformCompareRules = (rules: CompareRules, transformer: CompareRulesTransformer): CompareRules => {
  return syncClone(rules, ({ value, key, state, path }) => {
    if (key && (!isString(key) || !key.startsWith('/'))) {
      state.node[key] = value
      return { done: true }
    }
    if (typeof value === 'function') {
      //case for not.
      return { value: (...args: unknown[]) => transformCompareRules(value(...args), transformer) }
    } else if (!Array.isArray(value) && isObject(value)) {
      return { value: transformer(value as CompareRules) }
    }
  }) as CompareRules
}

export const reverseClassifyRuleTransformer: CompareRulesTransformer = (value) => {
  // reverse classify rules
  if ('$' in value && Array.isArray(value.$)) {
    return { ...value, $: reverseClassifyRule(value.$) }
  }

  return value
}

export const reverseDiffType = (diffType: DiffType | DiffTypeClassifier): DiffType | DiffTypeClassifier => {
  if (typeof diffType === 'function') {
    return ((ctx: CompareContext) => reverseDiffType(diffType(ctx))) as DiffTypeClassifier
  } else {
    switch (diffType) {
      case breaking:
        return nonBreaking
      case nonBreaking:
        return breaking
      default:
        return diffType
    }
  }
}

export const reverseClassifyRule = ([add, remove, replace, reverseAdd, reverseRemove, reverseReplace]: ClassifyRule): ClassifyRule => {
  return [
    reverseAdd ?? reverseDiffType(add),
    reverseRemove ?? reverseDiffType(remove),
    reverseReplace ?? reverseDiffType(replace),
  ]
}

export const transformClassifyRule = ([add, remove, replace, reverseAdd, reverseRemove, reverseReplace]: ClassifyRule, transformer: ClassifyRuleTransformer): ClassifyRule => {
  const transformedRule = (ruleDiffType: RuleDiffType, diffAction: typeof DiffAction[keyof typeof DiffAction]) =>
    (ctx: CompareContext) => transformer(isFunc(ruleDiffType) ? ruleDiffType(ctx) : ruleDiffType, ctx, diffAction)

  if (reverseAdd !== undefined && reverseRemove !== undefined && reverseReplace !== undefined) {
    return [
      transformedRule(add, DiffAction.add),
      transformedRule(remove, DiffAction.remove),
      transformedRule(replace, DiffAction.replace),
      transformedRule(reverseAdd, DiffAction.add),
      transformedRule(reverseRemove, DiffAction.remove),
      transformedRule(reverseReplace, DiffAction.replace),
    ]
  }

  return [
    transformedRule(add, DiffAction.add),
    transformedRule(remove, DiffAction.remove),
    transformedRule(replace, DiffAction.replace),
  ]
}

/**
 * Wraps a single classify slot dynamically: when shouldReverse(ctx) is true the
 * classification is reversed, otherwise the original value is used.
 *
 * Reversible statics (breaking/nonBreaking) and classifier functions are wrapped
 * in a predicate check. Non-reversible statics (annotation, unclassified, deprecated,
 * risky) are returned as-is.
 *
 * When an explicit reversed value is provided (from a 6-tuple ClassifyRule) it is
 * used directly instead of computing the reverse.
 */
const dynamicReverseSlot = (
  normal: RuleDiffType,
  explicitReversed: RuleDiffType | undefined,
  shouldReverse: ReversePredicate,
): RuleDiffType => {
  if (explicitReversed !== undefined) {
    return (ctx: CompareContext): DiffType => {
      const chosen = shouldReverse(ctx) ? explicitReversed : normal
      return isFunc(chosen) ? chosen(ctx) : chosen
    }
  }
  if (isFunc(normal)) {
    return (ctx: CompareContext): DiffType => {
      if (shouldReverse(ctx)) {
        return reverseDiffType(normal(ctx)) as DiffType
      }
      return normal(ctx)
    }
  }
  if (normal === breaking || normal === nonBreaking) {
    const reversed = reverseDiffType(normal) as DiffType
    return (ctx: CompareContext): DiffType => (shouldReverse(ctx) ? reversed : normal)
  }
  return normal
}

const dynamicReverseClassifyRule = (rule: ClassifyRule, shouldReverse: ReversePredicate): ClassifyRule => {
  const [add, remove, replace, reversedAdd, reversedRemove, reversedReplace] = rule
  return [
    dynamicReverseSlot(add, reversedAdd, shouldReverse),
    dynamicReverseSlot(remove, reversedRemove, shouldReverse),
    dynamicReverseSlot(replace, reversedReplace, shouldReverse),
  ]
}

/**
 * Like reverseClassifyRuleTransformer but defers the reversal decision to
 * diff-creation time via a predicate that receives CompareContext.
 * This allows scope-aware reversal without pre-computing two rule sets.
 */
export const dynamicReclassifyTransformer = (shouldReverse: ReversePredicate): CompareRulesTransformer =>
  (value) => {
    if (!('$' in value) || !Array.isArray(value.$)) return value
    return { ...value, $: dynamicReverseClassifyRule(value.$ as ClassifyRule, shouldReverse) }
  }

export const breakingIf = (v: boolean): DiffType => (v ? breaking : nonBreaking)
export const riskyIf = (v: boolean): DiffType => (v ? risky : nonBreaking)
export const breakingIfAfterTrue: DiffTypeClassifier = ({ after }): DiffType => breakingIf(!!after.value)

export const booleanClassifier: ClassifyRule = [
  breakingIfAfterTrue,
  nonBreaking,
  breakingIfAfterTrue,
]
