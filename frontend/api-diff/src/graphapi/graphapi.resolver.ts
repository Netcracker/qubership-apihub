import { diffFactory } from '../core'
import { CompareResolver } from '../types/rules'
import { isObject, isString } from '../utils'

export const complexTypeCompareResolver: CompareResolver = (ctx) => {
  const { before, after } = ctx

  const beforeValue = before.value
  const afterValue = after.value

  if (!isObject(beforeValue) || !isObject(afterValue) || !isString(beforeValue.kind) || !isString(afterValue.kind)) {
    const diffEntry = diffFactory.replaced(ctx)
    // actually we don't make deep copy here and create "way to modify" original source. But fix not so trivial and expensive for performance
    return { diffs: [diffEntry.diff], ownerDiffEntry: diffEntry, merged: after.value }
  }

  if (beforeValue.kind === afterValue.kind) { 
    return undefined
  }

  //TODO add more better way to compare interface vs type 

  const diffEntry = diffFactory.replaced(ctx)
  return { diffs: [diffEntry.diff], ownerDiffEntry: diffEntry, merged: after.value }
}
