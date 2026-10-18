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
import { ASYNCAPI_API_TYPE, BREAKING_CHANGE_TYPE } from '../src'

describe.skip('Number of declarative changes in asyncapi operation test', () => {
  test('Multiple use of one schema in a message payload', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-asyncapi-operation/shared-schema-in-payload')
    expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
  })

  test('Multiple use of one schema inside another schema used in a message payload', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-asyncapi-operation/shared-schema-in-nested-payload')
    expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
  })

  test('Multiple use of one schema in both message payload and headers', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-asyncapi-operation/shared-schema-in-payload-and-headers')
    expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 2 }, ASYNCAPI_API_TYPE))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
  })

  test('Circular reference in message payload with a schema type change', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-asyncapi-operation/circular-ref-in-payload')
    expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1 }, ASYNCAPI_API_TYPE))
  })
})
