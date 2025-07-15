import arrayOfTypeIsEquivalentToAnyOfBefore from './helper/resources/array-of-type-is-equivalent-to-anyOf/before.json'
import arrayOfTypeIsEquivalentToAnyOfAfter from './helper/resources/array-of-type-is-equivalent-to-anyOf/after.json'

import nullMovesInCombinerHierarchyBefore from './helper/resources/null-moves-in-combiner-hierarchy/before.json'
import nullMovesInCombinerHierarchyAfter from './helper/resources/null-moves-in-combiner-hierarchy/after.json'
import { apiDiff, CompareOptions } from '../src'
import { TEST_DIFF_FLAG, TEST_ORIGINS_FLAG } from './helper'
import { diffsMatcher } from './helper/matchers'

const OPTIONS: CompareOptions = {
  originsFlag: TEST_ORIGINS_FLAG,
  metaKey: TEST_DIFF_FLAG,
  validate: true,
  unify: true,
}

describe('OAS 3.1 array of types', () => {
  it('array of type is equivalent to anyOf', () => {
    const { diffs } = apiDiff(arrayOfTypeIsEquivalentToAnyOfBefore, arrayOfTypeIsEquivalentToAnyOfAfter, OPTIONS)
    expect(diffs).toBeEmpty()
  })

  it('no changes when "null" moves in combiner hierarchy', () => {
    const { diffs } = apiDiff(nullMovesInCombinerHierarchyBefore, nullMovesInCombinerHierarchyAfter, OPTIONS)
    expect(diffs).toBeEmpty()
  })
})
