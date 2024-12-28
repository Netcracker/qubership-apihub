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
import { BREAKING_CHANGE_TYPE, GRAPHQL_API_TYPE, NON_BREAKING_CHANGE_TYPE } from '../src'

describe('Graphql changes test', () => {
  test('add mutation', async () => {
    const result = await buildChangelogPackage(
      'graphql-changes-test/add-mutation', [{ fileId: 'before.gql' }], [{ fileId: 'after.gql' }],
    )
    expect(result).toEqual(changesSummaryMatcher({ [NON_BREAKING_CHANGE_TYPE]: 1 }, GRAPHQL_API_TYPE))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [NON_BREAKING_CHANGE_TYPE]: 1 }, GRAPHQL_API_TYPE))
  })

  test('remove mutation', async () => {
    const result = await buildChangelogPackage(
      'graphql-changes-test/remove-mutation', [{ fileId: 'before.gql' }], [{ fileId: 'after.gql' }],
    )
    expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, GRAPHQL_API_TYPE))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, GRAPHQL_API_TYPE))
  })
})
