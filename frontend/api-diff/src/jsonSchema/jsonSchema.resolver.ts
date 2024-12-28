import { getNodeRules } from '@netcracker/qubership-apihub-json-crawl'
import {
  addDiffObjectToContainer,
  ANY_COMBINER_INDEX,
  ANY_COMBINER_PATH,
  createChildContext,
  diffFactory,
  getOrCreateChildDiffAdd,
  getOrCreateChildDiffRemove,
  nestedCompare,
} from '../core'
import type { CompareResolver, Diff, DiffEntry } from '../types'
import { isArray, isObject, onlyExistedArrayIndexes } from '../utils'
import { copyDescriptors } from '@netcracker/qubership-apihub-api-unifier'

export const combinersCompareResolver: CompareResolver = (ctx) => {
  const { before, after, options, scope } = ctx
  const { metaKey } = options
  if (!before || !after) {
    return { diffs: [], ownerDiffEntry: undefined, merged: undefined }
  }

  if (!isArray(before.value) || !isArray(after.value)) {
    const diffEntry = diffFactory.replaced(ctx)
    // actually we don't make deep copy here and create "way to modify" original source
    return { diffs: [diffEntry.diff], ownerDiffEntry: diffEntry, merged: after.value }
  }

  // match combiners
  const beforeArrayIndexes = onlyExistedArrayIndexes(before.value)
  const afterArrayIndexes = onlyExistedArrayIndexes(after.value)
  const beforeMatchedArrayIndexes = new Set<number>(beforeArrayIndexes)
  const afterMatchedArrayIndexes = new Set<number>(afterArrayIndexes)
  const comparedItems = []
  const mergedCombinerJsoArray: unknown[] = []
  const diffs: Set<Diff> = new Set()

  const rules = getNodeRules(ctx.rules, ANY_COMBINER_INDEX, ANY_COMBINER_PATH, before.value) || {}

  // compare all combinations, find min diffs
  for (const i of beforeArrayIndexes) {
    const beforeCombinerJso = before.value[i]
    for (const j of afterArrayIndexes) {
      if (!afterMatchedArrayIndexes.has(j)) { continue }
      const afterCombinerJso = after.value[j]

      const {
        diffs: localDiffs,
        merged,
      } = ctx.options.mergedJsoCache.cacheEvaluationResultByFootprint(
        [beforeCombinerJso, afterCombinerJso, scope],
        ([beforeCombinerJso, afterCombinerJso]) =>
          nestedCompare(beforeCombinerJso, afterCombinerJso, {
            ...options,
            rules,
            compareScope: ctx.scope,
          }),
        { diffs: [], ownerDiffEntry: undefined, merged: {} },
        (result, guard) => {
          guard.diffs.push(...result.diffs)
          if (isObject(guard.merged) && isObject(result.merged))
            guard.merged = copyDescriptors(guard.merged, result.merged)
          else
            guard.merged = result.merged
          return guard
        })

      if (!localDiffs.length) {
        afterMatchedArrayIndexes.delete(j)
        beforeMatchedArrayIndexes.delete(i)
        mergedCombinerJsoArray[j] = merged
        break
      }
      comparedItems.push({
        before: i,
        after: j,
        diffs: localDiffs,
        merged,
      })
    }
  }

  comparedItems.sort((a, b) => {
    const mainDiff = a.diffs.length - b.diffs.length
    //reduce randomization when same diffs count
    return mainDiff !== 0 ? mainDiff : Math.abs(a.before - a.after) - Math.abs(b.before - b.after)
  })

  for (const compared of comparedItems) {
    if (!afterMatchedArrayIndexes.has(compared.after) || !beforeMatchedArrayIndexes.has(compared.before)) { continue }
    afterMatchedArrayIndexes.delete(compared.after)
    beforeMatchedArrayIndexes.delete(compared.before)
    mergedCombinerJsoArray[compared.after] = compared.merged
    compared.diffs.forEach(diff => diffs.add(diff))
  }
  const arrayMetaDiffEntries: DiffEntry<Diff>[] = []
  for (const j of afterMatchedArrayIndexes.values()) {
    mergedCombinerJsoArray[j] = after.value[j]
    const childCtx = createChildContext(ctx, j, undefined, j)
    const diffEntry = getOrCreateChildDiffAdd(options.diffUniquenessCache, childCtx)
    arrayMetaDiffEntries.push(diffEntry)
    diffs.add(diffEntry.diff)
  }

  const usedIndexesArray = onlyExistedArrayIndexes(mergedCombinerJsoArray)
  const from = Math.min(0, Math.min(...usedIndexesArray))
  const to = Math.max(...usedIndexesArray) + beforeArrayIndexes.length/*safe buffer*/
  const usedIndexes = new Set(usedIndexesArray)
  const freeIndexesArray = []
  for (let k = from; k <= to; k++) {
    if (!usedIndexes.has(k)) {
      freeIndexesArray.push(k)
    }
  }

  for (const i of beforeMatchedArrayIndexes.values()) {
    const safeInsertIndex = freeIndexesArray.shift()!/*length enough*/
    mergedCombinerJsoArray[safeInsertIndex] = before.value[i]
    const childCtx = createChildContext(ctx, safeInsertIndex, i, undefined)
    const diffEntry = getOrCreateChildDiffRemove(options.diffUniquenessCache, childCtx)
    arrayMetaDiffEntries.push(diffEntry)
    diffs.add(diffEntry.diff)
  }
  addDiffObjectToContainer(mergedCombinerJsoArray, metaKey, arrayMetaDiffEntries)
  return {
    diffs: [...diffs],
    ownerDiffEntry: undefined,
    //actually we don't make deep copy here and create "way to modify" original source. But fix not so trivial and performance expansive
    merged: diffs.size === 0 ? after.value : mergedCombinerJsoArray,
  }
}
