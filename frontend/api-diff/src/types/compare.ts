import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'

import { CompareContext, CompareRules } from './rules'
import { ClassifierType, DiffAction, JSO_ROOT } from '../core'
import { EvaluationCacheService, NormalizeOptions } from '@netcracker/qubership-apihub-api-unifier'

export type ActionType = keyof typeof DiffAction
export type DiffType = typeof ClassifierType[keyof typeof ClassifierType]
export type CompareScope = string

export const COMPARE_SCOPE_ROOT: CompareScope = 'root'

/**
 * Diff should be unique by [type, beforeDeclarationPaths, afterDeclarationPaths, scope]
 */
interface DiffBase {
  type: DiffType
  scope: CompareScope
  description?: string
}

export interface DiffAdd extends DiffBase {
  action: typeof DiffAction.add
  /**
   * declaration path in after document. Empty array can be if value doesn't exist in 'after' spec or value have synthetic origin
   */
  afterDeclarationPaths: JsonPath[]
  afterValue: unknown
  afterNormalizedValue: unknown
}

export interface DiffRemove extends DiffBase {
  action: typeof DiffAction.remove
  /**
   * declaration path in before document. Empty array can be if value doesn't exist in 'before' spec or value have synthetic origin
   */
  beforeDeclarationPaths: JsonPath[]
  beforeValue: unknown
  beforeNormalizedValue: unknown
}

export interface DiffReplace extends DiffBase {
  action: typeof DiffAction.replace
  /**
   * declaration path in before document. Empty array can be if value doesn't exist in 'before' spec or value have synthetic origin
   */
  beforeDeclarationPaths: JsonPath[]
  /**
   * declaration path in after document. Empty array can be if value doesn't exist in 'after' spec or value have synthetic origin
   */
  afterDeclarationPaths: JsonPath[]
  afterValue: unknown
  afterNormalizedValue: unknown
  beforeValue: unknown
  beforeNormalizedValue: unknown
}

export interface DiffRename extends DiffBase {
  action: typeof DiffAction.rename
  /**
   * declaration path in before document. Empty array can be if value doesn't exist in 'before' spec or value have synthetic origin
   */
  beforeDeclarationPaths: JsonPath[]
  /**
   * declaration path in after document. Empty array can be if value doesn't exist in 'after' spec or value have synthetic origin
   */
  afterDeclarationPaths: JsonPath[]
  afterKey: unknown
  beforeKey: unknown
}

export type Diff = DiffAdd | DiffRemove | DiffReplace | DiffRename

export interface CompareResult {
  diffs: Diff[]
  ownerDiffEntry: DiffEntry<Diff> | undefined
  merged: unknown
}

export type DiffMetaRecord = Record<PropertyKey, Diff/*actually array should be here. Cause same JSO can be access by several parallel ways*/>

export const COMPARE_MODE_DEFAULT = 'default'
export const COMPARE_MODE_OPERATION = 'operation'

export type CompareMode = typeof COMPARE_MODE_DEFAULT | typeof COMPARE_MODE_OPERATION

export interface CompareOptions extends Omit<NormalizeOptions, 'source'> {
  mode?: CompareMode
  normalizedResult?: boolean
  metaKey?: symbol         // metakey for merge changes
  beforeSource?: unknown
  afterSource?: unknown
  onCreateDiffError?: (message: string, diff: Diff, ctx: CompareContext) => void
}

export type DiffCallback = (diff: Diff/*, ctx: CompareContext*/) => void

export interface StrictCompareOptions extends Omit<CompareOptions, 'defaultsFlag' | 'originsFlag'> {
  mode: CompareMode
  normalizedResult: boolean
  metaKey: symbol
  defaultsFlag: symbol,
  originsFlag: symbol,
  compareScope: CompareScope
  mergedJsoCache: EvaluationCacheService
  diffUniquenessCache: EvaluationCacheService
  valueAdaptationCache: EvaluationCacheService
  createdMergedJso: Set<JsonNode>,
}

export interface InternalCompareOptions extends StrictCompareOptions {
  rules: CompareRules
}

export type CompareEngine = (before: unknown, after: unknown, options: StrictCompareOptions) => CompareResult

export type NodeRoot = { [JSO_ROOT]: any }
export type KeyMapping = Record<PropertyKey, PropertyKey>

export interface MergeState<T extends PropertyKey = string> {
  parentContext: CompareContext | undefined
  keyMap: KeyMapping            // parent keys mappings
  afterJso: JsonNode<T>
  beforeJso: JsonNode<T>
  mergedJso: JsonNode<T>
  root: {
    before: NodeRoot
    after: NodeRoot
    merged: JsonNode<T>
  }
  mergedJsoCache: EvaluationCacheService,
  diffUniquenessCache: EvaluationCacheService,
  createdMergedJso: Set<JsonNode>,
  compareScope: CompareScope
}

export type JsonNode<Key extends PropertyKey = string> = Key extends (string | symbol) ? Record<string | symbol, unknown> : Record<number, unknown> | Array<unknown>

export interface DiffEntry<D extends Diff> {
  readonly propertyKey: PropertyKey
  readonly diff: D
}

export interface DiffFactory {
  added: (ctx: CompareContext) => DiffEntry<DiffAdd>
  removed: (ctx: CompareContext) => DiffEntry<DiffRemove>
  replaced: (ctx: CompareContext) => DiffEntry<DiffReplace>
  renamed: (ctx: CompareContext) => DiffEntry<DiffRename>
}

export interface ContextInput extends MergeState {
  beforeValue: unknown
  afterValue: unknown
  afterKey: PropertyKey
  beforeKey: PropertyKey
  mergeKey: PropertyKey
  rules: CompareRules
}
