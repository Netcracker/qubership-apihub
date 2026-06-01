import { getNodeRules } from '@netcracker/qubership-apihub-json-crawl'
import {
  addDiffObjectToContainer,
  ANY_COMBINER_INDEX,
  ANY_COMBINER_PATH,
  breaking,
  createChildContext,
  diffFactory,
  getOrCreateChildDiffAdd,
  getOrCreateChildDiffRemove,
  nestedCompare,
  createDiffEntry,
  risky,
} from '../core'
import type { CompareResolver, Diff, DiffEntry } from '../types'
import { isArray, isObject, onlyExistedArrayIndexes } from '../utils'
import { copyDescriptors } from '@netcracker/qubership-apihub-api-unifier'

const haveCommonRef = (a: string[], b: string[]): boolean => {
  const bSet = new Set(b)
  return a.some(ref => bSet.has(ref))
}

export const combinersCompareResolver: CompareResolver = (ctx) => {
  const { before, after, options, scope } = ctx
  const { metaKey } = options
  if (!before || !after) {
    return { diffs: [], ownerDiffEntry: undefined, merged: undefined }
  }

  if (!isArray(before.value) || !isArray(after.value)) {
    const diffEntry = createDiffEntry(ctx, diffFactory.replaced(ctx))
    // actually we don't make deep copy here and create "way to modify" original source
    return { diffs: [diffEntry.diff], ownerDiffEntry: diffEntry, merged: after.value }
  }

  // match combiners
  const beforeArrayIndexes = onlyExistedArrayIndexes(before.value)
  const afterArrayIndexes = onlyExistedArrayIndexes(after.value)
  const beforeUnmatchedIndexes = new Set<number>(beforeArrayIndexes)
  const afterUnmatchedIndexes = new Set<number>(afterArrayIndexes)
  const comparedItems = []
  const mergedCombinerJsoArray: unknown[] = []
  const diffs: Set<Diff> = new Set()

  const rules = getNodeRules(ctx.rules, ANY_COMBINER_INDEX, ANY_COMBINER_PATH, before.value) || {}

  const compareCombinerItems = (beforeItem: unknown, afterItem: unknown) =>
    ctx.options.mergedJsoCache.cacheEvaluationResultByFootprint(
      [beforeItem, afterItem, scope],
      ([b, a]) => nestedCompare(b, a, { ...options, rules, compareScope: ctx.scope }),
      { diffs: [], ownerDiffEntry: undefined, merged: {} },
      (result, guard) => {
        guard.diffs.push(...result.diffs)
        if (isObject(guard.merged) && isObject(result.merged))
          guard.merged = copyDescriptors(guard.merged, result.merged)
        else
          guard.merged = result.merged
        return guard
      })

  // First pass: definitively match combiner options that share the same $ref origin.
  // The assumption is that in real world cases if schema names are the same, then
  // this is what we want to compare.
  const { inlineRefsFlag } = options
  if (inlineRefsFlag) {
    for (const i of beforeArrayIndexes) {
      if (!beforeUnmatchedIndexes.has(i)) { continue }
      const beforeItem = before.value[i]
      if (!isObject(beforeItem)) { continue }
      const beforeRefs = beforeItem[inlineRefsFlag] as string[] | undefined
      if (!beforeRefs?.length) { continue }

      for (const j of afterArrayIndexes) {
        if (!afterUnmatchedIndexes.has(j)) { continue }
        const afterItem = after.value[j]
        if (!isObject(afterItem)) { continue }
        const afterRefs = afterItem[inlineRefsFlag] as string[] | undefined
        if (!afterRefs?.length) { continue }

        if (haveCommonRef(beforeRefs, afterRefs)) {
          beforeUnmatchedIndexes.delete(i)
          afterUnmatchedIndexes.delete(j)
          const { diffs: localDiffs, merged } = compareCombinerItems(beforeItem, afterItem)
          mergedCombinerJsoArray[j] = merged
          localDiffs.forEach(diff => diffs.add(diff))
          break
        }
      }
    }
  }

  // compare all combinations, find min diffs
  for (const i of beforeArrayIndexes) {
    if (!beforeUnmatchedIndexes.has(i)) { continue }
    const beforeCombinerJso = before.value[i]
    for (const j of afterArrayIndexes) {
      if (!afterUnmatchedIndexes.has(j)) { continue }
      const afterCombinerJso = after.value[j]

      const { diffs: localDiffs, merged } = compareCombinerItems(beforeCombinerJso, afterCombinerJso)

      if (!localDiffs.length) {
        afterUnmatchedIndexes.delete(j)
        beforeUnmatchedIndexes.delete(i)
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

  const dangerousSeverityCount = (diffs: Diff[]) =>
    diffs.filter(d => d.type === breaking || d.type === risky).length

  comparedItems.sort((a, b) => {
    const dangerousSeverityDiff = dangerousSeverityCount(a.diffs) - dangerousSeverityCount(b.diffs)
    if (dangerousSeverityDiff !== 0) { return dangerousSeverityDiff }
    const totalDiff = a.diffs.length - b.diffs.length
    //reduce randomization when same diffs count
    return totalDiff !== 0 ? totalDiff : Math.abs(a.before - a.after) - Math.abs(b.before - b.after)
  })

  for (const compared of comparedItems) {
    if (!afterUnmatchedIndexes.has(compared.after) || !beforeUnmatchedIndexes.has(compared.before)) { continue }
    afterUnmatchedIndexes.delete(compared.after)
    beforeUnmatchedIndexes.delete(compared.before)
    mergedCombinerJsoArray[compared.after] = compared.merged
    compared.diffs.forEach(diff => diffs.add(diff))
  }
  const arrayMetaDiffEntries: DiffEntry<Diff>[] = []
  for (const j of afterUnmatchedIndexes.values()) {
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

  for (const i of beforeUnmatchedIndexes.values()) {
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
