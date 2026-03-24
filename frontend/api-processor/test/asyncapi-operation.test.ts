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

import { beforeAll, describe, expect, it, test } from '@jest/globals'
import { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'
import { createOperationSpec, createOperationSpecWithInlineRefs } from '../src/apitypes/async/async.operation'
import { calculateAsyncOperationId } from '../src/utils'
import { buildPackageWithDefaultConfig, cloneDocument, loadYamlFile } from './helpers'
import { extractProtocol } from '../src/apitypes/async/async.utils'
import { FIRST_REFERENCE_KEY_PROPERTY, INLINE_REFS_FLAG } from '../src/consts'
import { ASYNC_EFFECTIVE_NORMALIZE_OPTIONS } from '../src'
import { normalize } from '@netcracker/qubership-apihub-api-unifier'

describe('AsyncAPI 3.0 Operation Tests', () => {

  describe('Building Package with Operations', () => {
    test('should ignore operation without message', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/operations/broken-operation')
      expect(Array.from(result.operations.values())).toHaveLength(0)
    })

    test('should build single operation from package', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/operations/single-operation')
      expect(Array.from(result.operations.values())).toHaveLength(1)
    })

    test('should build multiple operations from package', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/operations/multiple-operations')
      expect(Array.from(result.operations.values())).toHaveLength(3)
    })

    test('should set search config with useOperationDataAsSearchText=true on all operations', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/operations/multiple-operations')
      for (const operation of Array.from(result.operations.values())) {
        expect(operation.search).toEqual({ useOperationDataAsSearchText: true })
      }
    })

    // TODO: remove after new search is adopted irrevocably
    test('should set empty searchScopes (legacy) on all operations', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/operations/multiple-operations')
      for (const operation of Array.from(result.operations.values())) {
        expect(operation.searchScopes).toEqual({})
      }
    })
  })

  describe('OperationId Tests', () => {
    it('should generate unique operationIds (unit)', () => {
      const data = [
        // basic asyncapi
        ['publishOrderCreated', 'orderCreated', 'publishOrderCreated-orderCreated'],

        // dotted event version
        ['publishOrder', 'order.created.v1', 'publishOrder-order.created.v1'],

        // namespace event
        ['publishUser', 'com.company.user.created', 'publishUser-com.company.user.created'],

        // slash in messageId (channel-like)
        ['publishUser', 'user/account/created','publishUser-user-account-created'],

        // brackets version
        ['publishOrder', 'orderCreated(v1)', 'publishOrder-orderCreated_v1_'],
        ['publishOrder', 'orderCreated[v1]', 'publishOrder-orderCreated_v1_'],

        // underscore preserved
        ['publish_user', 'user_created', 'publish_user-user_created'],

        // star preserved
        ['publishEvent', 'event.created*internal', 'publishEvent-event.created.internal'],

        // spaces (slug replaces with dash)
        ['publish Order', 'order created', 'publish-Order-order-created'],

        // complex asyncapi real-world
        ['publishOrderEvent', 'com.company.order/created.v1', 'publishOrderEvent-com.company.order-created.v1'],

        // kafka topic style
        ['publishKafkaEvent', 'order.created.v1.eu-west-1', 'publishKafkaEvent-order.created.v1.eu-west-1'],

        // mixed symbols
        ['publish(Order)', 'order.created[v1]', 'publish_Order_-order.created_v1_'],
      ]
      data.forEach(([operationId, messageId, expected]) => {
        const result = calculateAsyncOperationId(operationId, messageId)
        expect(result).toBe(expected)
      })
    })

    it('should set operationId in built package (e2e)', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/operations/single-operation')
      const operations = Array.from(result.operations.values())
      const [operation] = operations
      expect(operation.operationId).toBe('sendUserSignedup-UserSignedUp')
    })
  })

  describe('Operation title test', () => {
    it('should set operation title in built package (e2e) as message title', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/operations/single-operation')
      const operations = Array.from(result.operations.values())
      const [operation] = operations
      expect(operation.title).toBe('User Signed Up')
    })

    it('should set operation title as message id if message title doesn\'t exist', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/operations/single-operation')
      const operations = Array.from(result.operations.values())
      const [operation] = operations
      expect(operation.title).toBe('User Signed Up')
    })
  })

  describe('Operation metadata tests', () => {
    it('should set action in metadata', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/operations/single-operation')
      const [operation] = Array.from(result.operations.values())
      expect(operation.metadata.action).toBe('send')
    })

    it('should set channel in metadata', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/operations/single-operation')
      const [operation] = Array.from(result.operations.values())
      expect(operation.metadata.channel).toBe('userSignedup')
    })

    it('should set messageId in metadata', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/operations/single-operation')
      const [operation] = Array.from(result.operations.values())
      expect(operation.metadata.messageId).toBe('UserSignedUp')
    })

    it('should set asyncOperationId in metadata', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/operations/single-operation')
      const [operation] = Array.from(result.operations.values())
      expect(operation.metadata.asyncOperationId).toBe('sendUserSignedup')
    })
  })

  describe('Operation protocol tests', () => {
    it('should uses the (first) server protocol', () => {
      const channel = {
        title: 'channel1',
        servers: [
          { protocol: 'amqp' },
          { protocol: 'kafka' },
        ],
      } as AsyncAPIV3.ChannelObject

      expect(extractProtocol(channel)).toBe('amqp')
    })

    it('should skip $ref servers and return first server with protocol', () => {
      const channel = {
        title: 'channel1',
        servers: [
          { $ref: '#/servers/amqp1' },
          { protocol: 'amqp' },
        ],
      } as AsyncAPIV3.ChannelObject

      expect(extractProtocol(channel)).toBe('amqp')
    })

    it('should returns unknown when servers are missing or empty', () => {
      expect(extractProtocol({ title: 'no-servers' } as unknown as AsyncAPIV3.ChannelObject)).toBe('unknown')
      expect(extractProtocol({
        title: 'empty-servers',
        servers: [],
      } as unknown as AsyncAPIV3.ChannelObject)).toBe('unknown')
    })

    it('should operation has protocol', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/operations/single-operation')
      const operations = Array.from(result.operations.values())
      const [operation] = operations
      expect(operation.metadata.protocol).toBeDefined()
    })
  })

  describe('Operation security tests', () => {
    it('should preserve operation-level security in built package', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/operations/operation-security')
      const [apiHubOperation] = Array.from(result.operations.values())
      const asyncApiDocument: AsyncAPIV3.AsyncAPIObject = apiHubOperation.data
      const operationEntries = Object.values(asyncApiDocument.operations ?? {}) as AsyncAPIV3.OperationObject[]
      expect(operationEntries).toHaveLength(1)

      const [asyncOperation] = operationEntries
      expect(asyncOperation.security).toBeDefined()
      expect(asyncOperation.security).toHaveLength(2)
    })

    it('should include securitySchemes in components when inlined', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/operations/operation-security')
      const [apiHubOperation] = Array.from(result.operations.values())
      const asyncApiDocument: AsyncAPIV3.AsyncAPIObject = apiHubOperation.data

      const securitySchemes = asyncApiDocument.components?.securitySchemes
      expect(securitySchemes).toHaveProperty('oauth2')
      expect(securitySchemes).toHaveProperty('apiKey')
    })

    it('should not have security when operation has no security defined', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/operations/single-operation')
      const [apiHubOperation] = Array.from(result.operations.values())
      const asyncApiDocument: AsyncAPIV3.AsyncAPIObject = apiHubOperation.data

      const operationEntries = Object.values(asyncApiDocument.operations ?? {}) as AsyncAPIV3.OperationObject[]
      const [asyncOperation] = operationEntries
      expect(asyncOperation.security).toBeUndefined()
    })

    it('should have security in operations channel servers', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/operations/server-security')
      const operations = Array.from(result.operations.values())
      expect(operations).toHaveLength(1)

      const [apiHubOperation] = operations
      const asyncApiDocument: AsyncAPIV3.AsyncAPIObject = apiHubOperation.data

      const serverEntries = asyncApiDocument?.servers ? Object.values(asyncApiDocument.servers) as AsyncAPIV3.ServerObject[] : []
      const serverWithSecurity = serverEntries.find(server => server.security)
      expect(serverWithSecurity).toBeDefined()
      expect(serverWithSecurity!.security).toHaveLength(2)
    })
  })

  describe('Create operation spec tests', () => {
    const OPERATION_KEY_1 = 'sendUserSignedUp'
    const OPERATION_KEY_2 = 'sendUserSignedOut'
    const MESSAGE_ID_1 = 'UserSignedUp'
    const MESSAGE_ID_2 = 'UserSignedOut'
    const MESSAGE_REF_1 = '#/channels/userSignedUp/messages/UserSignedUp'

    let OPERATION_ID_1: string
    let OPERATION_ID_2: string
    let baseDocument: AsyncAPIV3.AsyncAPIObject
    let normalizedDocument: AsyncAPIV3.AsyncAPIObject

    const createRefsMessage = (messageId: string, inlineRefs: string[]): Record<string | symbol, unknown> => {
      const message: Record<string | symbol, unknown> = {}
      message[FIRST_REFERENCE_KEY_PROPERTY] = messageId
      message[INLINE_REFS_FLAG] = inlineRefs
      return message
    }

    beforeAll(async () => {
      OPERATION_ID_1 = calculateAsyncOperationId(OPERATION_KEY_1, MESSAGE_ID_1)
      OPERATION_ID_2 = calculateAsyncOperationId(OPERATION_KEY_2, MESSAGE_ID_2)

      baseDocument = await loadYamlFile('asyncapi/operations/base.yaml')

      normalizedDocument = normalize(baseDocument, {
        ...ASYNC_EFFECTIVE_NORMALIZE_OPTIONS,
        firstReferenceKeyProperty: FIRST_REFERENCE_KEY_PROPERTY,
        inlineRefsFlag: INLINE_REFS_FLAG,
      }) as AsyncAPIV3.AsyncAPIObject
    })

    test('should select a single operation by key', () => {
      const result = createOperationSpec(normalizedDocument, OPERATION_ID_1)

      expect(Object.keys(result.operations || {})).toEqual([OPERATION_KEY_1])
      expect(result.operations?.[OPERATION_KEY_1]).toBeDefined()
    })

    test('should preserve asyncapi and info', () => {
      const result = createOperationSpec(normalizedDocument, OPERATION_ID_1)

      expect(result.asyncapi).toBe(normalizedDocument.asyncapi)
      expect(result.info).toEqual(normalizedDocument.info)
    })

    test('should not include channels/servers/components by default', () => {
      const result = createOperationSpec(normalizedDocument, OPERATION_ID_1)

      expect(result.channels).toBeUndefined()
      expect(result.servers).toBeUndefined()
      expect(result.components).toBeUndefined()
    })

    test('should select multiple operations by keys (array) and preserve requested order', () => {
      const result = createOperationSpec(normalizedDocument, [OPERATION_ID_1, OPERATION_ID_2])

      expect(Object.keys(result.operations || {})).toEqual([OPERATION_KEY_1, OPERATION_KEY_2])
      expect(result.operations?.[OPERATION_KEY_1]).toBeDefined()
      expect(result.operations?.[OPERATION_KEY_2]).toBeDefined()
    })

    test('should accept duplicated requested keys (same operation) without duplicating output', () => {
      const result = createOperationSpec(normalizedDocument, [OPERATION_ID_1, OPERATION_ID_1, OPERATION_ID_2, OPERATION_ID_1])

      expect(Object.keys(result.operations || {})).toEqual([OPERATION_KEY_1, OPERATION_KEY_2])
      expect(result.operations?.[OPERATION_KEY_1]).toBeDefined()
      expect(result.operations?.[OPERATION_KEY_2]).toBeDefined()
    })

    test('defaults asyncapi version to 3.0.0 when missing', () => {
      const document = cloneDocument(baseDocument)
      delete (document as Partial<AsyncAPIV3.AsyncAPIObject>).asyncapi

      const result = createOperationSpec(document, OPERATION_ID_1)
      expect(result.asyncapi).toBe('3.0.0')
    })

    test('throws when document has no operations', () => {
      const document = cloneDocument(baseDocument)
      delete document.operations

      expect(() => createOperationSpec(document, OPERATION_ID_1)).toThrow(
        'AsyncAPI document has no operations. Expected non-empty "operations".',
      )
    })

    test('throws when operation keys array is empty', () => {
      expect(() => createOperationSpec(baseDocument, [])).toThrow(
        'No operation ids provided.',
      )
    })

    test('returns empty operations when the requested operation key is not found', () => {
      const result = createOperationSpec(normalizedDocument, 'missing-operation')
      expect(Object.keys(result.operations || {})).toHaveLength(0)
    })

    test('returns only matched operations when some requested keys are not found', () => {
      const result = createOperationSpec(normalizedDocument, [OPERATION_ID_1, 'missing-1', 'missing-2'])
      expect(Object.keys(result.operations || {})).toEqual([OPERATION_KEY_1])
    })

    test('should inline referenced channels/servers/components when refsOnlyDocument has inline refs (manual refs)', () => {
      const refsOnlyDocument = {
        operations: {
          [OPERATION_KEY_1]: {
            messages: [
              createRefsMessage(MESSAGE_ID_1, [MESSAGE_REF_1]),
            ],
          },
        },
        [INLINE_REFS_FLAG]: [
          '#/servers/amqp1',
          '#/channels/userSignedUp',
          MESSAGE_REF_1,
          '#/components/messages/UserSignedUp',
          '#/info/title',
        ],
      } as unknown as AsyncAPIV3.AsyncAPIObject

      const result = createOperationSpecWithInlineRefs(baseDocument, OPERATION_ID_1, refsOnlyDocument)

      expect(baseDocument).toHaveProperty(['servers', 'amqp1'], result?.servers?.amqp1)
      expect(baseDocument).toHaveProperty(['channels', 'userSignedUp'], result?.channels?.userSignedUp)
      expect(baseDocument).toHaveProperty(['channels', 'userSignedUp', 'messages', 'UserSignedUp'], (result?.channels?.userSignedUp as AsyncAPIV3.ChannelObject)?.messages?.UserSignedUp)
      expect(baseDocument).toHaveProperty(['components', 'messages', 'UserSignedUp'], result?.components?.messages?.UserSignedUp)
    })

    test('should resolve only matched operations when refsOnlyDocument contains a subset of requested', () => {
      const refsOnlyDocument = {
        operations: {
          [OPERATION_KEY_1]: {
            messages: [
              createRefsMessage(MESSAGE_ID_1, [MESSAGE_REF_1]),
            ],
          },
        },
      } as unknown as AsyncAPIV3.AsyncAPIObject

      const result = createOperationSpecWithInlineRefs(baseDocument, [OPERATION_ID_1, OPERATION_ID_2], refsOnlyDocument)

      const operationKeys = Object.keys(result.operations || {})
      expect(operationKeys).toEqual([OPERATION_KEY_1])
      expect(operationKeys).not.toContain(OPERATION_KEY_2)
    })
  })
})
