/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  ASYNCAPI_API_TYPE,
  BREAKING_CHANGE_TYPE,
  BuildResult,
  EMPTY_CHANGE_SUMMARY,
  NON_BREAKING_CHANGE_TYPE,
  OperationType,
  REST_API_TYPE,
} from '../src'
import { expectChangeCounts, expectChangesSummary, expectNotEmpty, NO_CHANGES } from './helpers'

// `Partial<OperationType>` rather than `unknown`: the deliberately invalid shapes below still pass, but
// `changeSummary` typed for `changesSummary` would not — this codebase has both, one keystroke apart.
const resultWith = (operationTypes: Array<Partial<OperationType>>): BuildResult =>
  ({ comparisons: [{ operationTypes }] } as BuildResult)

const restComparison = resultWith([{
  apiType: REST_API_TYPE,
  changesSummary: { ...EMPTY_CHANGE_SUMMARY, [BREAKING_CHANGE_TYPE]: 2 },
  numberOfImpactedOperations: { ...EMPTY_CHANGE_SUMMARY, [BREAKING_CHANGE_TYPE]: 3 },
}])

describe('Change count assertions', () => {
  test('expectChangesSummary should pass on the expected counts', () => {
    expectChangesSummary(restComparison, { [BREAKING_CHANGE_TYPE]: 2 })
  })

  test('expectChangesSummary should require every count the caller left out to be zero', () => {
    expect(() => expectChangesSummary(restComparison, { [NON_BREAKING_CHANGE_TYPE]: 1 }))
      .toThrow(/"breaking": 2/)
  })

  test('should fail loudly when the summary is missing altogether', () => {
    // `ChangeSummary` is not optional on `OperationType`, so this is a shape the types say cannot
    // happen; if it does, the helper must fail loudly rather than compare `undefined` to zeros
    // `.*`, not ` *`: with colors on, as in an IDE, escape codes sit between the label and the value
    expect(() => expectChangesSummary(resultWith([{ apiType: REST_API_TYPE }]), {}))
      .toThrow(/Received:.*undefined/)
  })

  // The one behavior these functions changed: the factory wrapped `objectContaining`, which ignores a key
  // it was not asked about. `toEqual` does not. Measured over a full run, every summary the suite produces
  // carries exactly the six `DiffType` keys — but every change-count assertion in the suite now goes through
  // these functions, so pin it here.
  test('should reject a summary carrying a count outside the six known ones', () => {
    const extra = resultWith([{
      apiType: REST_API_TYPE,
      changesSummary: { ...EMPTY_CHANGE_SUMMARY, 'semi-breaking': 1 } as never,
    }])

    expect(() => expectChangesSummary(extra, {})).toThrow(/semi-breaking/)
  })

  // 111 of the 250 call sites pass an explicit api type, so an argument dropped in the migration would
  // silently re-target 44% of them at rest
  test('should assert against the api type it was given, not the default', () => {
    const mixed = resultWith([
      { apiType: REST_API_TYPE, changesSummary: { ...EMPTY_CHANGE_SUMMARY, [BREAKING_CHANGE_TYPE]: 1 } },
      { apiType: ASYNCAPI_API_TYPE, changesSummary: { ...EMPTY_CHANGE_SUMMARY, [NON_BREAKING_CHANGE_TYPE]: 2 } },
    ])

    expectChangesSummary(mixed, { [NON_BREAKING_CHANGE_TYPE]: 2 }, ASYNCAPI_API_TYPE)
    expectChangesSummary(mixed, { [BREAKING_CHANGE_TYPE]: 1 })
    expect(() => expectChangesSummary(mixed, { [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE)).toThrow()
  })

  test('expectChangeCounts should keep the two counts apart when they differ', () => {
    // the asyncapi-deduplication case: one change impacting more than one operation
    expectChangeCounts(restComparison, {
      changes: { [BREAKING_CHANGE_TYPE]: 2 },
      impacted: { [BREAKING_CHANGE_TYPE]: 3 },
    })
    expect(() => expectChangeCounts(restComparison, {
      changes: { [BREAKING_CHANGE_TYPE]: 2 },
      impacted: { [BREAKING_CHANGE_TYPE]: 2 },
    }))
      .toThrow(/"breaking": 3/)
  })

  // there is no default: an empty `impacted` asserts zero impacted operations, it does not borrow `changes`
  test('expectChangeCounts should check the impacted counts even when they match the change counts', () => {
    const matching = resultWith([{
      apiType: REST_API_TYPE,
      changesSummary: { ...EMPTY_CHANGE_SUMMARY, [BREAKING_CHANGE_TYPE]: 2 },
      numberOfImpactedOperations: { ...EMPTY_CHANGE_SUMMARY, [BREAKING_CHANGE_TYPE]: 2 },
    }])

    expectChangeCounts(matching, { changes: { [BREAKING_CHANGE_TYPE]: 2 }, impacted: { [BREAKING_CHANGE_TYPE]: 2 } })
    expect(() => expectChangeCounts(matching, { changes: { [BREAKING_CHANGE_TYPE]: 2 }, impacted: {} })).toThrow()
  })

  test('expectChangeCounts with NO_CHANGES should assert that nothing changed', () => {
    const unchanged = resultWith([{
      apiType: ASYNCAPI_API_TYPE,
      changesSummary: EMPTY_CHANGE_SUMMARY,
      numberOfImpactedOperations: EMPTY_CHANGE_SUMMARY,
    }])

    expectChangeCounts(unchanged, NO_CHANGES, ASYNCAPI_API_TYPE)
    expect(() => expectChangeCounts(restComparison, NO_CHANGES)).toThrow()
  })

})

describe('expectNotEmpty', () => {
  test('should pass on an array, a string or a map with something in it', () => {
    expectNotEmpty([1])
    expectNotEmpty('x')
    expectNotEmpty(new Map([['k', 1]]))
  })

  test('should fail on an empty collection of any of those kinds', () => {
    expect(() => expectNotEmpty([])).toThrow()
    expect(() => expectNotEmpty('')).toThrow()
    expect(() => expectNotEmpty(new Map())).toThrow()
  })

  // the `?.length` it replaced failed on a missing value too, so this must not pass it quietly
  test('should fail on a missing collection', () => {
    expect(() => expectNotEmpty(undefined)).toThrow()
  })
})
