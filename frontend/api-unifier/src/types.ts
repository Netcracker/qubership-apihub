import { CrawlRules, JsonPath, SyncCloneHook } from '@netcracker/qubership-apihub-json-crawl'
import { EvaluationCacheService, PropertySpreadWithCacheService } from './cache'
import { HasSelfMetaResolver } from './utils'
import { ReferenceHandlerArgsWithResolver, ReferenceHandlerResponse } from './references/ref-resolver'
import { SpecType } from './spec-type'

export type RawJsonSchema = Record<PropertyKey, unknown> | boolean
export type JsonSchema = Record<PropertyKey, unknown>

export type NormalizationRules = CrawlRules<NormalizationRule>

export const RefErrorTypes = {
  RICH_REF_NOT_ALLOWED: 'richRefObjectNotAllowed' as const,
  REF_NOT_FOUND: 'refNotFound' as const,
  REF_NOT_VALID_FORMAT: 'refNotValidFormat' as const,
  REF_NOT_ALLOWED: 'refNotAllowed' as const,
} as const

export type RefErrorType = typeof RefErrorTypes[keyof typeof RefErrorTypes]

//todo ugly API. Some Flag activate transformation (like syntheticTitleFlag) some flags just mark result for transfomration
export interface ResolveOptions {
  resolveRef?: boolean            // execute resolve ref phase (inline usages that can produce cycled JSO)
  source?: any                    // source JsonSchema if merging only part of it
  syntheticTitleFlag?: symbol     // create title attribute if not exists when inline $ref object and mark it in symbol
  syntheticAllOfFlag?: symbol     // mark synthetic allOf during resolve with this symbol
  inlineRefsFlag?: symbol         // flag on JSO with array of JsonPath for resolve that object. Array for all of case
  originsFlag?: symbol            // used in JSO as anchor to chained declaration path (contains link to parent in declarationPath)
  originsAlreadyDefined?: boolean // are there already origins in the spec
  referenceNameProperty?: symbol  // capture last reference name in chain for reference object resolver
  ignoreSymbols?: symbol[],       // symbols to ignore scan
  onRefResolveError?: (message: string, path: JsonPath, ref: string, errorType: RefErrorType) => void
}

export interface MergeOptions {
  mergeAllOf?: boolean   // execute merge allOf into final view
  onMergeError?: (message: string, path: JsonPath, values: any[]) => void
}

export interface MergeTraitsOptions {
  mergeTraits?: boolean  // execute merge traits for AsyncAPI Operation and Message objects
}

export interface LiftCombinersOptions {
  liftCombiners?: boolean         // enable lifting & re-combining combiners
}

export interface ValidateOptions {
  validate?: boolean              // enable cleanup invalid keys
  onValidateError?: (message: string, path: JsonPath, value: any, cause?: unknown) => void
}

export interface UnifyOptions {
  unify?: boolean                                  // enable defaults, type infer and so on unified actions
  defaultsFlag?: symbol,                           // mark synthetic default properties
  allowNotValidSyntheticChanges?: boolean,         // for example in JSON Schema allow type: 'nothing', 'any'
  createOriginsForDefaults?: OriginsFactory        // factory for origins for defaults
  onUnifyError?: (message: string, path: JsonPath, value: any, cause?: unknown) => void
}

export interface DeUnifyOptions extends UnifyOptions {
  skip?: PropertySkipFunction,                     // predicate to skip rollback unification
  forceRulesForSpecVersion?: SpecType,             // force deunify rules (spec family only: OpenAPI 3.0/3.1, JsonSchemaSpecVersion); cannot override AsyncAPI / GraphAPI
}

interface HasInternalIgnoreSymbols {
  ignoreSymbols: Set<symbol>
}

export interface InternalResolveOptions extends Omit<ResolveOptions, 'source' | 'resolveRef' | 'originsAlreadyDefined' | 'ignoreSymbols'>, HasInternalIgnoreSymbols {
  source: any
  resolveRef: boolean
  originsAlreadyDefined: boolean
}

export interface InternalMergeOptions extends Omit<MergeOptions, never>, Omit<InternalResolveOptions, 'source' | 'syntheticAllOfFlag'>, HasInternalIgnoreSymbols {
  evaluationCacheService: EvaluationCacheService
  spreadAllOfCache: PropertySpreadWithCacheService<PropertyKey, unknown>
  syntheticMetaDefinitions: MetaDefinitions
  mergeAllOf: boolean
}

export interface InternalMergeTraitsOptions extends Omit<MergeTraitsOptions, 'mergeTraits'>, Pick<ResolveOptions, 'originsFlag'>, HasInternalIgnoreSymbols {
  mergeTraits: boolean
}

export interface HashOptions {
  hashFlag?: symbol
}

export interface InternalHashOptions extends HashOptions { }

const OPEN_API_EXTENSION_PREFIX = 'x-'

export type OpenApiExtensionKey = `${typeof OPEN_API_EXTENSION_PREFIX}${string}`

export interface RemoveOasExtensionsOptions {
  removeOasExtensions?: boolean
  shouldRemoveOasExtension?: (extensionKey: OpenApiExtensionKey) => boolean
}

export interface InternalRemoveOasExtensionsOptions extends RemoveOasExtensionsOptions { }

export interface InternalLiftCombinersOptions extends Omit<LiftCombinersOptions, never>, InternalMergeOptions, HasInternalIgnoreSymbols {
  liftCombiners: boolean
}

export interface InternalValidationOptions extends Omit<ValidateOptions, 'validate'>, Pick<ResolveOptions, 'originsFlag'>, HasInternalIgnoreSymbols {
}

export type PropertySkipFunction = (value: unknown, path: JsonPath) => boolean

export interface InternalUnifyOptions extends Omit<UnifyOptions, 'unify' | 'allowNotValidSyntheticChanges' | 'createOriginsForDefaults'>, InternalLiftCombinersOptions, HasInternalIgnoreSymbols {
  source: unknown
  syntheticMetaDefinitions: MetaDefinitions
  nativeMetaDefinitions: MetaDefinitions
  allowNotValidSyntheticChanges: boolean
  createOriginsForDefaults: OriginsFactory
}

export interface InternalDeUnifyOptions extends Omit<DeUnifyOptions, 'unify' | 'allowNotValidSyntheticChanges' | 'createOriginsForDefaults'>, InternalLiftCombinersOptions, HasInternalIgnoreSymbols {
  source: unknown
  syntheticMetaDefinitions: MetaDefinitions
  nativeMetaDefinitions: MetaDefinitions
  allowNotValidSyntheticChanges: boolean
  createOriginsForDefaults: OriginsFactory
}

export interface MetaDefinitions {
  emptyJsonSchema: (origins: OriginLeafs | undefined) => Record<PropertyKey, unknown>,
  omitIfAssignableToEmptyJsonSchema: (jso: Record<PropertyKey, unknown>, skip?: PropertySkipFunction) => OriginLeafs/*empty array if origins off*/ | undefined
  invertedEmptyJsonSchema: (origins: OriginLeafs | undefined) => Record<PropertyKey, unknown>
  omitIfAssignableToInvertedEmptyJsonSchema: (jso: Record<PropertyKey, unknown>, skip?: PropertySkipFunction) => OriginLeafs/*empty array if origins off*/ | undefined
}

export type NormalizeOptions =
  ResolveOptions
  & MergeOptions
  & MergeTraitsOptions
  & ValidateOptions
  & UnifyOptions
  & LiftCombinersOptions
  & HashOptions
  & RemoveOasExtensionsOptions

export type DenormalizeOptions =
  ResolveOptions
  & MergeOptions
  & MergeTraitsOptions
  & ValidateOptions
  & DeUnifyOptions
  & LiftCombinersOptions
  & HashOptions

export type DefaultMetaRecord = Record<PropertyKey/*actually only string*/, DefaultTypeFlag>

export interface UnifyContext<Options> {
  readonly origins: OriginLeafs | undefined
  readonly path: JsonPath
  readonly options: Options
  readonly parentValue: unknown
}

export type TransformFunction = (value: unknown, ctx: UnifyContext<InternalUnifyOptions>) => unknown
export type MutationFunction = (value: unknown, ctx: UnifyContext<InternalDeUnifyOptions>) => void
export type RevertibleUnifyFunctions = {
  readonly forward: TransformFunction
  readonly backward: MutationFunction
}
//IMPORTANT!!! DO NOT RECREATE NESTED OBJECT PROPERTIES. SOMEONE CAN REFER TO IT AND YOU WILL DESTROY SHARING.
export type UnifyFunction = TransformFunction | RevertibleUnifyFunctions
export type ValidateFunction = (value: unknown) => boolean

export interface RefNode extends PureRefNode {
  [key: string]: any
}

export interface PureRefNode {
  $ref: string
}

export type MergeError = (values: ValueWithOrigins<unknown>[], message?: string) => void

export interface MergeContext {
  options: InternalMergeOptions
  allMergeItemsWithOrigins: ValueWithOrigins<JsonSchema>[],
  mergeRules: NormalizationRules
  mergeError: MergeError
  // need structure that allows to get allOfItems for merge and association with passed indeces
}

export type MergeResolver<T> = (args: ValueWithOrigins<T>[], ctx: MergeContext) => ValueWithOrigins<T> | undefined
export type ReferenceHandler = (args: ReferenceHandlerArgsWithResolver) => ReferenceHandlerResponse

export interface HasIgnoreTreeUnderSymbols {
  ignoreTreeUnderSymbols: boolean
}

export interface HasParentValue {
  parentValue: unknown
}

export type HasSelfOriginsResolver = HasSelfMetaResolver<'selfOriginResolver', OriginLeafs>
export type HasSelfDefaultsResolver = HasSelfMetaResolver<'selfDefaultsResolver', DefaultTypeFlag>

export type OriginsFactory = (ownerOrigins: OriginLeafs | undefined) => OriginLeafs | undefined

export interface MergeAndLiftCombinersState extends HasIgnoreTreeUnderSymbols, HasSelfOriginsResolver {
}

export interface MergeTraitsState extends HasIgnoreTreeUnderSymbols, HasSelfOriginsResolver {
}

export type SelfOriginResolver = (key: PropertyKey) => OriginLeafs | undefined

export type SelfOriginResolverFactory = (jso: unknown) => SelfOriginResolver

export type OriginCache = Map<unknown, ChainItem>

export interface DefineOriginsAndResolveRefState extends HasIgnoreTreeUnderSymbols {
  originParent: ChainItem | undefined
  originCollector: OriginsMetaRecord
  lazySourceOriginCollector: Map<unknown, OriginsMetaRecord>
  originCache: OriginCache
  syntheticsJumps: Map<unknown, () => unknown>
}

export interface ValidateState extends HasIgnoreTreeUnderSymbols {
  propertiesToCleanup: PropertyKey[]
}

export interface UnifyState extends HasIgnoreTreeUnderSymbols, HasSelfOriginsResolver, HasParentValue {
}

export const CURRENT_DATA_LEVEL = 'current-data-level'
export const BEFORE_SECOND_DATA_LEVEL = 'second-data-levels'

export type InclusionStrategy =
  typeof CURRENT_DATA_LEVEL |
  typeof BEFORE_SECOND_DATA_LEVEL

export interface NormalizationRule {
  readonly merge?: MergeResolver<any>
  readonly mergeTraits?: boolean  // flag to indicate this path triggers traits merging
  readonly validate?: ValidateFunction[] | ValidateFunction
  readonly canLiftCombiners?: boolean //rename to transform?
  readonly unify?: UnifyFunction[] | UnifyFunction
  readonly mandatoryUnify?: UnifyFunction[] | UnifyFunction
  readonly resolvedReferenceNamePropertyKey?: PropertyKey
  readonly hashStrategy?: InclusionStrategy
  readonly hashOwner?: boolean
  readonly newDataLayer?: boolean
  readonly deprecation?: DeprecationPolicy
  readonly isExtension?: boolean
  readonly referenceHandler?: ReferenceHandler
}

export type MergeAndLiftCombinersSyncCloneHook = SyncCloneHook<MergeAndLiftCombinersState, NormalizationRule>
export type MergeTraitsSyncCloneHook = SyncCloneHook<MergeTraitsState, NormalizationRule>
export type DefineOriginsAndResolveRefSyncCloneHook = SyncCloneHook<DefineOriginsAndResolveRefState, NormalizationRule>
export type ValidateSyncCloneHook = SyncCloneHook<ValidateState, NormalizationRule>
export type UnifySyncCloneHook = SyncCloneHook<UnifyState, NormalizationRule>

export interface RichReference {
  readonly filePath: string,
  readonly pointer: string
  readonly normalized: string
  readonly jsonPath: JsonPath
}

type DeprecationReason = string | undefined

export interface DeprecationPolicy {
  deprecationResolver?: (value: Jso) => DeprecationReason,
  inlineDescriptionSuffixCalculator?: InlineDescriptionSuffixCalculator,
  descriptionCalculator?: DescriptionFunc,
}

export type DescriptionFunc = (ctx: DescriptionContext) => string
export type InlineDescriptionSuffixCalculator = DescriptionFunc

export interface DescriptionContext {
  key: PropertyKey
  source: Record<PropertyKey, unknown>
  paths: JsonPath[]
  suffix: string
}

//reference JSO inline without any modification
export type InlineRefs = JsonPath[]

export const DEFAULT_TYPE_FLAG_PURE = 'pure'
export const DEFAULT_TYPE_FLAG_SYNTHETIC = 'synthetic'
export type DefaultTypeFlag = typeof DEFAULT_TYPE_FLAG_PURE | typeof DEFAULT_TYPE_FLAG_SYNTHETIC

export const DEFAULT_OPTION_ALLOW_NOT_VALID_SYNTHETIC_CHANGES = false
export const DEFAULT_OPTION_ORIGINS_ALREADY_DEFINED = false
export const DEFAULT_OPTION_LIFT_COMBINERS = false
export const DEFAULT_OPTION_RESOLVE_REF = true
export const DEFAULT_OPTION_MERGE_ALL_OF = true
export const DEFAULT_OPTION_MERGE_TRAITS = true
export const DEFAULT_OPTION_UNIFY = false
export const DEFAULT_OPTION_VALIDATE = false
export const DEFAULT_OPTION_ORIGINS_FOR_DEFAULTS: OriginLeafs = [{ parent: undefined, value: '#defaults' }]

//todo extract to Json Crawl and refactor JsonPath to use it
export interface ChainItem {
  parent?: ChainItem
  value: PropertyKey
}

export type OriginLeafs = ChainItem[]
export type OriginsMetaRecord = Record<PropertyKey, OriginLeafs>

export type Jso<T = unknown> = Record<PropertyKey, T> | Array<T>

export interface ValueWithOrigins<T> {
  readonly value: T // real value from JSO with already filled origins
  readonly origins: OriginLeafs //todo | undefined
}

export type Hash = string
export type DeferredHash = () => Hash
