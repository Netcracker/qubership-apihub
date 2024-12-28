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

import { buildChangelogPackage, changesSummaryMatcher, numberOfImpactedOperationsMatcher } from './helpers'
import { BREAKING_CHANGE_TYPE, NON_BREAKING_CHANGE_TYPE } from '../src'

describe('Number of declarative changes in rest operation test', () => {
  test('Multiple use of one schema in response', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-operation/case1')
    expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
  })

  test('Multiple use of one schema in another schema which is used in response', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-operation/case2')
    expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
  })

  test('Multiple use of one schema in both request and response (different severity)', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-operation/case3')
    expect(result).toEqual(changesSummaryMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 1,
    }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 1,
    }))
  })

  test('Multiple use of one schema in both request and response (same severity)', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-operation/case4')
    expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 2 }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
  })

  test('Circular reference in response', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-operation/case5')
    expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
  })

  test('Circular reference in response and request', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-operation/case6')
    expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 2 }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
  })

  test('Remove params from response, which have refs to components', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-operation/case7')
    expect(result).toEqual(changesSummaryMatcher({ [NON_BREAKING_CHANGE_TYPE]: 3 }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [NON_BREAKING_CHANGE_TYPE]: 1 }))
  })
})
