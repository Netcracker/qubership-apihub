import { CrawlRules, JsonPath } from '@netcracker/qubership-apihub-json-crawl'

import type { CompareResult, Diff, DiffType } from './compare'
import { CompareScope, InternalCompareOptions } from './compare'
import { DiffAction } from '../core'
import { OriginLeafs } from '@netcracker/qubership-apihub-api-unifier'

export type DiffTypeClassifier = (ctx: CompareContext) => DiffType

export type ClassifyRule =
  [AddDiffType, RemoveDiffType, ReplaceDiffType] |
  [AddDiffType, RemoveDiffType, ReplaceDiffType, ReversedAddDiffType, ReversedRemoveDiffType, ReversedReplaceDiffType]

export type AddDiffType = RuleDiffType
export type RemoveDiffType = RuleDiffType
export type ReplaceDiffType = RuleDiffType

// Reversed DiffType uses to specify rule for reverse case
export type ReversedAddDiffType = RuleDiffType
export type ReversedRemoveDiffType = RuleDiffType
export type ReversedReplaceDiffType = RuleDiffType

export type RuleDiffType = DiffType | DiffTypeClassifier

export interface NodeContext {
  //todo replace to PathChain and move it to crawl. For performance reason
  parentContext: NodeContext | undefined
  declarativePaths: JsonPath[]
  key: PropertyKey
  value: unknown
  /**
   * @deprecated
   * will be removed
   */
  parent: unknown | undefined
  root: unknown
}

export interface CompareContext {
  parentContext: CompareContext | undefined
  scope: CompareScope
  before: NodeContext
  after: NodeContext
  mergeKey: PropertyKey
  rules: CompareRules
  options: InternalCompareOptions
}

export interface AdapterContext<T> {
  valueOrigins: OriginLeafs | undefined
  options: InternalCompareOptions
  transformer: ValueTransformer<T>
}

export type ValueTransformer<T = unknown> = (value: T, transformId: string, f: (value: T) => T) => T
export type CompareResolver = (ctx: CompareContext) => CompareResult | void
export type AdapterResolver<T = unknown> = (value: T, reference: T, ctx: AdapterContext<T>) => T
export type MappingResolver<T extends PropertyKey> = T extends (string | symbol) ? MappingObjectResolver<T> : MappingArrayResolver
export type MappingObjectResolver<T extends Exclude<PropertyKey, number>> = (before: Record<T, unknown>, after: Record<T, unknown>, ctx: CompareContext) => MapKeysResult<T>
export type MappingArrayResolver = (before: Array<unknown>, after: Array<unknown>, ctx: CompareContext) => MapKeysResult<number>

export type DescriptionTemplate = string
export type DescriptionTemplates = DescriptionTemplate[]

export type DiffDescriptionRule = (diff: Diff, ctx: CompareContext) => string | undefined
export type DiffDescription = {
  (descriptionTemplate: DescriptionTemplate): DiffDescriptionRule
  (descriptionTemplates: DescriptionTemplates): DiffDescriptionRule
}

export type DiffTemplateParamsCalculator = (diff: Diff, ctx: CompareContext) => DynamicParams
export type PrimitiveType = string | number | boolean
export type DynamicParams = Record<PropertyKey, PrimitiveType | undefined>
export const FAILED_PARAMS_CALCULATION = {} as DynamicParams

export const CLASSIFIER_RULE = '$'
export const COMPARE_RULE = 'compare'
export const ADAPTER_RULE = 'adapter'
export const MAPPING_RULE = 'mapping'
export const DIFF_DESCRIPTION_RULE = 'description'
export const DIFF_DESCRIPTION_PARAM_CALCULATOR_RULE = 'descriptionParamCalculator'
export const IGNORE_DIFFERENCE_IN_KEYS_RULE = 'ignoreKeyDifference'
//not happy to do this, but introduce covariant support on core level too hard. If you can change it, feel free
export const START_NEW_COMPARE_SCOPE_RULE = 'newCompareScope'

export type CompareRule = {
  [CLASSIFIER_RULE]?: ClassifyRule                           // classifier for current node
  [COMPARE_RULE]?: CompareResolver                           // compare handler for current node
  [ADAPTER_RULE]?: AdapterResolver[]                       // mutations (not deep)
  [MAPPING_RULE]?: MappingResolver<PropertyKey>              // key mapping rules
  [DIFF_DESCRIPTION_RULE]?: DiffDescriptionRule               // rule for description
  [DIFF_DESCRIPTION_PARAM_CALCULATOR_RULE]?: DiffTemplateParamsCalculator               // rule for description calculation
  [IGNORE_DIFFERENCE_IN_KEYS_RULE]?: boolean                 // rule for ignore keys as values, it is relevant for arrays as sets
  [START_NEW_COMPARE_SCOPE_RULE]?: CompareScope // rule for star a new scope
}

export type CompareRules = CrawlRules<CompareRule>

export interface MapKeysResult<T extends PropertyKey> {
  added: T[]
  removed: T[]
  mapped: Record<T, T>
}

export type CompareRulesTransformer = (rules: CompareRules) => CompareRules
export type ClassifyRuleTransformer = (type: DiffType, ctx: CompareContext, action: typeof DiffAction[keyof typeof DiffAction]) => DiffType
