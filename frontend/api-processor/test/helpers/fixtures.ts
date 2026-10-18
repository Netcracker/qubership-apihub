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

// documents for tests that need one of a kind and assert nothing about what is inside it; each guarantee in the
// JSDoc below is checked in `fixtures.test.ts`, and nothing beyond them may be relied on

/** A before/after pair of one document. */
export interface DocumentChange {
  before: string
  after: string
}

const restDocument = (operation: Record<string, unknown> = {}): string => JSON.stringify({
  openapi: '3.0.0',
  info: { title: 'Test', version: '1.0' },
  paths: { '/test': { get: { operationId: 'getTest', ...operation, responses: { '200': { description: 'OK' } } } } },
}, undefined, 2)

/**
 * A REST document with one operation. It publishes as a release with no notifications under a `.json` or a
 * `.yaml` file id: the REST parser takes content that opens with a brace as JSON whatever the extension, but the
 * builder hands a file to the parsers only under a supported extension.
 */
export const ANY_REST_SPEC = restDocument()

/**
 * `ANY_REST_SPEC` before and after an annotation change inside its operation. Both sides publish as a release
 * with no notifications; the changelog has one comparison with one operation change, one annotation change, and
 * no notifications on the build, the comparison, or the build-level comparison stream. A build of `after` as `v2`
 * under `after.yaml`, with `previousVersion: 'v1'` over the published pair, gives the same comparison with no
 * notifications.
 */
export const ANY_REST_CHANGE: DocumentChange = {
  before: ANY_REST_SPEC,
  after: restDocument({ summary: 'Get the test resource' }),
}

/**
 * A GraphQL schema before and after a breaking change inside its one query. Publish it under a `.gql` file id.
 * Both sides publish as a release with no notifications; the changelog has one comparison with one operation
 * change, one breaking change, and no notifications on the build, the comparison, or the build-level comparison
 * stream.
 */
export const ANY_GRAPHQL_CHANGE: DocumentChange = {
  before: 'type Query {\n  fruits: String\n}\n',
  after: 'type Query {\n  fruits: Int\n}\n',
}

const asyncApiDocument = (payloadType: string): string => `asyncapi: 3.0.0
info:
  title: Test AsyncAPI
  version: 1.0.0
channels:
  channel1:
    address: channel1
    messages:
      message1:
        $ref: '#/components/messages/message1'
operations:
  operation1:
    action: receive
    channel:
      $ref: '#/channels/channel1'
    messages:
      - $ref: '#/channels/channel1/messages/message1'
components:
  messages:
    message1:
      payload:
        type: object
        properties:
          userId:
            type: ${payloadType}
`

/**
 * An AsyncAPI document with one operation. It publishes as a release with no notifications under a `.yaml`
 * file id.
 */
export const ANY_ASYNCAPI_SPEC = asyncApiDocument('string')

/**
 * `ANY_ASYNCAPI_SPEC` before and after a breaking change inside its one operation: the payload of its message
 * changes type. Both sides publish as a release with no notifications; the changelog has one comparison with one
 * operation change, one breaking change, and no notifications on the build, the comparison, or the build-level
 * comparison stream. The message is a `$ref`: written inline, it has no id and the comparison loses the change.
 */
export const ANY_ASYNCAPI_CHANGE: DocumentChange = {
  before: ANY_ASYNCAPI_SPEC,
  after: asyncApiDocument('integer'),
}

/**
 * A DDL script that publishes as a release with no notifications, as one document of type `ddl`, under a `.sql`
 * file id.
 */
export const ANY_DDL_SPEC = 'CREATE TABLE widgets (id bigint PRIMARY KEY);\n'
