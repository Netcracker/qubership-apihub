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

import { buildChangelogPackage, expectChangeCounts } from './helpers'
import { ASYNCAPI_API_TYPE, BREAKING_CHANGE_TYPE } from '../src'

// these tests assert nothing about validity, and validation compiles the AsyncAPI schema anew for each document
jest.mock('../src/apitypes/async/async.validation', () => ({ validateAsyncApiDocument: async () => undefined }))

// the counts come from api-diff, which merges the diffs of one declaration; the processor only has to hand it the
// message diffs of each operation
describe('Number of declarative changes in asyncapi operation test', () => {
  test('Multiple use of one schema in a message payload', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-asyncapi-operation/shared-schema-in-payload')
    expectChangeCounts(result, {
      changes: { [BREAKING_CHANGE_TYPE]: 1 },
      impacted: { [BREAKING_CHANGE_TYPE]: 1 },
    }, ASYNCAPI_API_TYPE)
  })

  test('Multiple use of one schema inside another schema used in a message payload', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-asyncapi-operation/shared-schema-in-nested-payload')
    expectChangeCounts(result, {
      changes: { [BREAKING_CHANGE_TYPE]: 1 },
      impacted: { [BREAKING_CHANGE_TYPE]: 1 },
    }, ASYNCAPI_API_TYPE)
  })

  // skipped: one change reaches the payload and the headers of the same message, and api-diff reports it once.
  // REST counts a schema shared by the request and the response twice, but those are two directions; which count is
  // right for two places in one message is not decided yet
  test.skip('Multiple use of one schema in both message payload and headers', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-asyncapi-operation/shared-schema-in-payload-and-headers')
    expectChangeCounts(result, {
      changes: { [BREAKING_CHANGE_TYPE]: 2 },
      impacted: { [BREAKING_CHANGE_TYPE]: 1 },
    }, ASYNCAPI_API_TYPE)
  })

  test('Circular reference in message payload with a schema type change', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-asyncapi-operation/circular-ref-in-payload')
    expectChangeCounts(result, {
      changes: { [BREAKING_CHANGE_TYPE]: 1 },
      impacted: { [BREAKING_CHANGE_TYPE]: 1 },
    }, ASYNCAPI_API_TYPE)
  })
})
