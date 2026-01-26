import {
  ChainItem,
  DefineOriginsAndResolveRefState,
  InternalResolveOptions,
  NormalizationRule,
  OriginsMetaRecord,
  ReferenceHandler,
  RefErrorTypes,
  RichReference,
} from '../types'
import { CloneState, CrawlHookResponse, CrawlRules, isObject, JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { OPEN_API_PROPERTY_DESCRIPTION, OPEN_API_PROPERTY_SUMMARY } from '../rules/openapi.const'
import {
  evaluateSyntheticTitle,
  getOrReuseOrigin,
  ResolvedRef,
  SyntheticAllOf,
} from '../define-origins-and-resolve-ref'
import { OpenApiSpecVersion } from '../spec-type'
import { ErrorMessage } from '../errors'
import { JSON_SCHEMA_PROPERTY_ALL_OF } from '../rules/jsonschema.const'
import { setJsoProperty } from '../utils'

export type ReferenceObjectResolverOverrideField =
  | typeof OPEN_API_PROPERTY_DESCRIPTION
  | typeof OPEN_API_PROPERTY_SUMMARY

export type ReferenceHandlerResponse =
  void
  | CrawlHookResponse<CloneState<DefineOriginsAndResolveRefState>, NormalizationRule>
export type ResolvedRefWithSiblings = ResolvedRefWithChildrenOrigins | ResolvedRefWithIndex
export type RefAndSiblingResolver = (context: ResolvedReferenceContext) => ResolvedRefWithSiblings

export interface ReferenceObjectRuleConfig {
  version: OpenApiSpecVersion,
  allowedOverrides?: ReferenceObjectResolverOverrideField[]
}

export interface JsonSchemaReferenceResolverOptions {
  richRefAllowed: boolean
}

export interface ReferenceHandlerArgs {
  value: unknown,
  safeKey: PropertyKey,
  ref: any,
  path: JsonPath,
  state: CloneState<DefineOriginsAndResolveRefState>,
  options: InternalResolveOptions,
}

export interface ReferenceHandlerArgsWithResolver extends ReferenceHandlerArgs {
  resolveDefaultReference: (resolver: RefAndSiblingResolver) => ReferenceHandlerResponse
}

export interface ResolvedRefWithChildrenOrigins extends ResolvedRef {
  childrenOrigins: OriginsMetaRecord
}

export interface ResolvedRefWithIndex extends ResolvedRef {
  titleIndex: number
  refIndex: number
  siblingIndex: number
}

export interface ResolvedReferenceContext {
  options: InternalResolveOptions
  state: CloneState<DefineOriginsAndResolveRefState>
  resolvedRef: ResolvedRef
  originForObj: ChainItem
  sibling: Record<PropertyKey, unknown>
  rules: CrawlRules<NormalizationRule> | undefined
  syntheticTitleCache: Map<string, Record<PropertyKey, unknown>>
  reference: RichReference
}

export function notAllowedReferenceHandler({
  options,
  state,
  safeKey,
  ref,
  path,
  value,
}: ReferenceHandlerArgsWithResolver): ReferenceHandlerResponse {
  options.onRefResolveError?.(ErrorMessage.referenceNotAllowed(ref), path, ref, RefErrorTypes.REF_NOT_ALLOWED)
  state.node[safeKey] = value
  return { done: true }
}

function setReferenceNamePropertyIfConfigured(
  target: Record<PropertyKey, unknown>,
  referenceNameProperty: symbol | undefined,
  lastReferenceName: string | undefined,
) {
  if (referenceNameProperty && lastReferenceName !== undefined) {
    target[referenceNameProperty] = lastReferenceName
  }
}

export function referenceObjectResolver(overrides?: ReferenceObjectResolverOverrideField[]): ReferenceHandler {
  return ({ resolveDefaultReference }): ReferenceHandlerResponse => {
    const overrideFieldsWithSiblings = ({
      options,
      state,
      resolvedRef,
      originForObj,
      sibling,
    }: ResolvedReferenceContext): ResolvedRefWithSiblings => {
      const { refValue, origin, lastReferenceName } = resolvedRef
      const referenceValue = refValue as Record<PropertyKey, unknown>
      const { originsFlag, referenceNameProperty } = options

      originsFlag && getOrReuseOrigin(referenceValue, originForObj, state.originCache)

      // Add reference name property if configured
      setReferenceNamePropertyIfConfigured(referenceValue, referenceNameProperty, lastReferenceName)

      const childrenOrigins: OriginsMetaRecord = {}
      if (!overrides?.length || !isObject(sibling) || Reflect.ownKeys(sibling).length === 0) {
        return { refValue: referenceValue, origin, childrenOrigins }
      }

      const referenceValueWithSibling = { ...referenceValue }
      overrides.forEach(safeKey => {
        if (safeKey in sibling) {
          referenceValueWithSibling[safeKey] = sibling[safeKey]
          childrenOrigins[safeKey] = [{
            parent: originForObj,
            value: safeKey,
          }]
        }
      })
      // Add reference name property to the copy with overrides as well
      setReferenceNamePropertyIfConfigured(referenceValueWithSibling, referenceNameProperty, lastReferenceName)
      originsFlag && getOrReuseOrigin(sibling, originForObj, state.originCache)
      return { refValue: referenceValueWithSibling, origin, childrenOrigins }
    }
    return resolveDefaultReference(overrideFieldsWithSiblings)
  }
}

export function jsonSchemaReferenceResolver({ richRefAllowed }: JsonSchemaReferenceResolverOptions): ReferenceHandler {
  return ({ resolveDefaultReference, ref, path }): ReferenceHandlerResponse => {
    const wrapRefWithAllOfIfNeed = ({
      options,
      state,
      resolvedRef,
      originForObj,
      sibling,
      rules,
      syntheticTitleCache,
      reference,
    }: ResolvedReferenceContext): ResolvedRefWithSiblings => {
      const { refValue, origin } = resolvedRef

      if (!richRefAllowed && Reflect.ownKeys(sibling).length !== 0) {
        options.onRefResolveError?.(ErrorMessage.richRefObjectNotAllowed(ref), path, ref, RefErrorTypes.RICH_REF_NOT_ALLOWED)
        sibling = {}
      }

      const referenceValue = refValue as Record<PropertyKey, unknown>

      const wrap: SyntheticAllOf & Record<PropertyKey, unknown> = { [JSON_SCHEMA_PROPERTY_ALL_OF]: [] }
      options.originsFlag && getOrReuseOrigin(wrap, originForObj, state.originCache)
      options.originsFlag && getOrReuseOrigin(wrap[JSON_SCHEMA_PROPERTY_ALL_OF], originForObj, state.originCache)
      options.syntheticAllOfFlag && setJsoProperty(wrap, options.syntheticAllOfFlag, true)
      let titleIndex = -1
      let refIndex = 0
      let siblingIndex = -1
      if (options.syntheticTitleFlag && rules?.resolvedReferenceNamePropertyKey) {
        let syntheticTitle = syntheticTitleCache?.get(reference.normalized)
        if (syntheticTitle === undefined) {
          syntheticTitle = evaluateSyntheticTitle(reference.jsonPath, options.syntheticTitleFlag, rules.resolvedReferenceNamePropertyKey)
          syntheticTitleCache.set(reference.normalized, syntheticTitle)
          state.lazySourceOriginCollector.set(syntheticTitle, { [rules.resolvedReferenceNamePropertyKey]: origin ? [origin] : [] })
        }
        wrap.allOf.push(syntheticTitle)
        titleIndex = 0
        refIndex++
      }
      wrap.allOf.push(referenceValue)
      options.originsFlag && getOrReuseOrigin(referenceValue, originForObj, state.originCache)
      if (Reflect.ownKeys(sibling).length) {
        wrap.allOf.push(sibling)
        siblingIndex = refIndex + 1
        options.originsFlag && getOrReuseOrigin(sibling, originForObj, state.originCache)
      }
      return wrap.allOf.length === 1
        ? { refValue: referenceValue, origin, childrenOrigins: {} }
        : { refValue: wrap, titleIndex, refIndex, siblingIndex, origin }
    }

    return resolveDefaultReference(wrapRefWithAllOfIfNeed)
  }
}
