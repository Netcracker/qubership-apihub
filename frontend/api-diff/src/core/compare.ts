import { anyArrayKeys, getNodeRules, JsonPath, syncCrawl, SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl'

import {
  ChainItem,
  DEFAULT_OPTION_ORIGINS_FOR_DEFAULTS,
  denormalize,
  DenormalizeOptions,
  EvaluationCacheService,
  isDefaultValue,
  normalize,
  OriginsMetaRecord,
  pathItemToFullPath,
  resolveOrigins,
} from '@netcracker/qubership-apihub-api-unifier'
import { deepEqual } from 'fast-equals'
import {
  AdapterContext,
  AdapterResolver,
  CompareContext,
  CompareResult,
  CompareRule,
  CompareScope,
  ContextInput,
  Diff,
  DiffAdd,
  DiffCallback,
  DiffEntry,
  DiffRemove,
  InternalCompareOptions,
  JsonNode,
  MergeState,
  NodeContext,
  ValueTransformer,
} from '../types'
import { getObjectValue, isArray, isDiffAdd, isDiffRemove, isDiffReplace, isNumber, isObject, typeOf } from '../utils'
import { ANY_COMBINER_PATH, DiffAction, JSO_ROOT } from './constants'
import { addDiffObjectToContainer, createDiffEntry, diffFactory, NEVER_KEY } from './diff'
import { arrayMappingResolver, objectMappingResolver } from './mapping'

const extractDeclarationPaths = (jso: Record<PropertyKey, unknown>, originMetaKey: symbol, property: PropertyKey): JsonPath[] => {
  const origins = resolveOrigins(jso, property, originMetaKey)
  if (!origins) {
    return []
  }
  return origins.map(leaf => pathItemToFullPath(leaf))
}

function createNodeContext(
  parentContext: NodeContext | undefined,
  jso: JsonNode,
  key: PropertyKey,
  value: unknown,
  options: InternalCompareOptions,
  root: unknown) {
  return {
    parentContext,
    key,
    declarativePaths: extractDeclarationPaths(jso, options.originsFlag, key),
    parent: jso,
    value: value,
    root: root,
  }
}

export const createContext = (data: ContextInput, options: InternalCompareOptions): CompareContext => {
  const {
    beforeJso,
    afterJso,
    root,
    afterKey,
    beforeKey,
    mergeKey,
    beforeValue,
    afterValue,
    rules,
    compareScope,
    parentContext,
  } = data
  return {
    parentContext: parentContext,
    scope: compareScope,
    before: createNodeContext(parentContext?.before, beforeJso, beforeKey, beforeValue, options, root.before[JSO_ROOT]),
    after: createNodeContext(parentContext?.after, afterJso, afterKey, afterValue, options, root.after[JSO_ROOT]),
    mergeKey,
    rules,
    options,
  }
}

export const createChildContext = (
  ctx: CompareContext,
  mergedKey: PropertyKey,
  beforeChildKey: PropertyKey | undefined,
  afterChildKey: PropertyKey | undefined,
): CompareContext => {
  const { before, after, rules, options, scope } = ctx
  let beforeContext: NodeContext
  if (beforeChildKey !== undefined && isObject(before.value)) {
    beforeContext = createNodeContext(before, before.value, beforeChildKey, before.value[beforeChildKey], options, before.root)
  } else {
    beforeContext = {
      parentContext: before,
      declarativePaths: [],
      key: NEVER_KEY,
      value: undefined,
      parent: before?.value,
      root: before?.root,
    }
  }
  let afterContext: NodeContext
  if (afterChildKey !== undefined && isObject(after.value)) {
    afterContext = createNodeContext(after, after.value, afterChildKey, after.value[afterChildKey], options, after.root)
  } else {
    afterContext = {
      parentContext: after,
      declarativePaths: [],
      key: NEVER_KEY,
      value: undefined,
      parent: after?.value,
      root: after?.root,
    }
  }
  return {
    parentContext: ctx,
    before: beforeContext,
    after: afterContext,
    mergeKey: mergedKey,
    rules: getNodeRules(
      rules,
      beforeChildKey ?? afterChildKey ?? NEVER_KEY,
      ANY_COMBINER_PATH,
      afterContext.value ?? beforeContext.value ?? undefined,
    ) ?? {},
    options,
    scope: scope,
  }
}

const buildPathsIdentifier = (paths: JsonPath[]) => {
  return paths.map(path => path.join('|')).sort().join('\n')
}

const cleanUpRecursive = (ctx: NodeContext): NodeContext => {
  if (!isObject(ctx.value)) {
    return ctx
  }
  let lastGoodContext = ctx
  let currentContext: NodeContext | undefined = ctx
  while (currentContext) {
    if (currentContext.value === ctx.value) {
      lastGoodContext = currentContext
    }
    currentContext = currentContext.parentContext
  }
  return lastGoodContext
}

export const getOrCreateChildDiffAdd = (diffUniquenessCache: EvaluationCacheService, childCtx: CompareContext) => {
  const diff = diffUniquenessCache.cacheEvaluationResultByFootprint<[unknown, string, CompareScope, typeof DiffAction.add], DiffAdd>([childCtx.after.value, buildPathsIdentifier(childCtx.after.declarativePaths), childCtx.scope, DiffAction.add], () => {
    return diffFactory.added(childCtx)
  }, {} as DiffAdd, (result, guard) => {
    Object.assign(guard, result)
    return guard
  })

  return createDiffEntry(childCtx, diff)
}

export const getOrCreateChildDiffRemove = (diffUniquenessCache: EvaluationCacheService, childCtx: CompareContext) => {
  const diff = diffUniquenessCache.cacheEvaluationResultByFootprint<[unknown, string, CompareScope, typeof DiffAction.remove], DiffRemove>([childCtx.before.value, buildPathsIdentifier(childCtx.before.declarativePaths), childCtx.scope, DiffAction.remove], () => {
    return diffFactory.removed(childCtx)
  }, {} as DiffRemove, (result, guard) => {
    Object.assign(guard, result)
    return guard
  })
  return createDiffEntry(childCtx, diff)
}

const adaptValues = (beforeJso: JsonNode, beforeKey: PropertyKey, afterJso: JsonNode, afterKey: PropertyKey, adapter: AdapterResolver[] | undefined, options: InternalCompareOptions) => {
  const beforeValue = beforeJso[beforeKey]
  const afterValue = afterJso[afterKey]
  if (!adapter) {
    return [beforeValue, afterValue]
  }
  let beforeValueAdapted = beforeValue
  let afterValueAdapted = afterValue
  const transformer: ValueTransformer = (value, transformId, f) => options.valueAdaptationCache.cacheEvaluationResultByFootprint<[typeof value, typeof transformId], unknown>([value, transformId], ([value]) => f(value))
  const beforeCtx: AdapterContext<unknown> = {
    transformer,
    options,
    valueOrigins: resolveOrigins(beforeJso, beforeKey, options.originsFlag),
  }
  const afterCtx: AdapterContext<unknown> = {
    transformer,
    options,
    valueOrigins: resolveOrigins(afterJso, afterKey, options.originsFlag),
  }
  adapter?.forEach((f) => {
    beforeValueAdapted = f(beforeValueAdapted, afterValueAdapted, beforeCtx)
    afterValueAdapted = f(afterValueAdapted, beforeValueAdapted, afterCtx)
  })
  return [beforeValueAdapted, afterValueAdapted]
}

const useMergeFactory = (onDiff: DiffCallback, options: InternalCompareOptions): SyncCrawlHook<MergeState, CompareRule> => {
  const { metaKey } = options
  const diffs: Set<Diff> = new Set()
  const addDiff: (diff: Diff) => void = (diff) => {
    const oldSize = diffs.size
    diffs.add(diff)
    if (diffs.size !== oldSize)
      onDiff(diff)
  }
  const hook: SyncCrawlHook<MergeState, CompareRule> = (crawlContext) => {
    const { rules = {}, state, value, key: unsafeKey } = crawlContext
    const {
      adapter,
      compare,
      mapping,
      ignoreKeyDifference,
      newCompareScope,
    } = rules
    const {
      keyMap,
      beforeJso,
      afterJso,
      mergedJso,
      mergedJsoCache,
      diffUniquenessCache,
      createdMergedJso,
      compareScope,
    } = state

    if (typeof unsafeKey === 'symbol') {
      //compare meta not designed. But possible
      return { done: true }
    }

    const beforeKey = unsafeKey ?? (isArray(beforeJso) ? +Object.keys(keyMap).pop()! : Object.keys(keyMap).pop())
    const afterKey = keyMap[beforeKey]
    const mergeKey = isArray(mergedJso) && isNumber(beforeKey) ? beforeKey : afterKey //gitleaks:allow //THIS IS VERY FRAGILE. Cause this logic duplicate this line mergedJsoValue[keyInMerge] = afterValue[keyInAfter]

    // skip if node was removed
    if (!(beforeKey in keyMap)) {
      //actually we don't make deep copy here and create "way to modify" original source
      mergedJso[beforeKey] = value
      return { done: true }
    }

    const [
      beforeValueAdapted,
      afterValueAdapted,
    ] = adaptValues(beforeJso, beforeKey, afterJso, afterKey, adapter, options)

    const ctx = createContext({
      ...state,
      beforeValue: beforeValueAdapted,
      afterValue: afterValueAdapted,
      afterKey,
      beforeKey,
      mergeKey,
      rules,
      compareScope: newCompareScope ?? compareScope,
    }, options)

    const beforeDeclarativePathsId = buildPathsIdentifier(cleanUpRecursive(ctx.before).declarativePaths)
    const afterDeclarativePathsId = buildPathsIdentifier(cleanUpRecursive(ctx.after).declarativePaths)

    const reuseResult: ReusableMergeResult = mergedJsoCache.cacheEvaluationResultByFootprint<[typeof ctx.before.value, typeof ctx.after.value, typeof beforeDeclarativePathsId, typeof afterDeclarativePathsId, CompareScope], ReusableMergeResult>([ctx.before.value, ctx.after.value, beforeDeclarativePathsId, afterDeclarativePathsId, ctx.scope], ([beforeValue, afterValue]) => {
      if (!ignoreKeyDifference && beforeKey !== afterKey) {
        const diffEntry = createDiffEntry(ctx, diffFactory.renamed(ctx))
        addDiff(diffEntry.diff)
        addDiffObjectToContainer(mergedJso, metaKey, [diffEntry])
      }
      const compared = compare?.(ctx)//adaptedValues
      if (compared) {
        const { diffs: customComparedDiffs, ownerDiffEntry: ownerDiff, merged } = compared
        customComparedDiffs.forEach(diff => addDiff(diff))
        //how we prevent doubling for diff. Cause compare can already found nested diffs. Need more clear contract anf fix
        return { diffsToPullUp: ownerDiff ? [ownerDiff] : [], mergedValue: merged } satisfies ReusableMergeResult
      }

      // types are different
      if (typeOf(beforeValue) !== typeOf(afterValue)) {
        const diffEntry = createDiffEntry(ctx, diffFactory.replaced(ctx))
        addDiff(diffEntry.diff)
        return { diffsToPullUp: [diffEntry], mergedValue: afterValue } satisfies ReusableMergeResult
      }

      // compare objects or arrays
      if (isObject(beforeValue) && isObject(afterValue)) {
        const mergedJsoValue: JsonNode = isArray(beforeValue) ? [] as JsonNode<number> : {} as JsonNode<string | symbol>
        const mapKeys = mapping ?? (isArray(beforeValue) ? arrayMappingResolver : objectMappingResolver)
        const {
          added: addedKeys,
          removed: removedKeys,
          mapped: mappedKeys,
        } = mapKeys(beforeValue as any, afterValue as any, ctx)
        const jsoDiffEntries: DiffEntry<Diff>[] = []
        const keyToRemove = removedKeys
          .filter(key => !isDefaultValue(beforeValue, key, options.defaultsFlag))
        const keysToAdd = addedKeys
          .filter(key => !isDefaultValue(afterValue, key, options.defaultsFlag))

        let once = false
        const exitHook = () => {
          if (once) {
            return
          }
          once = true

          keyToRemove.forEach((keyToBefore) => {
            const childCtx = createChildContext(ctx, keyToBefore, keyToBefore, undefined)
            jsoDiffEntries.push(getOrCreateChildDiffRemove(diffUniquenessCache, childCtx))
          })

          keysToAdd.forEach((keyInAfter) => {
            const keyInMerge = isArray(mergedJsoValue) ? mergedJsoValue.length : keyInAfter
            const childCtx = createChildContext(ctx, keyInMerge, undefined, keyInAfter)
            jsoDiffEntries.push(getOrCreateChildDiffAdd(diffUniquenessCache, childCtx))
            mergedJsoValue[keyInMerge] = afterValue[keyInAfter]
          })

          jsoDiffEntries.forEach(e => addDiff(e.diff))
          addDiffObjectToContainer(mergedJsoValue, metaKey, jsoDiffEntries)
        }

        return {
          mergedValue: mergedJsoValue,
          nextValue: beforeValue,
          nextMappedKeys: mappedKeys,
          exitHook,
        } satisfies ReusableMergeResult
      }

      const diffsToPullUp: DiffEntry<Diff>[] = []
      const res: LeafReusableMergeResult = {
        mergedValue: afterValue,
        diffsToPullUp: diffsToPullUp,
      }
      if (beforeValue !== afterValue) {
        const diffEntry = createDiffEntry(ctx, diffFactory.replaced(ctx))
        diffsToPullUp.push(diffEntry)
        addDiff(diffEntry.diff)
      }
      return res
    })
    mergedJso[mergeKey] = reuseResult.mergedValue
    if ('diffsToPullUp' in reuseResult) {
      addDiffObjectToContainer(mergedJso, metaKey, reuseResult.diffsToPullUp)
    }
    if ('nextValue' in reuseResult) {
      const mergedValue = reuseResult.mergedValue as JsonNode /*safe cause it only happens for object*/
      if (createdMergedJso.has(mergedValue)) {
        return { done: true }
      }
      createdMergedJso.add(mergedValue)
      const childState: MergeState = {
        ...crawlContext.state,
        parentContext: ctx,
        keyMap: reuseResult.nextMappedKeys,
        beforeJso: beforeValueAdapted as JsonNode/*safe cause it only happens for object*/,
        afterJso: afterValueAdapted as JsonNode/*safe cause it only happens for object*/,
        mergedJso: mergedValue,
        compareScope: newCompareScope ?? compareScope,
      }
      return { value: reuseResult.nextValue, state: childState, exitHook: reuseResult.exitHook }
    } else {
      return { done: true }
    }

  }
  return hook
}

function denormalizeWithDiffsSave(merged: unknown, options: InternalCompareOptions) {
  const jsoWithoutDiff: Set<unknown> = new Set()
  const jsoWithDiff: Set<unknown> = new Set()
  return denormalize(merged,
    {
      ...options,
      source: merged,
      ...(options.metaKey !== undefined ? {
        skip: (value: unknown, path: JsonPath) => {
          const metaKey = options.metaKey!
          if (path.length === 0) {
            return false
          }
          const key = path[path.length - 1]
          const containerJsonPath = path.slice(0, path.length - 1)
          const jso = getObjectValue(merged, ...containerJsonPath) as Record<PropertyKey, unknown> | undefined
          if (jso !== undefined) {
            const diffs = jso[metaKey] as Record<PropertyKey, unknown> | undefined
            if (isObject(diffs) && key in diffs) {
              jsoWithDiff.add(jso)
              return true
            }
          }
          //inner diffs
          if (isObject(value)) {
            let found = false
            const operationObjects: Set<unknown> = new Set()
            syncCrawl(value, ({ value: innerValue }) => {
              if (!isObject(innerValue)) {
                return { done: true }
              }
              if (jsoWithoutDiff.has(innerValue)) {
                return { done: true }
              }
              if (jsoWithDiff.has(innerValue)) {
                found = true
                return { terminate: true }
              }
              if (operationObjects.has(innerValue)) {
                return { done: true }
              }
              operationObjects.add(innerValue)
              if (metaKey in innerValue) {
                found = true
                return { terminate: true }
              }
            })
            if (found) {
              operationObjects.forEach(v => jsoWithDiff.add(v))
              return true
            } else {
              operationObjects.forEach(v => jsoWithoutDiff.add(v))
              return false
            }
          }
        },
      } as DenormalizeOptions : {}),

    },
  )
}

function addNormalizedValuesToDenormalizedDiff(
  denormalizedDiffs: Diff[],
  rawDiffs: Diff[],
  beforeValueNormalizedProperty?: symbol,
  afterValueNormalizedProperty?: symbol
) {
  for (let i = 0; i < denormalizedDiffs.length && i < rawDiffs.length; i++) {
    const denormalizedDiff = denormalizedDiffs[i]
    const normalizedDiff = rawDiffs[i]
    if (isDiffAdd(normalizedDiff) && isDiffAdd(denormalizedDiff)) {
      if (afterValueNormalizedProperty && normalizedDiff[afterValueNormalizedProperty] !== undefined) {
        denormalizedDiff[afterValueNormalizedProperty] = normalizedDiff[afterValueNormalizedProperty]
      }
    } else if (isDiffRemove(normalizedDiff) && isDiffRemove(denormalizedDiff)) {
      if (beforeValueNormalizedProperty && normalizedDiff[beforeValueNormalizedProperty] !== undefined) {
        denormalizedDiff[beforeValueNormalizedProperty] = normalizedDiff[beforeValueNormalizedProperty]
      }
    } else if (isDiffReplace(normalizedDiff) && isDiffReplace(denormalizedDiff)) {
      if (afterValueNormalizedProperty && normalizedDiff[afterValueNormalizedProperty] !== undefined) {
        denormalizedDiff[afterValueNormalizedProperty] = normalizedDiff[afterValueNormalizedProperty]
      }
      if (beforeValueNormalizedProperty && normalizedDiff[beforeValueNormalizedProperty] !== undefined) {
        denormalizedDiff[beforeValueNormalizedProperty] = normalizedDiff[beforeValueNormalizedProperty]
      }
    }
  }
}

export const compare = (before: unknown, after: unknown, options: InternalCompareOptions): CompareResult => {
  const beforeFullyResolved = normalize(before, {
    ...options,
    source: options.beforeSource,
  })
  const afterFullyResolved = normalize(after, {
    ...options,
    source: options.afterSource,
  })

  // validateOrigins(beforeFullyResolved, options.originsFlag, {
  //   ...before as Record<PropertyKey, unknown>,
  //   ...(options.beforeSource ?? before) as Record<PropertyKey, unknown>,
  // })
  // validateOrigins(afterFullyResolved, options.originsFlag, {
  //   ...after as Record<PropertyKey, unknown>,
  //   ...(options.afterSource ?? after) as Record<PropertyKey, unknown>,
  // })

  const rawDiffs: Diff[] = []
  const onDiff: DiffCallback = diff => rawDiffs.push(diff)
  let merged = compareInternal(beforeFullyResolved, afterFullyResolved, onDiff, options)
  if (options.normalizedResult) {
    return {
      diffs: rawDiffs,
      ownerDiffEntry: undefined,
      merged,
    }
  }
  const diffFlags = Symbol('diffs')
  if (isObject(merged)) {
    merged[diffFlags] = rawDiffs
  }
  merged = denormalizeWithDiffsSave(merged, options)
  let denormalizedDiffs: Diff[] = rawDiffs
  if (isObject(merged)) {
    denormalizedDiffs = merged[diffFlags] as Diff[]
    delete merged[diffFlags]
  }
  // validateDiffs(denormalizedDiffs)
  addNormalizedValuesToDenormalizedDiff(
    denormalizedDiffs,
    rawDiffs,
    options.beforeValueNormalizedProperty,
    options.afterValueNormalizedProperty
  )
  return {
    diffs: denormalizedDiffs,
    ownerDiffEntry: undefined,
    merged,
  }
}

export const nestedCompare = (before: unknown, after: unknown, options: InternalCompareOptions): CompareResult => {
  const diffs: Diff[] = []
  const merged = compareInternal(before, after, (diff) => diffs.push(diff), options)
  return { merged, diffs: diffs, ownerDiffEntry: undefined }
}

const compareInternal = (before: unknown, after: unknown, onDiff: DiffCallback, options: InternalCompareOptions): CompareResult['merged'] => {
  const root: MergeState['root'] = {
    before: { [JSO_ROOT]: before },
    after: { [JSO_ROOT]: after },
    merged: {},
  }

  const beforeRootJso = root.before
  const afterRootJso = root.after

  if (!isObject(beforeRootJso) || !isObject(afterRootJso)) {
    // TODO
    throw new Error('Not ready to compare primitive')
  }
  const hook = useMergeFactory(onDiff, options)
  const rootState: MergeState = {
    parentContext: undefined,
    mergedJso: root.merged,
    beforeJso: beforeRootJso,
    afterJso: afterRootJso,
    keyMap: { [JSO_ROOT]: JSO_ROOT },
    root,
    mergedJsoCache: options.mergedJsoCache,
    diffUniquenessCache: options.diffUniquenessCache,
    createdMergedJso: options.createdMergedJso,
    compareScope: options.compareScope,
  }
  syncCrawl<MergeState, CompareRule>(before, [hook], { state: rootState, rules: options.rules })
  return root.merged[JSO_ROOT]
}

interface BaseReusableMergeResult {
  mergedValue: unknown
}

interface LeafReusableMergeResult extends BaseReusableMergeResult {
  diffsToPullUp: DiffEntry<Diff>[]
}

interface ContinueReusableMergeResult extends BaseReusableMergeResult {
  nextMappedKeys: Record<PropertyKey, PropertyKey>
  nextValue: unknown
  exitHook: () => void
}

type ReusableMergeResult = LeafReusableMergeResult | ContinueReusableMergeResult

interface OriginTreeItem {
  value: ChainItem
  children: Record<PropertyKey, OriginTreeItem>
}

const validateDiffs: (diffs: Diff[]) => void = diffs => diffs.forEach(diff => {
  let beforeDeclarationPaths: JsonPath[] | undefined = undefined
  let afterDeclarationPaths: JsonPath[] | undefined = undefined
  switch (diff.action) {
    case DiffAction.add:
      afterDeclarationPaths = diff.afterDeclarationPaths
      break
    case DiffAction.remove:
      beforeDeclarationPaths = diff.beforeDeclarationPaths
      break
    case DiffAction.replace:
      afterDeclarationPaths = diff.afterDeclarationPaths
      beforeDeclarationPaths = diff.beforeDeclarationPaths
      break
    case DiffAction.rename:
      afterDeclarationPaths = diff.afterDeclarationPaths
      beforeDeclarationPaths = diff.beforeDeclarationPaths
  }
  const checkPaths: (paths: JsonPath[], strict: boolean) => void = (paths) => {
    if (paths.length === 0) {
      console.log(`[DECLARATIVE STACK PROBLEM] found empty diff declaration paths`, diff)
    }
    paths.forEach(path => {
      if (path.length === 0) {
        console.log(`[DECLARATIVE STACK PROBLEM] found empty diff declaration path`, diff)
      }
    })
  }
  if (beforeDeclarationPaths) {
    checkPaths(beforeDeclarationPaths, afterDeclarationPaths === undefined)
  }
  if (afterDeclarationPaths) {
    checkPaths(afterDeclarationPaths, beforeDeclarationPaths === undefined)
  }
})

const validateOrigins: (schema: unknown, originsFlag: symbol, source: unknown) => void = (schema, originsFlag, source) => {
  const cycleGuard: Set<unknown> = new Set()
  const originsTree: Record<PropertyKey, OriginTreeItem> = {}
  const getKeyValue = (obj: unknown, path: JsonPath): unknown | undefined => {
    let value: unknown = obj
    for (const key of path) {
      if (isObject(value) && key in value) {
        value = value[key]
      } else {
        return undefined
      }
      if (value === undefined) { return }
    }
    return value
  }

  syncCrawl(schema, ({ key, path, value }) => {
    if (!isObject(value)) {
      return { done: true }
    }
    if (typeof key === 'symbol') {
      return { done: true }
    }
    if (cycleGuard.has(value)) {
      return { done: true }
    }
    cycleGuard.add(value)
    //resolveOrigins() DO NOT USE!!!! cause it can contains bugs

    const recordCandidate = value[originsFlag]
    const originsRecord = recordCandidate as OriginsMetaRecord ?? {}
    const keys = (isArray(value) ? anyArrayKeys(value) : Reflect.ownKeys(value)).filter(key => typeof key !== 'symbol').map(key => key.toString())
    if (keys.length > 0) {
      if (!isObject(recordCandidate)) {
        console.log(`[DECLARATIVE STACK PROBLEM] missing origins record. ${path.join('/')}`)
        return { done: true }
      }
    }

    const used = new Set(Reflect.ownKeys(originsRecord).map(key => key.toString()))
    for (const key of keys) {
      if (!(key in originsRecord)) {
        console.log(`[DECLARATIVE STACK PROBLEM] missing property '${key}' in origins record. ${path.join('/')}`)
        continue
      }
      const leafs = originsRecord[key]
      if (!isArray(leafs)) {
        console.log(`[DECLARATIVE STACK PROBLEM] '${key}' origins is not an array. ${path.join('/')}`)
        continue
      }
      if (deepEqual(leafs, DEFAULT_OPTION_ORIGINS_FOR_DEFAULTS)) {
        used.delete(key)
        continue
      }
      if (leafs.length === 0) {
        console.log(`[DECLARATIVE STACK PROBLEM] '${key}' origins is empty array. ${path.join('/')}`)
        continue
      }
      used.delete(key)
      const declarationPaths = leafs.map(leaf => {
        const paths: ChainItem[] = []
        let pathItem: ChainItem | undefined = leaf
        while (pathItem) {
          paths.push(pathItem)
          pathItem = pathItem.parent
        }
        return paths.reverse()
      })
      //check tree
      for (const declarationPath of declarationPaths) {
        let root = originsTree
        for (const chainItem of declarationPath) {
          let treeItem = root[chainItem.value]
          if (!isObject(treeItem)) {
            treeItem = { value: chainItem, children: {} }
            root[chainItem.value] = treeItem
          }
          if (treeItem.value !== chainItem) {
            console.log(`[DECLARATIVE STACK PROBLEM] '${key}' duplicate origins detected. ${pathItemToFullPath(chainItem).join('/')} . ${path.join('/')}`)
          }
          root = treeItem.children
        }
        const declarationPathAsJsonPath = declarationPath.map(item => item.value)
        const val = getKeyValue(source, declarationPathAsJsonPath)
        if (val === undefined) {
          console.log(`[DECLARATIVE STACK PROBLEM] '${key}' broken declaration path. ${declarationPathAsJsonPath.join('/')} . ${path.join('/')}`)
        }
      }
    }
    if (used.size !== 0) {
      console.log(`[DECLARATIVE STACK PROBLEM] '${key}' found extra fields. ${path.join('/')}`)
    }
  })
}
