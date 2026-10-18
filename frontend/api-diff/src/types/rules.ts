import { CrawlRules, JsonPath } from '@netcracker/qubership-apihub-json-crawl'

import type { CompareResult, Diff, DiffType } from './compare'
import { CompareScope, CustomScope, InternalCompareOptions } from './compare'
import { DiffAction } from '../core'
import { OriginLeafs } from '@netcracker/qubership-apihub-api-unifier'

export type DiffTypeClassifier = (ctx: CompareContext) => DiffType

/**
 * Verdict the specification gives a difference at one node, by action: what an addition, a removal and a
 * replacement mean there, optionally followed by the three verdicts of the reversed comparison. A
 * `DiffTypeClassifier` in a slot decides from the compared values instead of naming one type.
 * Use a classify rule for what the specification settles on its own, and a `ReclassificationRule` for a
 * verdict that also depends on what the caller knows.
 */
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

/**
 * Revisits the verdict a difference already carries, for knowledge the specification does not hold: which
 * operations reach a shared schema, how long an element has been announced as deprecated. Declared through
 * `CompareOptions.reclassificationRules` and consulted in the order the rules are given, once the classify
 * rules have produced a verdict.
 *
 * The rule is handed the difference under construction, so `type` is the verdict the rule before it left
 * and `description` is not computed yet. `customScope` carries the scope elements of the route the
 * difference was reached through: routes that disagree about an element reach separate difference
 * instances, which is what lets a rule answer for one route and leave the other alone.
 * The difference is whatever its action makes it, so narrow on `action` before reading a field: a rename
 * carries `beforeKey` and `afterKey` but no `beforeValue`, and an addition carries no declaration paths on
 * the before side.
 * Returns
 * a diff type to replace that verdict with.
 * `undefined` to leave it as it stands, which is also what a rule that throws leaves behind.
 */
export type ReclassificationRule = (diff: Diff) => DiffType | undefined

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
  customScope: CustomScope
  /**
   * Path of the node in the document being traversed, in the form `CustomScopeElementContext.path` hands a
   * provider. Kept on the context so that a resolver can ask the providers about a node no crawl enters: an
   * added or removed combiner option. A child is keyed by the before key where the before document has the
   * node and by the after key otherwise, never by `mergeKey`. Inside a combiner option it is relative to the
   * option.
   */
  path: JsonPath
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
export type SyntheticDiffsResolver<T extends PropertyKey> =
  (mapKeysResult: MapKeysResult<T>, before: Record<T, unknown>, after: Record<T, unknown>) => void

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
export const IGNORE_DIFFERENCE_RULE = 'ignoreDifference'
//not happy to do this, but introduce covariant support on core level too hard. If you can change it, feel free
export const START_NEW_COMPARE_SCOPE_RULE = 'newCompareScope'
export const SYNTHETIC_DIFF = 'syntheticDiffs'

export type CompareRule = {
  [CLASSIFIER_RULE]?: ClassifyRule                           // classifier for current node
  [COMPARE_RULE]?: CompareResolver                           // compare handler for current node
  [ADAPTER_RULE]?: AdapterResolver[]                       // mutations (not deep)
  [MAPPING_RULE]?: MappingResolver<PropertyKey>              // key mapping rules
  [DIFF_DESCRIPTION_RULE]?: DiffDescriptionRule               // rule for description
  [DIFF_DESCRIPTION_PARAM_CALCULATOR_RULE]?: DiffTemplateParamsCalculator               // rule for description calculation
  [IGNORE_DIFFERENCE_IN_KEYS_RULE]?: boolean                 // rule for ignore keys as values, it is relevant for arrays as sets
  [IGNORE_DIFFERENCE_RULE]?: boolean                         // suppress add/remove/replace diffs for this node and its whole subtree (still merges the after-value)
  [START_NEW_COMPARE_SCOPE_RULE]?: CompareScope // rule for star a new scope
  [SYNTHETIC_DIFF]?: SyntheticDiffsResolver<PropertyKey>
}

export type CompareRules = CrawlRules<CompareRule>

export interface MapKeysResult<T extends PropertyKey> {
  added: T[]
  removed: T[]
  mapped: Record<T, T>
}

export type CompareRulesTransformer = (rules: CompareRules) => CompareRules
export type ClassifyRuleTransformer = (type: DiffType, ctx: CompareContext, action: typeof DiffAction[keyof typeof DiffAction]) => DiffType
