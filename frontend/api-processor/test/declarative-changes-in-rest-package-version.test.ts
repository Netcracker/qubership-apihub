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
import { BREAKING_CHANGE_TYPE, NON_BREAKING_CHANGE_TYPE, RISKY_CHANGE_TYPE } from '../src'

describe('Number of declarative changes in rest package version test', () => {
  test('Two operations use one schema in response', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-package-version/case1')
    expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 2 }))
  })

  test('Two operations use one schema in response and request (same severity)', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-package-version/case2')
    expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 2 }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 2 }))
  })

  test('Two operations use one schema in response and request (different severity)', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-package-version/case3')
    expect(result).toEqual(changesSummaryMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 1,
    }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 1,
    }))
  })

  test('Two operations use different schemas but the same schema names', async () => {
    const result = await buildChangelogPackage(
      'declarative-changes-in-rest-package-version/case4',
      [{ fileId: 'before/spec1.yaml' }, { fileId: 'before/spec2.yaml' }],
      [{ fileId: 'after/spec1.yaml' }, { fileId: 'after/spec2.yaml' }],
    )
    expect(result).toEqual(changesSummaryMatcher({ [NON_BREAKING_CHANGE_TYPE]: 2 }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [NON_BREAKING_CHANGE_TYPE]: 2 }))
  })

  test('Two operations use one schema in response but one of the operations is no-BWC', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-package-version/case5')
    expect(result).toEqual(changesSummaryMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [RISKY_CHANGE_TYPE]: 1,
    }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [RISKY_CHANGE_TYPE]: 1,
    }))
  })

  test('Uses synthetic document when there is no existing appropriate document pair', async () => {
    const result = await buildChangelogPackage(
      'declarative-changes-in-rest-package-version/whole-documents-added-removed',
      [{ fileId: 'before/spec1.yaml' }],
      [{ fileId: 'after/spec2.yaml' }],
    )
    expect(result).toEqual(changesSummaryMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 1,
    }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 1,
    }))
  })

  test('Changes are not duplicated when deleted operation could be mapped to several documents', async () => {
    const result = await buildChangelogPackage(
      'declarative-changes-in-rest-package-version/deleted-operation-mapped-to-several-documents',
      [{ fileId: 'before/spec1.yaml' }],
      [{ fileId: 'after/spec2.yaml' }, { fileId: 'after/spec3.yaml' }],
    )
    expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
  })
})
