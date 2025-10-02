import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'

import { CompareContext, Diff, DiffEntry, DiffFactory, DiffMetaRecord, NodeContext } from '../types'
import { allUnclassified, DiffAction, unclassified } from './constants'
import { getKeyValue, isFunc } from '../utils'
import { calculateDefaultDiffDescription } from './description'

export const NEVER_KEY = Symbol('never-key')

export const createDiff = <D extends Diff>(diff: Omit<D, 'type'>, ctx: CompareContext): D => {
  const classifierRule = ctx.rules?.$ ?? {}//todo. rules should be evaluated, like in json-crawl
  const mutableDiffCopy = { ...diff, type: unclassified } as D

  if (classifierRule) {
    const classifier = Array.isArray(classifierRule) ? classifierRule : allUnclassified

    const index = diff.action === DiffAction.rename ? 2 : [DiffAction.add, DiffAction.remove, DiffAction.replace].indexOf(diff.action)
    const changeType = classifier[index]

    try {
      mutableDiffCopy.type = isFunc(changeType) ? changeType(ctx) : changeType
    } catch (error) {
      ctx.options.onCreateDiffError?.(`Unable to find diff type. ${error instanceof Error ? error.message : ''}`, mutableDiffCopy, ctx)
    }
  }
  try {
    mutableDiffCopy.description = ctx.rules.description?.(mutableDiffCopy, ctx) ?? calculateDefaultDiffDescription(mutableDiffCopy)
  } catch (error) {
    ctx.options.onCreateDiffError?.(`Unable to create description for diff. ${error instanceof Error ? error.message : ''}`, mutableDiffCopy, ctx)
  }
  return mutableDiffCopy
}

export function createDiffEntry(ctx: CompareContext, diff: Diff): DiffEntry<Diff> {
  return ({
    propertyKey: ctx.mergeKey,
    diff: diff,
  })
}

export const diffFactory: DiffFactory = {
  added: (ctx) => createDiff({
    afterValue: ctx.after?.value,
    afterNormalizedValue: ctx.after?.value,
    action: DiffAction.add,
    afterDeclarationPaths: ctx.after.declarativePaths,
    scope: ctx.scope,
  }, ctx),
  removed: (ctx) => createDiff({
    beforeValue: ctx.before.value,
    beforeNormalizedValue: ctx.before.value,
    action: DiffAction.remove,
    beforeDeclarationPaths: ctx.before.declarativePaths,
    scope: ctx.scope,
  }, ctx),
  replaced: (ctx) => createDiff({
    beforeValue: ctx.before.value,
    beforeNormalizedValue: ctx.before.value,
    afterValue: ctx.after.value,
    afterNormalizedValue: ctx.after.value,
    action: DiffAction.replace,
    afterDeclarationPaths: ctx.after.declarativePaths,
    beforeDeclarationPaths: ctx.before.declarativePaths,
    scope: ctx.scope,
  }, ctx),
  renamed: (ctx) => createDiff({
    beforeKey: ctx.before?.key,
    afterKey: ctx.after?.key,
    action: DiffAction.rename,
    afterDeclarationPaths: ctx.after?.declarativePaths ?? [],
    beforeDeclarationPaths: ctx.before?.declarativePaths ?? [],
    scope: ctx.scope,
  }, ctx),
}

export const addDiffObjectToContainer = (
  container: Record<PropertyKey, unknown> | unknown[],
  diffMetaKey: symbol | undefined,
  diffs: DiffEntry<Diff>[],
): void => {
  if (diffMetaKey === undefined || diffs.length === 0) {
    return
  }
  //about as any. JSArray allow to set any property. So our diff meta key will be in array too
  const metaRecord: DiffMetaRecord = diffMetaKey in container ? container[diffMetaKey as any] as DiffMetaRecord : {}
  diffs.forEach(({ propertyKey, diff }) => metaRecord[propertyKey] = diff)
  container[diffMetaKey as any] = metaRecord
}

export const PARENT_JUMP = '..'

export const strictResolveValueFromContext = (ctx: NodeContext, ...path: JsonPath): unknown | undefined => resolveValueFromContext(true, ctx, ...path)
export const optionalResolveValueFromContext = (ctx: NodeContext, ...path: JsonPath): unknown | undefined => resolveValueFromContext(false, ctx, ...path)
const resolveValueFromContext = (strict: boolean, ctx: NodeContext, ...path: JsonPath): unknown | undefined => {
  if (path.length === 0) {
    return ctx.value
  }
  let fromObj: unknown = ctx.value
  let fromContext: NodeContext | undefined = ctx
  let countParentJump = 0
  for (const pathItem of path) {
    if (pathItem !== PARENT_JUMP) {
      break
    }
    if (!fromContext?.parentContext) {
      if (strict) {
        throw Error(`Could not get data from the context along path '${path.join('/')}'`)
      } else {
        return undefined
      }
    }
    fromContext = fromContext?.parentContext
    fromObj = fromContext?.value
    countParentJump += 1
  }
  path = path.slice(countParentJump)
  return getKeyValue(fromObj, ...path)
}
