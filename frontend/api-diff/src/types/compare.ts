import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'

import { CompareContext, CompareRules, ReclassificationRule } from './rules'
import { ClassifierType, DiffAction, JSO_ROOT } from '../core'
import { EvaluationCacheService, NormalizeOptions } from '@netcracker/qubership-apihub-api-unifier'

export type ActionType = keyof typeof DiffAction
export type DiffType = typeof ClassifierType[keyof typeof ClassifierType]
/**
 * Region of the document a node was reached in, named by the specification rules: `request` / `response`
 * for OpenAPI, `send` / `receive` for AsyncAPI, `args` / `output` for GraphQL. It exists because the same
 * structural change carries the opposite meaning on either side of a contract, so classify rules read it
 * back, and the AsyncAPI engine goes as far as swapping breaking and non-breaking on the receive side.
 * A rule opens a new scope at a node with `START_NEW_COMPARE_SCOPE_RULE`, and it holds from there down.
 * For scope the caller declares and gives meaning to, see `CustomScope` below.
 */
export type CompareScope = string

/** The scope a comparison starts in, before any rule opens one. */
export const COMPARE_SCOPE_ROOT: CompareScope = 'root'

/**
 * Scope elements the caller adds to a comparison, merged along the route the traversal took: a record of
 * element name to the value in effect at the node reached. `scope` above is decided by the specification
 * rules and names a region of the document; every element here is declared by the caller through
 * `CompareOptions.customScopeElementProviders` and carries meaning only the caller gives it.
 * The custom scope is part of the reuse footprint (`mergedJsoCache` in `core/compare.ts`), so a subtree
 * reached under two different records is traversed once per record instead of reused, and routes that
 * disagree about an element reach separate difference instances. Reclassification rules read it back to
 * decide what each of those instances is.
 */
export type CustomScope = Readonly<Record<string, string | undefined>>

/**
 * The node a custom scope element is asked about. One instance is built per node and handed to every
 * provider of that node in turn, so treat it as read-only: writing to it changes what the providers after
 * you are asked about.
 */
export interface CustomScopeElementContext {
  /** Path of the node inside the document being traversed. Zero length is the document itself. */
  path: JsonPath
  /** The node as the before document declares it, `undefined` where that side does not have it. */
  beforeJso?: unknown
  /** The node as the after document declares it, `undefined` where that side does not have it. */
  afterJso?: unknown
}

/**
 * Declares one element of the custom scope and computes its value per node. Keep a value constant within a
 * subtree and match on whole paths: a value that varies from node to node disables the reuse that makes
 * traversal of a cyclic document terminate, and combiner options report paths relative to the option.
 */
export interface CustomScopeElementProvider {
  /** Key the custom scope holds this element under, and the one a reclassification rule reads it back by. */
  name: string
  /**
   * Asked for a node of the document, and for every added or removed key or combiner option, which is a
   * node the traversal never enters. Asked more than once for the same node when a combiner pairs its
   * options, so keep it free of side effects. The root of a nested compare is not asked, so an answer meant
   * for the document cannot undo what a combiner was reached under.
   * Returns
   * a value that holds from this node down.
   * `undefined` to inherit the value of the enclosing node.
   */
  valueAt: (context: CustomScopeElementContext) => string | undefined
}

/**
 * Diff should be unique by [type, beforeDeclarationPaths, afterDeclarationPaths, scope, custom scope]
 * For an added or removed node that is enforced by `diffUniquenessCache` in `core/compare.ts`, which keys
 * on the value, its declaration paths, the scope, the action and the custom scope: the last member is what
 * lets two routes disagreeing about an element hold two verdicts instead of sharing one.
 */
interface DiffBase<T> {
  type: T
  scope: CompareScope
  /**
   * Custom scope of the route this difference was reached through, absent where no element is in effect:
   * because none is declared, or because none answered along that route. Two routes that disagree about an
   * element reach two differences, each carrying the record its own route merged, which is what a
   * `ReclassificationRule` reads to answer for one of them.
   */
  customScope?: CustomScope
  description?: string
}

export interface DiffAdd<T = DiffType> extends DiffBase<T> {
  action: typeof DiffAction.add
  /**
   * declaration path in after document. Empty array can be if value doesn't exist in 'after' spec or value have synthetic origin
   */
  afterDeclarationPaths: JsonPath[]
  afterValue: unknown
  [key: symbol]: unknown
}

export interface DiffRemove<T = DiffType> extends DiffBase<T> {
  action: typeof DiffAction.remove
  /**
   * declaration path in before document. Empty array can be if value doesn't exist in 'before' spec or value have synthetic origin
   */
  beforeDeclarationPaths: JsonPath[]
  beforeValue: unknown
  [key: symbol]: unknown
}

export interface DiffReplace<T = DiffType> extends DiffBase<T> {
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
  beforeValue: unknown
  [key: symbol]: unknown
}

export interface DiffRename<T = DiffType> extends DiffBase<T> {
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

export type Diff<T = DiffType> = DiffAdd<T> | DiffRemove<T> | DiffReplace<T> | DiffRename<T>

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
  beforeValueNormalizedProperty?: symbol
  afterValueNormalizedProperty?: symbol
  /**
   * Custom scope elements this comparison carries, each declared by name and computed per node. A value is
   * inherited down to the leaves and into `oneOf`, `anyOf` and `allOf`, and can be restated from a node
   * down but never unstated.
   * Routes that disagree about an element get separate difference instances, and every extra value repeats
   * the traversal of the subtree those routes share. Declare an element for what routes must be able to
   * disagree about, not for everything a rule would like to know.
   * Two providers declaring the same name throw at entry, before either document is normalized.
   */
  customScopeElementProviders?: readonly CustomScopeElementProvider[]
  /**
   * Reclassification pipeline, consulted in order once the spec rules have produced a verdict, for a
   * verdict that depends on knowledge the library does not have. A rule has to be pure; one that throws
   * leaves the verdict where the rule before it left it and does not stop the rules after it.
   */
  reclassificationRules?: readonly ReclassificationRule[]
  /**
   * For OpenAPI specs:
   * If a whole PathItem is removed, generate separate diffs for each HTTP operation (get/post/...)
   * instead of a single diff for the whole PathItem.
   *
   * Default: `false`
   */
  openApiPathItemPerOperationDiffs?: boolean
  /**
   * When true, the symbol value stored under `firstReferenceKeyProperty` will be preserved in the merged result.
   * Set automatically by the AsyncAPI engine when `firstReferenceKeyProperty` is user-provided.
   */
  retainFirstReferenceKeyProperty?: boolean
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
  /**
   * Custom scope a nested compare (the items of a combiner) was reached under. Present only for one,
   * which is how the crawl knows the zero-length path of its own root is not the document.
   */
  nestedCustomScope?: CustomScope
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
  customScope: CustomScope
}

export type JsonNode<Key extends PropertyKey = string> = Key extends (string | symbol) ? Record<string | symbol, unknown> : Record<number, unknown> | Array<unknown>

export interface DiffEntry<D extends Diff> {
  readonly propertyKey: PropertyKey
  readonly diff: D
}

export interface DiffFactory {
  added: (ctx: CompareContext) => DiffAdd
  removed: (ctx: CompareContext) => DiffRemove
  replaced: (ctx: CompareContext) => DiffReplace
  renamed: (ctx: CompareContext) => DiffRename
}

export interface ContextInput extends MergeState {
  beforeValue: unknown
  afterValue: unknown
  afterKey: PropertyKey
  beforeKey: PropertyKey
  mergeKey: PropertyKey
  rules: CompareRules
  path: JsonPath
}
