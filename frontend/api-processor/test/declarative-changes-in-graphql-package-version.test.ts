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
  buildChangelogPackage,
  buildGqlChangelogPackage,
  changesSummaryMatcher,
  numberOfImpactedOperationsMatcher,
} from './helpers'
import { BREAKING_CHANGE_TYPE, GRAPHQL_API_TYPE, NON_BREAKING_CHANGE_TYPE, RISKY_CHANGE_TYPE } from '../src'

describe('Number of declarative changes in graphql package version test', () => {
  test('Two operations in the package version use the same type in the response', async () => {
    const result = await buildGqlChangelogPackage('declarative-changes-in-graphql-package-version/case1')
    expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, GRAPHQL_API_TYPE))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 2 }, GRAPHQL_API_TYPE))
  })

  test('Two operations use the same type in different contexts (response and input)', async () => {
    const result = await buildGqlChangelogPackage('declarative-changes-in-graphql-package-version/case2')
    expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1, [NON_BREAKING_CHANGE_TYPE]: 1 }, GRAPHQL_API_TYPE))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [RISKY_CHANGE_TYPE]: 2, [NON_BREAKING_CHANGE_TYPE]: 1 }, GRAPHQL_API_TYPE))
  })

  test('Two Operations with the same type: One Uses the Type in Mutation Input (Arguments), Another in Query Response', async () => {
    const result = await buildGqlChangelogPackage('declarative-changes-in-graphql-package-version/case3')
    expect(result).toEqual(changesSummaryMatcher({
      [RISKY_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 1,
    }, GRAPHQL_API_TYPE))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({
      [RISKY_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 1,
    }, GRAPHQL_API_TYPE))
  })

  test('Two operations in the package version with different types but the same type names', async () => {
    const result = await buildChangelogPackage(
      'declarative-changes-in-graphql-package-version/case4',
      [{ fileId: 'before/spec1.gql' }, { fileId: 'before/spec2.gql' }],
      [{ fileId: 'after/spec1.gql' }, { fileId: 'after/spec2.gql' }],
    )
    expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1,[NON_BREAKING_CHANGE_TYPE]: 1 }, GRAPHQL_API_TYPE))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1,[NON_BREAKING_CHANGE_TYPE]: 1 }, GRAPHQL_API_TYPE))
  })
})
