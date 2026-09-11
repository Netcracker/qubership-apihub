import 'jest-extended'
import type { InternalCompareOptions } from '../src/types'
import { createEvaluationCacheService, EvaluationCacheService } from '@netcracker/qubership-apihub-api-unifier'
import { createCustomScopeInterner, EMPTY_CUSTOM_SCOPE, resolveCustomScopeProviders } from '../src/core'

const SEASONING = 'seasoning'
const SEASONED = 'seasoned'

/**
 * The interner on its own, without a document. Its job is identity: the reuse caches use a record's
 * identity as a footprint, so two routes stating the same elements have to arrive at the same object and
 * a route that states nothing new has to keep the one it inherited.
 */
describe('the custom scope interner', () => {
  it('should return the parent record for a patch that states nothing new', () => {
    const interner = createCustomScopeInterner()
    const parent = interner.mergeOrReuse(EMPTY_CUSTOM_SCOPE, { [SEASONING]: SEASONED })

    expect(interner.mergeOrReuse(parent, { [SEASONING]: SEASONED })).toBe(parent)
    expect(interner.mergeOrReuse(parent, {})).toBe(parent)
    expect(interner.mergeOrReuse(parent, undefined)).toBe(parent)
  })

  it('should return one object per distinct content, whichever patches led to it', () => {
    const interner = createCustomScopeInterner()
    const seasoned = interner.mergeOrReuse(EMPTY_CUSTOM_SCOPE, { [SEASONING]: SEASONED })
    const other = interner.mergeOrReuse(EMPTY_CUSTOM_SCOPE, { [SEASONING]: 'other' })

    // The reuse footprint leans on this: equal custom scopes have to be the same object
    expect(interner.mergeOrReuse(EMPTY_CUSTOM_SCOPE, { [SEASONING]: SEASONED })).toBe(seasoned) // the same patch again
    expect(interner.mergeOrReuse(other, { [SEASONING]: SEASONED })).toBe(seasoned) // another chain, same content
    expect(other).not.toBe(seasoned) // different content
  })

  it('should not care in which order two elements were stated', () => {
    const interner = createCustomScopeInterner()
    const seasonedThenGarnished = interner.mergeOrReuse(
      interner.mergeOrReuse(EMPTY_CUSTOM_SCOPE, { [SEASONING]: SEASONED }),
      { garnish: 'garnished' },
    )
    const garnishedThenSeasoned = interner.mergeOrReuse(
      interner.mergeOrReuse(EMPTY_CUSTOM_SCOPE, { garnish: 'garnished' }),
      { [SEASONING]: SEASONED },
    )

    // Routes reach the same node through different nodes, so the same content arrives in either order
    expect(seasonedThenGarnished).toBe(garnishedThenSeasoned)
  })

  it('should ignore undefined values in a patch', () => {
    const interner = createCustomScopeInterner()
    const stated = interner.mergeOrReuse(EMPTY_CUSTOM_SCOPE, { [SEASONING]: SEASONED })

    expect(interner.mergeOrReuse(EMPTY_CUSTOM_SCOPE, { [SEASONING]: undefined })).toBe(EMPTY_CUSTOM_SCOPE)
    // The one that matters: `undefined` says nothing, so it must not clear what was inherited
    expect(interner.mergeOrReuse(stated, { [SEASONING]: undefined })).toBe(stated)
  })
})

describe('resolving the custom scope providers', () => {
  it('should be resolved per comparison, so nothing outlives one apiDiff call', () => {
    const optionsOf = (mergedJsoCache: EvaluationCacheService): InternalCompareOptions =>
      ({ mergedJsoCache } as unknown as InternalCompareOptions)
    const ofOneComparison = createEvaluationCacheService()
    const ofAnother = createEvaluationCacheService()

    // Keyed by the reuse cache: one per apiDiff call, and shared by reference into nested compares
    expect(resolveCustomScopeProviders(optionsOf(ofOneComparison)).interner)
      .toBe(resolveCustomScopeProviders(optionsOf(ofOneComparison)).interner)
    expect(resolveCustomScopeProviders(optionsOf(ofOneComparison)).interner)
      .not.toBe(resolveCustomScopeProviders(optionsOf(ofAnother)).interner)
  })
})
