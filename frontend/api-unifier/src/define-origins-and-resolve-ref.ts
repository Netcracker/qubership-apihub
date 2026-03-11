import {
  CloneState,
  CrawlRules,
  isObject,
  JSON_ROOT_KEY,
  JsonPath,
  syncClone,
  SyncCloneHook,
  syncCrawl,
} from '@netcracker/qubership-apihub-json-crawl'
import { isRefNode, parsePointer, parseRef, pathItemToFullPath, resolveValueByPath, setJsoProperty } from './utils'
import {
  ChainItem,
  DEFAULT_OPTION_RESOLVE_REF,
  DefineOriginsAndResolveRefState,
  DefineOriginsAndResolveRefSyncCloneHook,
  InternalResolveOptions,
  NormalizationRule,
  OriginCache,
  OriginsMetaRecord,
  RefErrorTypes,
  ResolveOptions,
  RichReference,
} from './types'
import { resolveSpec } from './spec-type'
import { ErrorMessage } from './errors'
import { createCycledJsoHandlerHook } from './cycle-jso'
import { JSON_SCHEMA_PROPERTY_ALL_OF, JSON_SCHEMA_PROPERTY_REF } from './rules/jsonschema.const'
import { RULES } from './rules'
import { setOrigins } from './origins'
import {
  RefAndSiblingResolver,
  ReferenceHandlerResponse,
  ResolvedRefWithChildrenOrigins,
  ResolvedRefWithIndex,
  ResolvedRefWithSiblings,
} from './references/ref-resolver'

export interface SyntheticAllOf {
  [JSON_SCHEMA_PROPERTY_ALL_OF]: Array<unknown>
}

//maybe external function in options in future
export function evaluateSyntheticTitle(
  path: JsonPath,
  syntheticTitleFlag: symbol,
  targetPropertyKey: PropertyKey,
): Record<PropertyKey, unknown> {
  if (!path.length) {
    return {}
  }
  const result = {
    [targetPropertyKey]: path.at(-1)?.toString(),
    [syntheticTitleFlag]: true,
  }
  return result
}

const IMPOSSIBLE_ORIGIN_PARENT: ChainItem = { parent: undefined, value: 'ERROR!!!' }

export const defineOriginsAndResolveRef = (value: unknown, options?: ResolveOptions) => {
  const spec = resolveSpec(value)
  const source = options?.source ?? value

  const internalOptions = {
    resolveRef: DEFAULT_OPTION_RESOLVE_REF,
    originsAlreadyDefined: !!options?.originsFlag,
    ...options,
    originsFlag: options?.originsAlreadyDefined ? undefined : options?.originsFlag,
    source,
    ignoreSymbols: new Set([
      ...(options?.originsFlag ? [options.originsFlag] : []),
      ...(options?.inlineRefsFlag ? [options.inlineRefsFlag] : []),
      ...(options?.syntheticTitleFlag ? [options.syntheticTitleFlag] : []),
      ...(options?.syntheticAllOfFlag ? [options.syntheticAllOfFlag] : []),
      ...(options?.firstReferenceKeyProperty ? [options.firstReferenceKeyProperty] : []),
      ...(options?.lastReferenceKeyProperty ? [options.lastReferenceKeyProperty] : []),
      ...(options?.ignoreSymbols ? options.ignoreSymbols : []),
    ]),
  } satisfies InternalResolveOptions
  const cycledJsoHandlerHook = createCycledJsoHandlerHook<DefineOriginsAndResolveRefState, NormalizationRule>()

  const originCache: OriginCache = new Map()
  const resolvedJso = syncClone<DefineOriginsAndResolveRefState, NormalizationRule>(value, [cycledJsoHandlerHook, createDefineOriginsAndResolveRefHook(value, internalOptions, cycledJsoHandlerHook), cycledJsoHandlerHook], {
    rules: RULES[spec.type],
    state: {
      ignoreTreeUnderSymbols: false,
      originParent: undefined,
      originCollector: {},
      lazySourceOriginCollector: new Map(),
      syntheticsJumps: new Map(),
      originCache,
    },
  })

  if (options?.originsFlag) {
    const origins = [...originCache.values()]
    if (isObject(resolvedJso) && options.originsFlag in resolvedJso) {
      origins.push(...[...Object.values(resolvedJso[options.originsFlag] as OriginsMetaRecord)].flatMap(v => v))
    }
    cleanupRootOrigin(origins)
  }

  return resolvedJso
}

export const deDefineOriginsAndResolvedRefSymbols = (value: unknown, options?: ResolveOptions) => {
  const originsFlag = options?.originsFlag
  const originsAlreadyDefined = options?.originsAlreadyDefined
  const titleFlag = options?.syntheticTitleFlag
  const allOfFlag = options?.syntheticAllOfFlag
  const inlineFlag = options?.inlineRefsFlag
  if (!originsFlag && !titleFlag && !allOfFlag && !inlineFlag) {
    return value
  }
  const ignoreSymbols: Set<PropertyKey> = new Set([
    ...(options?.originsFlag ? [options.originsFlag] : []),
    ...(options?.inlineRefsFlag ? [options.inlineRefsFlag] : []),
    ...(options?.syntheticTitleFlag ? [options.syntheticTitleFlag] : []),
    ...(options?.syntheticAllOfFlag ? [options.syntheticAllOfFlag] : []),
    ...(options?.ignoreSymbols ? options.ignoreSymbols : []),
  ])
  const cycleGuard: Set<unknown> = new Set()
  syncCrawl(value, ({ key, value }) => {
    if (!isObject(value)) {
      return { done: true }
    }
    if (ignoreSymbols.has(key)) {
      return { done: true }
    }
    if (cycleGuard.has(value)) {
      return { done: true }
    }
    cycleGuard.add(value)
    originsFlag && !originsAlreadyDefined && delete value[originsFlag]
    titleFlag && delete value[titleFlag]
    allOfFlag && delete value[allOfFlag]
    inlineFlag && delete value[inlineFlag]
    return { value }
  })
  return value
}

const createDefineOriginsAndResolveRefHook: (rootJso: unknown, options: InternalResolveOptions, cycleJsoHook: SyncCloneHook<DefineOriginsAndResolveRefState>) => DefineOriginsAndResolveRefSyncCloneHook = (rootJso, options, cycleJsoHook) => {
  const cyclingGuard: Set<unknown> = new Set()
  const syntheticTitleCache: Map<string, Record<PropertyKey, unknown>> = new Map()
  const defineOriginsAndResolveRefHook: DefineOriginsAndResolveRefSyncCloneHook = ({
    key,
    value,
    state,
    path,
    rules,
  }) => {
    if (state.ignoreTreeUnderSymbols) {
      return { value }
    }
    const safeKey = key ?? JSON_ROOT_KEY
    if (typeof safeKey === 'symbol' && options.ignoreSymbols.has(safeKey)) {
      return { value, state: { ...state, ignoreTreeUnderSymbols: true, originParent: IMPOSSIBLE_ORIGIN_PARENT } }
    }
    const originForLeaf = () => {
      if (options.originsFlag) {
        state.originCollector[safeKey] = state.originCollector[safeKey] ?? [{
          parent: state.originParent,
          value: safeKey,
        }]
      }
    }
    if (!isObject(value)) {
      originForLeaf()
      return { value, state: { ...state, originParent: IMPOSSIBLE_ORIGIN_PARENT } }
    }
    const originForObj = options.originsFlag ? getOrSimpleCreateOrigin(value, state.originParent, safeKey, state.originCache) : IMPOSSIBLE_ORIGIN_PARENT

    if (options.resolveRef) {
      const { $ref, ...otherSibling } = value
      const sibling = otherSibling

      if ($ref) {
        const { referenceHandler } = rules || {}
        if (!referenceHandler) {
          options.onRefResolveError?.(ErrorMessage.referenceNotAllowed($ref), path, $ref, RefErrorTypes.REF_NOT_ALLOWED)
          state.node[safeKey] = value
          return { done: true }
        }

        const resolveDefaultReference = (referenceHandler: RefAndSiblingResolver): ReferenceHandlerResponse => {
          const originForRef = getOrReuseOrigin(originForObj, {
            parent: originForObj,
            value: JSON_SCHEMA_PROPERTY_REF,
          }, state.originCache) //abuse cache. Keys should be a real node value only!!!
          if (typeof $ref !== 'string') {
            options.onRefResolveError?.(ErrorMessage.refNotValidFormat($ref), path, $ref, RefErrorTypes.REF_NOT_VALID_FORMAT)
            const brokenValueClone = { [JSON_SCHEMA_PROPERTY_REF]: $ref }
            state.node[safeKey] = brokenValueClone
            setOrigins(state.node, safeKey, options.originsFlag, [originForObj])
            setOrigins(brokenValueClone, JSON_SCHEMA_PROPERTY_REF, options.originsFlag, [originForRef])
            return { done: true }
          }
          const reference = parseRef($ref)

          const processWrapRefWithAllOfReference = (resolvedRefWithSibling: ResolvedRefWithSiblings) => {
            const {
              refValue,
              origin,
              refIndex = 0,
              siblingIndex = 0,
              titleIndex = 0,
            } = resolvedRefWithSibling as ResolvedRefWithIndex
            const wrap: SyntheticAllOf & Record<PropertyKey, unknown> = refValue as SyntheticAllOf & Record<PropertyKey, unknown>
            const childrenOrigins: OriginsMetaRecord = {}
            state.syntheticsJumps.set(wrap, () => wrap[JSON_SCHEMA_PROPERTY_ALL_OF][refIndex])
            return {
              value: wrap,
              state: {
                ...state,
                originParent: originForObj,//? proof
                originCollector: {}, //no need ? proof
              },
              afterHooksHook: () => {
                const node = state.node[safeKey]
                if (options.originsFlag && isObject(node)) {
                  state.originCollector[safeKey] = [getOrReuseOrigin(node, originForObj, state.originCache)]
                }
              },
              exitHook: () => {
                const clonedAllOf = state.node[safeKey] as SyntheticAllOf
                const alreadyExistedIndexOrigins: OriginsMetaRecord = {
                  [refIndex]: [originForRef],
                }
                if (titleIndex >= 0) {
                  alreadyExistedIndexOrigins[titleIndex] = [originForRef]
                }
                if (siblingIndex >= 0) {
                  alreadyExistedIndexOrigins[siblingIndex] = [originForObj]
                }
                state.syntheticsJumps.set(clonedAllOf, () => clonedAllOf[JSON_SCHEMA_PROPERTY_ALL_OF][refIndex])
                const clonedAllArray = clonedAllOf.allOf as unknown as Record<PropertyKey, unknown>/*abuse TS to allow add symbols*/
                const clonedRef = clonedAllArray[refIndex]
                options.inlineRefsFlag && isObject(clonedRef) && addRefInlineHistory(clonedRef, options.inlineRefsFlag, reference)
                if (options.originsFlag && isObject(clonedRef) && origin) {
                  state.originCollector[safeKey] = [originForObj] //todo use cache service (parentOrigin + value)
                  const lazyOrigins = state.lazySourceOriginCollector.get(refValue) ?? {} //need proof for this rows
                  clonedRef[options.originsFlag] = {
                    ...(clonedRef[options.originsFlag] ?? {}),
                    ...lazyOrigins,
                    ...childrenOrigins,
                  } satisfies OriginsMetaRecord
                  clonedAllArray[options.originsFlag] = {
                    ...(clonedAllArray[options.originsFlag] ?? {}),
                    ...alreadyExistedIndexOrigins,
                  } satisfies OriginsMetaRecord
                  Object.assign(clonedAllOf, {
                    [options.originsFlag]: {
                      [JSON_SCHEMA_PROPERTY_ALL_OF]: [originForObj],
                    } as OriginsMetaRecord,
                  })
                }
              },
            }
          }

          const processReferenceWithChildren = (resolvedRefWithSibling: ResolvedRefWithSiblings) => {
            const { refValue, origin, childrenOrigins, firstReferenceKey, lastReferenceKey } = resolvedRefWithSibling as ResolvedRefWithChildrenOrigins
            const captureFirstReferenceKey = options.firstReferenceKeyProperty && rules?.captureFirstReferenceKey && firstReferenceKey !== undefined
            const refValueToUse = captureFirstReferenceKey && options.firstReferenceKeyProperty && isObject(refValue)
              ? copyTargetIfFirstKeyDiffers(refValue as Record<PropertyKey, unknown>, options.firstReferenceKeyProperty, firstReferenceKey)
              : refValue
            return {
              value: refValueToUse,
              state: {
                ...state,
                originParent: origin,
                originCollector: childrenOrigins,
                firstReferenceKeyForCapture: undefined,
              },
              afterHooksHook: () => {
                const node = state.node[safeKey]
                if (options.originsFlag && isObject(node)) {
                  state.originCollector[safeKey] = [getOrReuseOrigin(node, originForObj, state.originCache)]
                  state.lazySourceOriginCollector.set(node, state.lazySourceOriginCollector.get(refValue) ?? {})
                }
              },
              exitHook: () => {
                const node = state.node[safeKey]
                options.inlineRefsFlag && isObject(node) && addRefInlineHistory(node, options.inlineRefsFlag, reference)
                options.firstReferenceKeyProperty && isObject(node) && firstReferenceKey !== undefined && setJsoProperty(node, options.firstReferenceKeyProperty, firstReferenceKey)
                options.lastReferenceKeyProperty && isObject(node) && setJsoProperty(node, options.lastReferenceKeyProperty, lastReferenceKey)
                if (options.originsFlag && isObject(node) && origin) {
                  state.originCollector[safeKey] = [originForObj]
                  const lazyOrigins = state.lazySourceOriginCollector.get(refValue) ?? {} //need proof for this rows
                  node[options.originsFlag] = {
                    ...(node[options.originsFlag] ?? {}),
                    ...lazyOrigins,
                    ...childrenOrigins,
                  }
                }
              },
            }
          }

          const processResolvedReference = (resolvedRefWithSibling: ResolvedRefWithSiblings) => {
            if (hasChildrenOrigins(resolvedRefWithSibling)) {
              return processReferenceWithChildren(resolvedRefWithSibling)
            }
            return processWrapRefWithAllOfReference(resolvedRefWithSibling)
          }

          if (cyclingGuard.has(reference.normalized)) {
            return { value: undefined, done: true }//just break the possible stackoverflow
          } else {
            cyclingGuard.add(reference.normalized)
          }
          const previousFirstReferenceKeyForCapture = state.firstReferenceKeyForCapture
          try {
            if (rules?.captureFirstReferenceKey && options.firstReferenceKeyProperty) {
              state.firstReferenceKeyForCapture = state.firstReferenceKeyForCapture ?? reference.jsonPath.at(-1)?.toString()
            }
            const firstReferenceKeyForResolve = (rules?.captureFirstReferenceKey && options.firstReferenceKeyProperty) ? state.firstReferenceKeyForCapture : undefined
            const updateLazyParentChainItem: (item: ChainItem, parentValue: unknown | undefined, propertyKey: PropertyKey) => void = (item, parentValue, propertyKey) =>
              state.lazySourceOriginCollector.set(parentValue, {
                ...(state.lazySourceOriginCollector.get(parentValue) ?? {}),
                [propertyKey]: [item],
              })
            const refInResultedJso = resolveRefNode(
              reference,
              state.root[JSON_ROOT_KEY],
              defineOriginsAndResolveRefHook,
              cycleJsoHook,
              state,
              rules,
              options.originsFlag
                ? (value, parentChain, parentValue, propertyKey) =>
                  getOrSimpleCreateOrigin(value, parentChain, propertyKey, state.originCache/*, item => updateLazyParentChainItem(item, parentValue, propertyKey) proof by test*/)
                : undefined,
              firstReferenceKeyForResolve,
              options.lastReferenceKeyProperty,
            )
            if (refInResultedJso?.refValue !== undefined && refInResultedJso?.refValue !== null) {
              const resolvedRefWithRules = referenceHandler({
                options,
                state,
                rules,
                resolvedRef: refInResultedJso,
                originForObj,
                sibling,
                syntheticTitleCache,
                reference,
              })
              return processResolvedReference(resolvedRefWithRules)
            }
            const refInSourceJso = resolveRefNode(
              reference,
              options.source,
              defineOriginsAndResolveRefHook,
              cycleJsoHook,
              state,
              rules,
              options.originsFlag
                ? (value, parentChain, parentValue, propertyKey) =>
                  getOrCustomCreateOrigin(value,
                    () => {
                      const resolvedPath = parentChain ? pathItemToFullPath(parentChain) : []
                      const parentValueFromAlreadyCopiedJso = resolveValueByPath(state.root[JSON_ROOT_KEY], resolvedPath)
                      if (isObject(parentValueFromAlreadyCopiedJso) && propertyKey in parentValueFromAlreadyCopiedJso) {
                        return getOrSimpleCreateOrigin(parentValueFromAlreadyCopiedJso[propertyKey], parentChain, propertyKey, state.originCache/*, item => updateLazyParentChainItem(item, parentValueFromAlreadyCopiedJso, propertyKey) proof by test*/)
                      }
                      const parentValueThatNotYetHandledFromMain = resolveValueByPath(rootJso, resolvedPath)
                      if (isObject(parentValueThatNotYetHandledFromMain) && propertyKey in parentValueThatNotYetHandledFromMain) {
                        return getOrSimpleCreateOrigin(parentValueThatNotYetHandledFromMain[propertyKey], parentChain, propertyKey, state.originCache, item => updateLazyParentChainItem(item, parentValueThatNotYetHandledFromMain, propertyKey))
                      }
                      return getOrSimpleCreateOrigin(value, parentChain, propertyKey, state.originCache, item => updateLazyParentChainItem(item, parentValue, propertyKey))
                    },
                    state.originCache)
                : undefined,
              firstReferenceKeyForResolve,
              options.lastReferenceKeyProperty,
            )
            if (refInSourceJso?.refValue !== undefined && refInSourceJso?.refValue !== null) {
              const resolvedRefWithRules = referenceHandler({
                options,
                state,
                rules,
                resolvedRef: refInSourceJso,
                originForObj,
                sibling,
                syntheticTitleCache,
                reference,
              })
              return processResolvedReference(resolvedRefWithRules)
            }
            options.onRefResolveError?.(ErrorMessage.refNotFound($ref), path, $ref, RefErrorTypes.REF_NOT_FOUND)
            const brokenValueClone = { [JSON_SCHEMA_PROPERTY_REF]: $ref }
            state.node[safeKey] = brokenValueClone
            setOrigins(state.node, safeKey, options.originsFlag, [originForObj])
            setOrigins(brokenValueClone, JSON_SCHEMA_PROPERTY_REF, options.originsFlag, [originForRef])
            return { done: true }
          } finally {
            cyclingGuard.delete(reference.normalized)
            state.firstReferenceKeyForCapture = previousFirstReferenceKeyForCapture
          }
        }
        return referenceHandler({ path, ref: $ref, safeKey, options, state, value, resolveDefaultReference })
      }
    }

    const childrenOrigins: OriginsMetaRecord = state.lazySourceOriginCollector.get(value) ?? {}
    return {
      value,
      state: {
        ...state,
        originCollector: childrenOrigins,
        originParent: originForObj,
      },
      afterHooksHook: () => {
        const node = state.node[safeKey]
        if (options.originsFlag && isObject(node)) {
          state.originCollector[safeKey] = [getOrReuseOrigin(node, originForObj, state.originCache)]
          state.lazySourceOriginCollector.set(node, childrenOrigins)
        }
      },
      exitHook: () => {
        const node = state.node[safeKey]
        if (options.originsFlag && isObject(node)) {
          state.originCollector[safeKey] = [getOrReuseOrigin(node, originForObj, state.originCache)]
          const lazyOrigins = state.lazySourceOriginCollector.get(value) ?? {}
          node[options.originsFlag] = {
            ...(node[options.originsFlag] ?? {}),
            ...lazyOrigins,
            ...childrenOrigins,
          }
        }
      },
    }
  }
  return defineOriginsAndResolveRefHook
}

const addRefInlineHistory: (jso: Record<PropertyKey, unknown>, inlineRefsFlag: symbol, reference: RichReference) => void = (jso, inlineRefsFlag, reference) => {
  let history = jso[inlineRefsFlag] as string[] | undefined
  if (!history) {
    jso[inlineRefsFlag] = history = []
  }
  const normalized = reference.normalized
  if (!history.includes(normalized)) { history.push(normalized) }
}

/**
 * Returns an object that has the given first reference key set. If the target already has a different
 * first key, returns a shallow copy (with symbol properties preserved) and sets the first key on the copy;
 * otherwise sets the first key on the target and returns it.
 */
function copyTargetIfFirstKeyDiffers(
  target: Record<PropertyKey, unknown>,
  firstReferenceKeyProperty: symbol,
  firstReferenceKey: string,
): Record<PropertyKey, unknown> {
  const existingFirstReferenceKey = target[firstReferenceKeyProperty]
  if (existingFirstReferenceKey === firstReferenceKey) {
    return target
  }
  if (existingFirstReferenceKey === undefined) {
    target[firstReferenceKeyProperty] = firstReferenceKey
    return target
  }
  // Target already has a different first key: create a shallow copy and set this first key on the copy.
  const copy = { ...target }
  copy[firstReferenceKeyProperty] = firstReferenceKey
  return copy
}

const resolveRefNode = (
  reference: RichReference,
  source: unknown,
  resolveRefHook: DefineOriginsAndResolveRefSyncCloneHook,
  cycleJsoHook: SyncCloneHook<DefineOriginsAndResolveRefState>,
  state: CloneState<DefineOriginsAndResolveRefState>,
  rules: CrawlRules<NormalizationRule> | undefined,
  originResolver?: (value: unknown, parentChain: ChainItem | undefined, parentValue: unknown | undefined, propertyKey: PropertyKey) => ChainItem,
  firstReferenceKey?: string,
  lastReferenceKeyProperty?: symbol,
): ResolvedRef | undefined => {
  if (!isObject(source)) {
    return undefined
  }
  if (reference.filePath) {
    return undefined
  }
  let value: unknown = source
  let parentValue: unknown = undefined
  let pathChain: ChainItem | undefined = undefined
  const path = parsePointer(reference.pointer)
  // Initialize with the name from the initial reference
  let lastReferenceKey: string | undefined = reference.jsonPath.length > 0
    ? reference.jsonPath.at(-1)?.toString()
    : undefined
  let isRefValue: boolean
  while ((isRefValue = isRefNode(value)) || path.length) {
    const key = path[0]
    if (isRefValue) {
      //when ref go to the object that contains not yet resolved ref
      const originCollector: OriginsMetaRecord = {}
      parentValue = value
      // Track the reference name from the $ref
      const refString = isObject(value) ? value.$ref : undefined
      if (typeof refString === 'string') {
        const parsedRef = parseRef(refString)
        if (parsedRef.jsonPath.length > 0) {
          lastReferenceKey = parsedRef.jsonPath.at(-1)?.toString()
        }
      }
      value = syncClone<DefineOriginsAndResolveRefState, NormalizationRule>(value, [cycleJsoHook, resolveRefHook, cycleJsoHook], {
        state: {
          ...state,
          originParent: undefined,
          originCollector: originCollector,
        }, rules,
      })
      if (isRefNode(value)) { //it possible only for broken refs
        return undefined
      }
      pathChain = originResolver?.(value, pathChain, parentValue, key)
      continue
    }
    const jumpF = state.syntheticsJumps.get(value)
    if (jumpF) {
      value = jumpF()
    }
    if (Array.isArray(value) && value.length > +key) {
      parentValue = value
      value = value[+key]
      path.shift()
    } else if (isObject(value) && key in value) {
      parentValue = value
      value = value[key]
      path.shift()
    } else {
      parentValue = value
      value = undefined
    }
    if (value === undefined) {
      return undefined
    }
    pathChain = originResolver?.(value, pathChain, parentValue, key)
  }
  // If we reached an already-resolved value (e.g. from a prior path), use its last reference key
  if (lastReferenceKeyProperty && isObject(value) && lastReferenceKeyProperty in value) {
    lastReferenceKey = value[lastReferenceKeyProperty] as string
  }
  return {
    refValue: value,
    origin: pathChain,
    lastReferenceKey,
    firstReferenceKey,
  }
}

function hasChildrenOrigins(resolvedRef: ResolvedRefWithSiblings): resolvedRef is ResolvedRefWithChildrenOrigins {
  return 'childrenOrigins' in resolvedRef && resolvedRef.childrenOrigins !== undefined
}

export function getOrReuseOrigin(jsoInstance: unknown, origin: ChainItem, originCache: OriginCache, afterReuse?: (item: ChainItem) => void): ChainItem {
  return getOrCustomCreateOrigin(jsoInstance, () => {
    afterReuse?.(origin)
    return origin
  }, originCache)
}

function getOrSimpleCreateOrigin(jsoInstance: unknown, parent: ChainItem | undefined, value: PropertyKey, originCache: OriginCache, afterCreate?: (item: ChainItem) => void): ChainItem {
  return getOrCustomCreateOrigin(jsoInstance, () => {
    const origin = { parent, value }
    afterCreate?.(origin)
    return origin
  }, originCache)
}

function getOrCustomCreateOrigin(jsoInstance: unknown, originF: () => ChainItem, originCache: OriginCache): ChainItem {
  let result = originCache.get(jsoInstance)
  if (!result) {
    result = originF()
    originCache?.set(jsoInstance, result)
  }
  return result
}

function cleanupRootOrigin(origins: ChainItem[]): void {
  origins.forEach(origin => {
    if (origin.parent && origin.parent.value === JSON_ROOT_KEY) {
      origin.parent = undefined
    }
  })
}

export interface ResolvedRef {
  refValue: unknown
  origin: ChainItem | undefined
  firstReferenceKey?: string
  lastReferenceKey?: string
}
