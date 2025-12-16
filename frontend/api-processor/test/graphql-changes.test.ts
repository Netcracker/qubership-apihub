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
  buildGqlChangelogPackage,
  changesSummaryMatcher,
  numberOfImpactedOperationsMatcher,
  operationChangesMatcher,
} from './helpers'
import { BREAKING_CHANGE_TYPE, GRAPHQL_API_TYPE, NON_BREAKING_CHANGE_TYPE } from '../src'

describe('Graphql changes test', () => {
  describe('Added/removed/changed operations handling', () => {
    test('Add operation', async () => {
      const result = await buildGqlChangelogPackage('graphql-changes/add-operation')
      expect(result).toEqual(changesSummaryMatcher({ [NON_BREAKING_CHANGE_TYPE]: 1 }, GRAPHQL_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [NON_BREAKING_CHANGE_TYPE]: 1 }, GRAPHQL_API_TYPE))
    })

    test('Remove operation', async () => {
      const result = await buildGqlChangelogPackage('graphql-changes/remove-operation')
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, GRAPHQL_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, GRAPHQL_API_TYPE))
    })

    test('Change operation content', async () => {
      const result = await buildGqlChangelogPackage('graphql-changes/change-inside-operation')
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, GRAPHQL_API_TYPE))
      expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, GRAPHQL_API_TYPE))
    })
  })

  test('Operation changes fields are correct', async () => {
    const result = await buildGqlChangelogPackage('graphql-changes/operation-changes-fields')

    expect(result).toEqual(operationChangesMatcher([
      expect.objectContaining({
        previousOperationId: 'query-fruits',
        operationId: 'query-fruits',
        previousMetadata: {
          'title': 'Fruits',
          'tags': ['queries'],
          'method': 'fruits',
          'type': 'query',
        },
        metadata: {
          'title': 'Fruits',
          'tags': ['queries'],
          'method': 'fruits',
          'type': 'query',
        },
        // rest of the fields are covered by dedicated tests
      }),
    ]))
  })
})
