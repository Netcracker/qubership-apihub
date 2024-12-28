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
import { isPureRefNode, parsePointer, parseRef, pathItemToFullPath, resolveValueByPath, setJsoProperty } from './utils'
import {
  ChainItem,
  DEFAULT_OPTION_RESOLVE_REF,
  DefineOriginsAndResolveRefState,
  DefineOriginsAndResolveRefSyncCloneHook,
  InternalResolveOptions,
  NormalizationRule,
  OriginCache,
  OriginsMetaRecord,
  ResolveOptions,
  RichReference,
} from './types'
import { resolveSpec, SPEC_TYPE_GRAPH_API, SPEC_TYPE_OPEN_API_31 } from './spec-type'
import { ErrorMessage } from './errors'
import { createCycledJsoHandlerHook } from './cycle-jso'
import { JSON_SCHEMA_PROPERTY_ALL_OF, JSON_SCHEMA_PROPERTY_REF } from './rules/jsonschema.const'
import { RULES } from './rules'
import { setOrigins } from './origins'

interface SyntheticAllOf {
  [JSON_SCHEMA_PROPERTY_ALL_OF]: Array<unknown>
}

//maybe external function in options in future
function evaluateSyntheticTitle(
  path: JsonPath,
  syntheticTitleFlag: symbol,
  targetPropertyKey: PropertyKey,
): Record<PropertyKey, unknown> {
  if (!path.length) {
    return {}
  }
  const result = {
    [targetPropertyKey]: path[path.length - 1].toString(),
    [syntheticTitleFlag]: true,
  }
  return result
}

const IMPOSSIBLE_ORIGIN_PARENT: ChainItem = { parent: undefined, value: 'ERROR!!!' }

export const defineOriginsAndResolveRef = (value: unknown, options?: ResolveOptions) => {
  const spec = resolveSpec(value)
  const internalOptions = {
    resolveRef: DEFAULT_OPTION_RESOLVE_REF,
    originsAlreadyDefined: !!options?.originsFlag,
    ...options,
    originsFlag: options?.originsAlreadyDefined ? undefined : options?.originsFlag,
    source: options?.source ?? value,
    richRefAllowed: spec.type === SPEC_TYPE_OPEN_API_31 || spec.type === SPEC_TYPE_GRAPH_API,
    ignoreSymbols: new Set([
      ...(options?.originsFlag ? [options.originsFlag] : []),
      ...(options?.inlineRefsFlag ? [options.inlineRefsFlag] : []),
      ...(options?.syntheticTitleFlag ? [options.syntheticTitleFlag] : []),
      ...(options?.syntheticAllOfFlag ? [options.syntheticAllOfFlag] : []),
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
  const defineOriginsAndResolveRefHook: DefineOriginsAndResolveRefSyncCloneHook = ({ key, value, state, path, rules }) => {
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
      let sibling = otherSibling
      if ($ref) {
        const originForRef = getOrReuseOrigin(originForObj, {
          parent: originForObj,
          value: JSON_SCHEMA_PROPERTY_REF,
        }, state.originCache) //abuse cache. Keys should be a real node value only!!!
        if (typeof $ref !== 'string') {
          options.onRefResolveError?.(ErrorMessage.refNotValidFormat($ref), path, $ref)
          const brokenValueClone = { [JSON_SCHEMA_PROPERTY_REF]: $ref }
          state.node[safeKey] = brokenValueClone
          setOrigins(state.node, safeKey, options.originsFlag, [originForObj])
          setOrigins(brokenValueClone, JSON_SCHEMA_PROPERTY_REF, options.originsFlag, [originForRef])
          return { done: true }
        }
        if (!options.richRefAllowed && Reflect.ownKeys(sibling).length !== 0) {
          options.onRefResolveError?.(ErrorMessage.richRefObjectNotAllowed(), path, $ref)
          sibling = {}
        }
        const reference = parseRef($ref)

        //todo return specific exitHook, and ending in single point of defineOriginsAndResolveRefHook
        const wrapRefWithAllOfIfNeed: (refJso: unknown, sibling: Record<PropertyKey, unknown>, refOrigin: ChainItem | undefined) => ReturnType<DefineOriginsAndResolveRefSyncCloneHook> = (refJso, sibling, refOrigin) => {
          const wrap: SyntheticAllOf & Record<PropertyKey, unknown> = { [JSON_SCHEMA_PROPERTY_ALL_OF]: [] }
          options.originsFlag && getOrReuseOrigin(wrap, originForObj, state.originCache)
          options.originsFlag && getOrReuseOrigin(wrap[JSON_SCHEMA_PROPERTY_ALL_OF], originForObj, state.originCache)
          options.syntheticAllOfFlag && setJsoProperty(wrap, options.syntheticAllOfFlag, true)
          let titleIndex = -1
          let refIndex = 0
          let siblingIndex = -1
          if (options.syntheticTitleFlag && rules?.resolvedReferenceNamePropertyKey) {
            let syntheticTitle = syntheticTitleCache.get(reference.normalized)
            if (syntheticTitle === undefined) {
              syntheticTitle = evaluateSyntheticTitle(reference.jsonPath, options.syntheticTitleFlag, rules.resolvedReferenceNamePropertyKey)
              syntheticTitleCache.set(reference.normalized, syntheticTitle)
              state.lazySourceOriginCollector.set(syntheticTitle, { [rules.resolvedReferenceNamePropertyKey]: refOrigin ? [refOrigin] : [] })
            }
            wrap.allOf.push(syntheticTitle)
            titleIndex = 0
            refIndex++
          }
          wrap.allOf.push(refJso)
          options.originsFlag && getOrReuseOrigin(refJso, originForObj, state.originCache)
          if (Reflect.ownKeys(sibling).length) {
            wrap.allOf.push(sibling)
            siblingIndex = refIndex + 1
            options.originsFlag && getOrReuseOrigin(sibling, originForObj, state.originCache)
          }
          const childrenOrigins: OriginsMetaRecord = {}
          if (wrap.allOf.length === 1) {
            return {
              value: refJso,
              state: {
                ...state,
                originParent: refOrigin,
                originCollector: childrenOrigins,
              },
              afterHooksHook: () => {
                const node = state.node[safeKey]
                if (options.originsFlag && isObject(node)) {
                  state.originCollector[safeKey] = [getOrReuseOrigin(node, originForObj, state.originCache)]
                  state.lazySourceOriginCollector.set(node, state.lazySourceOriginCollector.get(value) ?? {})
                }
              },
              exitHook: () => {
                const node = state.node[safeKey]
                options.inlineRefsFlag && isObject(node) && addRefInlineHistory(node, options.inlineRefsFlag, reference)
                if (options.originsFlag && isObject(node) && refOrigin) {
                  state.originCollector[safeKey] = [originForObj]
                  const lazyOrigins = state.lazySourceOriginCollector.get(value) ?? {} //need proof for this rows
                  node[options.originsFlag] = {
                    ...(node[options.originsFlag] ?? {}),
                    ...lazyOrigins,
                    ...childrenOrigins,
                  }
                }
              },
            }
          }
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
              if (options.originsFlag && isObject(clonedRef) && refOrigin) {
                state.originCollector[safeKey] = [originForObj] //todo use cache service (parentOrigin + value)
                const lazyOrigins = state.lazySourceOriginCollector.get(value) ?? {} //need proof for this rows
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

        if (cyclingGuard.has(reference.normalized)) {
          return { value: undefined, done: true }//just break the possible stackoverflow
        } else {
          cyclingGuard.add(reference.normalized)
        }
        try {
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
          )
          if (refInResultedJso?.refValue !== undefined && refInResultedJso?.refValue !== null) {
            const { refValue, origin } = refInResultedJso
            return wrapRefWithAllOfIfNeed(refValue, sibling, origin)
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
          )
          if (refInSourceJso?.refValue !== undefined && refInSourceJso?.refValue !== null) {
            const { refValue, origin } = refInSourceJso
            return wrapRefWithAllOfIfNeed(refValue, sibling, origin)
          }
          options.onRefResolveError?.(ErrorMessage.refNotFound($ref), path, $ref)
          const brokenValueClone = { [JSON_SCHEMA_PROPERTY_REF]: $ref }
          state.node[safeKey] = brokenValueClone
          setOrigins(state.node, safeKey, options.originsFlag, [originForObj])
          setOrigins(brokenValueClone, JSON_SCHEMA_PROPERTY_REF, options.originsFlag, [originForRef])
          return { done: true }
        } finally {
          cyclingGuard.delete(reference.normalized)
        }
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

const resolveRefNode = (
  reference: RichReference,
  source: unknown,
  resolveRefHook: DefineOriginsAndResolveRefSyncCloneHook,
  cycleJsoHook: SyncCloneHook<DefineOriginsAndResolveRefState>,
  state: CloneState<DefineOriginsAndResolveRefState>,
  rules: CrawlRules<NormalizationRule> | undefined,
  originResolver?: (value: unknown, parentChain: ChainItem | undefined, parentValue: unknown | undefined, propertyKey: PropertyKey) => ChainItem,
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
  let isPureRef: boolean
  while ((isPureRef = isPureRefNode(value)) || path.length) {
    const key = path[0]
    if (isPureRef) {
      //when ref go to the object that contains not yet resolved ref
      const originCollector: OriginsMetaRecord = {}
      parentValue = value
      value = syncClone<DefineOriginsAndResolveRefState, NormalizationRule>(value, [cycleJsoHook, resolveRefHook, cycleJsoHook], {
        state: {
          ...state,
          originParent: undefined,
          originCollector: originCollector,
        }, rules,
      })
      if (isPureRefNode(value)) { //it possible only for broken refs
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
  return {
    refValue: value,
    origin: pathChain,
  }
}

function getOrReuseOrigin(jsoInstance: unknown, origin: ChainItem, originCache: OriginCache, afterReuse?: (item: ChainItem) => void): ChainItem {
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

interface ResolvedRef {
  refValue: unknown
  origin: ChainItem | undefined
}
