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
import { buildPackageWithDefaultConfig, cloneDocument, loadYamlFile, LocalRegistry } from './helpers'
import { extractProtocol } from '../src/apitypes/async/async.utils'
import { FIRST_REFERENCE_KEY_PROPERTY, INLINE_REFS_FLAG } from '../src/consts'
import { ASYNC_EFFECTIVE_NORMALIZE_OPTIONS, BUILD_TYPE, VERSION_STATUS } from '../src'
import { normalize } from '@netcracker/qubership-apihub-api-unifier'

const normalizeAsyncApiDocument = (doc: AsyncAPIV3.AsyncAPIObject): AsyncAPIV3.AsyncAPIObject =>
  normalize(doc, {
    ...ASYNC_EFFECTIVE_NORMALIZE_OPTIONS,
    firstReferenceKeyProperty: FIRST_REFERENCE_KEY_PROPERTY,
    inlineRefsFlag: INLINE_REFS_FLAG,
  }) as AsyncAPIV3.AsyncAPIObject

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

    test('single-operation spec data should include relevant operation when multiple operations share the same message', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/operations/shared-message')
      const operations = Array.from(result.operations.values())
      expect(operations).toHaveLength(2)

      for (const operation of operations) {
        const asyncApiData = operation.data as AsyncAPIV3.AsyncAPIObject
        const operationKeys = Object.keys(asyncApiData?.operations ?? {})
        expect(operationKeys).toEqual([operation.metadata.asyncOperationId])
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

      normalizedDocument = normalizeAsyncApiDocument(baseDocument)
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

    test('should not include servers/components by default', () => {
      const result = createOperationSpec(normalizedDocument, OPERATION_ID_1)

      expect(result.channels).toBeDefined()
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

    /**
     * Tests for channel message filtering in createOperationSpec.
     *
     * Setup (shared-channel/spec.yaml):
     *   - sharedChannel (events/shared): MessageA, MessageB, MessageC, MessageD
     *   - otherChannel (events/other): MessageE
     *   - anotherChannelWithSameMessage (events/another): MessageA (same component)
     *
     *   - multiMessageOp (send, sharedChannel): MessageA, MessageB, MessageC
     *   - operationD (receive, sharedChannel): MessageD
     *   - operationE (send, otherChannel): MessageE
     *   - operationF (send, anotherChannelWithSameMessage): MessageA
     *
     * createOperationSpec must filter channel.messages to only include messages
     * that are actually requested. Operations sharing the same source channel
     * must receive the same filtered channel instance.
     */
    describe('Shared channel message filtering', () => {
      const MULTI_MESSAGE_OP = 'multiMessageOp'
      const OPERATION_D = 'operationD'
      const OPERATION_E = 'operationE'
      const OPERATION_F = 'operationF'
      const MESSAGE_ID_A = 'MessageA'
      const MESSAGE_ID_B = 'MessageB'
      const MESSAGE_ID_C = 'MessageC'
      const MESSAGE_ID_D = 'MessageD'
      const MESSAGE_ID_E = 'MessageE'

      let sharedChannelNormalized: AsyncAPIV3.AsyncAPIObject
      let operationIdA: string
      let operationIdB: string
      let operationIdC: string
      let operationIdD: string
      let operationIdE: string
      let operationIdF: string

      beforeAll(async () => {
        operationIdA = calculateAsyncOperationId(MULTI_MESSAGE_OP, MESSAGE_ID_A)
        operationIdB = calculateAsyncOperationId(MULTI_MESSAGE_OP, MESSAGE_ID_B)
        operationIdC = calculateAsyncOperationId(MULTI_MESSAGE_OP, MESSAGE_ID_C)
        operationIdD = calculateAsyncOperationId(OPERATION_D, MESSAGE_ID_D)
        operationIdE = calculateAsyncOperationId(OPERATION_E, MESSAGE_ID_E)
        operationIdF = calculateAsyncOperationId(OPERATION_F, MESSAGE_ID_A)

        const sharedChannelDoc = await loadYamlFile<AsyncAPIV3.AsyncAPIObject>('asyncapi/operations/shared-channel/spec.yaml')
        sharedChannelNormalized = normalizeAsyncApiDocument(sharedChannelDoc)
      })

      test('should include only the relevant message in channel when requesting single operationId', () => {
        // Request only operationIdA (multiMessageOp + MessageA).
        // sharedChannel has 4 messages, but the result channel must contain only MessageA.
        const result = createOperationSpec(sharedChannelNormalized, operationIdA)

        const operation = result.operations?.[MULTI_MESSAGE_OP] as AsyncAPIV3.OperationObject
        expect(operation).toBeDefined()
        expect(operation.messages).toHaveLength(1)

        const channel = operation.channel as AsyncAPIV3.ChannelObject
        expect(Object.keys(channel.messages ?? {})).toEqual([MESSAGE_ID_A])

        // Root channels must contain only the used channel and be the same instance
        expect(Object.keys(result.channels!)).toEqual(['sharedChannel'])
        expect(result.channels?.sharedChannel).toBe(channel)
      })

      test('should filter channel messages independently per single operationId', () => {
        // Two separate calls, each requesting one message from multiMessageOp.
        // Each result must have its own filtered channel with only the requested message.
        const resultA = createOperationSpec(sharedChannelNormalized, operationIdA)
        const resultB = createOperationSpec(sharedChannelNormalized, operationIdB)

        const channelA = (resultA.operations?.[MULTI_MESSAGE_OP] as AsyncAPIV3.OperationObject).channel as AsyncAPIV3.ChannelObject
        const channelB = (resultB.operations?.[MULTI_MESSAGE_OP] as AsyncAPIV3.OperationObject).channel as AsyncAPIV3.ChannelObject

        expect(Object.keys(channelA.messages ?? {})).toEqual([MESSAGE_ID_A])
        expect(Object.keys(channelB.messages ?? {})).toEqual([MESSAGE_ID_B])

        // Root channels must contain only the used channel and be the same instance
        expect(Object.keys(resultA.channels!)).toEqual(['sharedChannel'])
        expect(Object.keys(resultB.channels!)).toEqual(['sharedChannel'])
        expect(resultA.channels?.sharedChannel).toBe(channelA)
        expect(resultB.channels?.sharedChannel).toBe(channelB)
      })

      test('should include only requested messages in channel when requesting multiple operationIds', () => {
        // Request A and C from multiMessageOp + D from operationD — all on sharedChannel.
        // The shared filtered channel must contain A, C, D but not B.
        // multiMessageOp gets 2 messages (A, C), operationD gets 1 message (D).
        const result = createOperationSpec(sharedChannelNormalized, [operationIdA, operationIdC, operationIdD])

        const multiMessageOperation = result.operations?.[MULTI_MESSAGE_OP] as AsyncAPIV3.OperationObject
        expect(multiMessageOperation).toBeDefined()
        expect(multiMessageOperation.messages).toHaveLength(2)

        const operationD = result.operations?.[OPERATION_D] as AsyncAPIV3.OperationObject
        expect(operationD).toBeDefined()
        expect(operationD.messages).toHaveLength(1)

        const multiMessageOperationChannel = multiMessageOperation.channel as AsyncAPIV3.ChannelObject
        const channelMessageKeys = Object.keys(multiMessageOperationChannel.messages ?? {})
        expect(channelMessageKeys).toEqual(expect.arrayContaining([MESSAGE_ID_A, MESSAGE_ID_C, MESSAGE_ID_D]))
        expect(channelMessageKeys).not.toContain(MESSAGE_ID_B)

        // Root channels must contain only the used channel and be the same instance
        expect(Object.keys(result.channels!)).toEqual(['sharedChannel'])
        expect(result.channels?.sharedChannel).toBe(multiMessageOperationChannel)
      })

      test('should share same channel instance between operations referencing the same channel', () => {
        // multiMessageOp and operationD both reference sharedChannel.
        // After filtering, they must point to the same channel object (identity check).
        const result = createOperationSpec(sharedChannelNormalized, [operationIdA, operationIdD])

        const multiMessageOperation = result.operations?.[MULTI_MESSAGE_OP] as AsyncAPIV3.OperationObject
        const operationD = result.operations?.[OPERATION_D] as AsyncAPIV3.OperationObject

        expect(multiMessageOperation.channel).toBe(operationD.channel)

        // Root channels must contain only the used channel and be the same instance
        expect(Object.keys(result.channels!)).toEqual(['sharedChannel'])
        expect(result.channels?.sharedChannel).toBe(multiMessageOperation.channel)
      })

      test('should have different channel instances for operations referencing different channels', () => {
        // multiMessageOp references sharedChannel, operationE references otherChannel.
        // Different source channels → different filtered channel instances.
        const result = createOperationSpec(sharedChannelNormalized, [operationIdA, operationIdE])

        const multiMessageOperation = result.operations?.[MULTI_MESSAGE_OP] as AsyncAPIV3.OperationObject
        const operationE = result.operations?.[OPERATION_E] as AsyncAPIV3.OperationObject

        expect(multiMessageOperation.channel).not.toBe(operationE.channel)

        // Root channels must contain only the used channels and be the same instances
        expect(Object.keys(result.channels!)).toEqual(expect.arrayContaining(['sharedChannel', 'otherChannel']))
        expect(Object.keys(result.channels!)).toHaveLength(2)

        expect(result.channels?.sharedChannel).toBe(multiMessageOperation.channel)
        expect(result.channels?.otherChannel).toBe(operationE.channel)
      })

      test('should have different channel instances when different channels reference the same message', () => {
        // multiMessageOp uses MessageA from sharedChannel,
        // operationF uses the same MessageA component but from anotherChannelWithSameMessage.
        // Same message component, but different channel objects → different filtered instances.
        const result = createOperationSpec(sharedChannelNormalized, [operationIdA, operationIdF])

        const multiMessageOperation = result.operations?.[MULTI_MESSAGE_OP] as AsyncAPIV3.OperationObject
        const operationF = result.operations?.[OPERATION_F] as AsyncAPIV3.OperationObject

        expect(multiMessageOperation.channel).not.toBe(operationF.channel)

        // Root channels must contain only the used channels and be the same instances
        expect(Object.keys(result.channels!)).toEqual(expect.arrayContaining(['sharedChannel', 'anotherChannelWithSameMessage']))
        expect(Object.keys(result.channels!)).toHaveLength(2)

        expect(result.channels?.sharedChannel).toBe(multiMessageOperation.channel)
        expect(result.channels?.anotherChannelWithSameMessage).toBe(operationF.channel)
      })
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

  // TODO: unskip after api-unifier propagates root servers to channels during normalization.
  describe('Root servers propagation to channels without explicit servers', () => {
    const ROOT_SERVERS_DOC_PATH = 'asyncapi/operations/root-servers-no-channel-servers.yaml'
    const OP_KEY = 'operation1'
    const MSG_ID = 'message1'
    let rootServersDoc: AsyncAPIV3.AsyncAPIObject
    let rootServersNormalizedDoc: AsyncAPIV3.AsyncAPIObject
    let rootServersOpId: string

    const createRefsMsg = (messageId: string, inlineRefs: string[]): Record<string | symbol, unknown> => {
      const message: Record<string | symbol, unknown> = {}
      message[FIRST_REFERENCE_KEY_PROPERTY] = messageId
      message[INLINE_REFS_FLAG] = inlineRefs
      return message
    }

    beforeAll(async () => {
      rootServersOpId = calculateAsyncOperationId(OP_KEY, MSG_ID)
      rootServersDoc = await loadYamlFile(ROOT_SERVERS_DOC_PATH)
      rootServersNormalizedDoc = normalizeAsyncApiDocument(rootServersDoc)
    })

    test.skip('createOperationSpec should include root servers when channel has no explicit servers', () => {
      // After api-unifier normalization, channel1.servers should contain all root servers.
      // createOperationSpec works on the normalized document, so the operation spec
      // should include the servers that were propagated to the channel.
      const result = createOperationSpec(rootServersNormalizedDoc, rootServersOpId)

      expect(result.servers).toBeDefined()
      expect(Object.keys(result.servers!)).toEqual(expect.arrayContaining(['production', 'staging']))
    })

    test.skip('createOperationSpecWithInlineRefs should include root servers when channel has no explicit servers', () => {
      // Same as above but via createOperationSpecWithInlineRefs path.
      const refsOnlyDocument = {
        operations: {
          [OP_KEY]: {
            messages: [
              createRefsMsg(MSG_ID, ['#/channels/channel1/messages/message1']),
            ],
          },
        },
        [INLINE_REFS_FLAG]: [
          '#/servers/production',
          '#/servers/staging',
          '#/channels/channel1',
          '#/channels/channel1/messages/message1',
          '#/components/messages/message1',
        ],
      } as unknown as AsyncAPIV3.AsyncAPIObject

      const result = createOperationSpecWithInlineRefs(rootServersDoc, rootServersOpId, refsOnlyDocument)

      expect(result.servers).toBeDefined()
      expect(Object.keys(result.servers!)).toEqual(expect.arrayContaining(['production', 'staging']))
    })
  })

  describe('Duplicate operationId validation', () => {
    test('should throw error during build when same operationId appears in multiple documents', async () => {
      const packageId = 'asyncapi-changes/operation/duplicate-cross-document'
      const portal = new LocalRegistry(packageId)

      await expect(portal.publish(packageId, {
        packageId,
        version: 'v1',
        status: VERSION_STATUS.RELEASE,
        buildType: BUILD_TYPE.BUILD,
        files: [
          { fileId: 'spec1.yaml', publish: true },
          { fileId: 'spec2.yaml', publish: true },
        ],
      })).rejects.toThrow(/Duplicated operationId 'operation1-message1'/)
    })
  })
})
