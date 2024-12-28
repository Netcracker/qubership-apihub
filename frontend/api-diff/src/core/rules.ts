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
import { breaking, DiffAction, nonBreaking } from './constants'

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

export const breakingIf = (v: boolean): DiffType => (v ? breaking : nonBreaking)
export const breakingIfAfterTrue: DiffTypeClassifier = ({ after }): DiffType => breakingIf(!!after.value)

export const booleanClassifier: ClassifyRule = [
  breakingIfAfterTrue,
  nonBreaking,
  breakingIfAfterTrue,
]
