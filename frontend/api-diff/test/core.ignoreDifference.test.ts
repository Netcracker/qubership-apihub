import { createEvaluationCacheService } from '@netcracker/qubership-apihub-api-unifier'
import { allNonBreaking, nestedCompare } from '../src/core'
import { isObject } from '../src/utils'
import {
  COMPARE_MODE_DEFAULT,
  COMPARE_SCOPE_ROOT,
  CompareRules,
  IGNORE_DIFFERENCE_RULE,
  InternalCompareOptions,
} from '../src/types'

// Focused core test for the `ignoreDifference` rule (T0.2). The rule is exercised
// directly through `nestedCompare` with a hand-built rule tree so it is isolated
// from any spec-type wiring.

const META_KEY = Symbol('test-meta')

const baseOptions = (rules: CompareRules): InternalCompareOptions => ({
  mode: COMPARE_MODE_DEFAULT,
  normalizedResult: true,
  metaKey: META_KEY,
  defaultsFlag: Symbol('test-defaults'),
  originsFlag: Symbol('test-origins'),
  compareScope: COMPARE_SCOPE_ROOT,
  mergedJsoCache: createEvaluationCacheService(),
  diffUniquenessCache: createEvaluationCacheService(),
  valueAdaptationCache: createEvaluationCacheService(),
  createdMergedJso: new Set(),
  rules,
})

const BEFORE = {
  kept: 'before-kept',
  suppressed: { inner: 'before-inner', deep: { leaf: 'before-leaf' } },
  sibling: 'same',
}
const AFTER = {
  kept: 'after-kept',
  suppressed: { inner: 'after-inner', deep: { leaf: 'after-leaf' } },
  sibling: 'same',
}

const childRules: CompareRules = {
  '/kept': { $: allNonBreaking },
  '/sibling': { $: allNonBreaking },
  '/suppressed': {
    '/inner': { $: allNonBreaking },
    '/deep': { '/leaf': { $: allNonBreaking } },
  },
}

const hasMeta = (node: unknown, key: PropertyKey): boolean =>
  isObject(node) && META_KEY in node && isObject(node[META_KEY]) &&
  key in node[META_KEY]

describe('ignoreDifference rule (T0.2)', () => {
  it('suppresses the node and its whole subtree but still merges the after-value', () => {
    const rules: CompareRules = {
      ...childRules,
      '/suppressed': {
        [IGNORE_DIFFERENCE_RULE]: true,
        ...childRules['/suppressed'] as object,
      },
    }

    const { diffs, merged } = nestedCompare(BEFORE, AFTER, baseOptions(rules))
    const mergedObj = merged as Record<PropertyKey, any>

    // Only the unrelated `kept` change is reported.
    expect(diffs).toHaveLength(1)
    expect(diffs[0]).toMatchObject({ beforeValue: 'before-kept', afterValue: 'after-kept' })

    // No diff meta for the suppressed node or anything under it.
    expect(hasMeta(mergedObj, 'suppressed')).toBe(false)
    expect(META_KEY in mergedObj.suppressed).toBe(false)
    expect(META_KEY in mergedObj.suppressed.deep).toBe(false)

    // Merged document still structurally complete with the after-value.
    expect(mergedObj.suppressed).toEqual(AFTER.suppressed)

    // Sibling/parent unaffected: `kept` change still recorded in merged meta.
    expect(hasMeta(mergedObj, 'kept')).toBe(true)
  })

  it('without the flag, the same subtree changes are reported (control)', () => {
    const { diffs } = nestedCompare(BEFORE, AFTER, baseOptions(childRules))

    // kept + suppressed.inner + suppressed.deep.leaf
    expect(diffs).toHaveLength(3)
  })
})
