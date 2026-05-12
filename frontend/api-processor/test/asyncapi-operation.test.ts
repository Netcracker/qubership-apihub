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
import { createOperationSpec, createOperationSpecEnrichedWithRefs } from '../src/apitypes/async/async.operation'
import { calculateAsyncOperationId, removeComponents } from '../src/utils'
import { buildPackageWithDefaultConfig, cloneDocument, loadYamlFile, LocalRegistry } from './helpers'
import { extractProtocol, getRequiredDefaultContentType } from '../src/apitypes/async/async.utils'
import { FIRST_REFERENCE_KEY_PROPERTY, INLINE_REFS_FLAG } from '../src/consts'
import { ASYNC_EFFECTIVE_NORMALIZE_OPTIONS, BUILD_TYPE, VERSION_STATUS } from '../src'
import { AsyncOperationData, VersionAsyncOperation } from '../src/apitypes/async/async.types'
import { normalize } from '@netcracker/qubership-apihub-api-unifier'

describe('AsyncAPI 3.0 Operation Tests', () => {
  const normalizeAsyncApiDocument = (doc: AsyncAPIV3.AsyncAPIObject): AsyncAPIV3.AsyncAPIObject =>
    normalize(doc, {
      ...ASYNC_EFFECTIVE_NORMALIZE_OPTIONS,
      firstReferenceKeyProperty: FIRST_REFERENCE_KEY_PROPERTY,
      inlineRefsFlag: INLINE_REFS_FLAG,
    }) as AsyncAPIV3.AsyncAPIObject

  const createRefsMessage = (messageId: string, inlineRefs: string[]): Record<string | symbol, unknown> => {
    const message: Record<string | symbol, unknown> = {}
    message[FIRST_REFERENCE_KEY_PROPERTY] = messageId
    message[INLINE_REFS_FLAG] = inlineRefs
    return message
  }
  describe('Unit: utilities', () => {
    describe('calculateAsyncOperationId', () => {
      it('should generate unique operationIds', () => {
        const data = [
          // basic asyncapi
          ['publishOrderCreated', 'orderCreated', 'publishOrderCreated-orderCreated'],

          // dotted event version
          ['publishOrder', 'order.created.v1', 'publishOrder-order.created.v1'],

          // namespace event
          ['publishUser', 'com.company.user.created', 'publishUser-com.company.user.created'],

          // slash in messageId (channel-like)
          ['publishUser', 'user/account/created', 'publishUser-user-account-created'],

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
    })

    describe('extractProtocol', () => {
      it('should use the (first) server protocol', () => {
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

      it('should return unknown when servers are missing or empty', () => {
        expect(extractProtocol({ title: 'no-servers' } as unknown as AsyncAPIV3.ChannelObject)).toBe('unknown')
        expect(extractProtocol({
          title: 'empty-servers',
          servers: [],
        } as unknown as AsyncAPIV3.ChannelObject)).toBe('unknown')
      })
    })

    describe('getRequiredDefaultContentType', () => {
      test('should return root default when a message lacks its own contentType', () => {
        const doc = { defaultContentType: 'application/json' } as AsyncAPIV3.AsyncAPIObject
        const messages = [{} as AsyncAPIV3.MessageObject]
        expect(getRequiredDefaultContentType(doc, messages)).toBe('application/json')
      })

      test('should return undefined when all messages define contentType', () => {
        const doc = { defaultContentType: 'application/json' } as AsyncAPIV3.AsyncAPIObject
        const messages = [
          { contentType: 'application/xml' } as AsyncAPIV3.MessageObject,
          { contentType: 'application/json' } as AsyncAPIV3.MessageObject,
        ]
        expect(getRequiredDefaultContentType(doc, messages)).toBeUndefined()
      })

      test('should return undefined when root has no defaultContentType', () => {
        const doc = {} as AsyncAPIV3.AsyncAPIObject
        const messages = [{} as AsyncAPIV3.MessageObject]
        expect(getRequiredDefaultContentType(doc, messages)).toBeUndefined()
      })
    })
  })

  describe('Unit: operation spec composition', () => {
    const OPERATION_KEY_1 = 'sendUserSignedUp'
    const OPERATION_KEY_2 = 'sendUserSignedOut'
    const MESSAGE_ID_1 = 'UserSignedUp'
    const MESSAGE_ID_2 = 'UserSignedOut'

    let OPERATION_ID_1: string
    let OPERATION_ID_2: string

    const buildRefsOnlyDoc = (source: AsyncAPIV3.AsyncAPIObject): AsyncAPIV3.AsyncAPIObject => {
      const documentWithoutComponents = removeComponents(source)
      return normalize(
        documentWithoutComponents,
        {
          mergeAllOf: false,
          firstReferenceKeyProperty: FIRST_REFERENCE_KEY_PROPERTY,
          inlineRefsFlag: INLINE_REFS_FLAG,
          source,
        },
      ) as AsyncAPIV3.AsyncAPIObject
    }

    let baseDocument: AsyncAPIV3.AsyncAPIObject
    let normalizedDocument: AsyncAPIV3.AsyncAPIObject

    beforeAll(async () => {
      OPERATION_ID_1 = calculateAsyncOperationId(OPERATION_KEY_1, MESSAGE_ID_1)
      OPERATION_ID_2 = calculateAsyncOperationId(OPERATION_KEY_2, MESSAGE_ID_2)

      baseDocument = await loadYamlFile('asyncapi/operations/base.yaml')
      normalizedDocument = normalizeAsyncApiDocument(baseDocument)
    })

    describe('createOperationSpec', () => {
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

      describe('root specification extensions', () => {
        test('should copy root-level x-* extensions into the result', () => {
          const document = cloneDocument(baseDocument) as AsyncAPIV3.AsyncAPIObject & Record<string, unknown>
          document['x-apihub-custom'] = { foo: 'bar' }
          document['x-vendor-flag'] = true
          const normalized = normalizeAsyncApiDocument(document)

          const result = createOperationSpec(normalized, OPERATION_ID_1) as unknown as Record<string, unknown>
          expect(result).toMatchObject({
            'x-apihub-custom': { foo: 'bar' },
            'x-vendor-flag': true,
          })
        })

        test('should not add empty extension keys when source has none', () => {
          const result = createOperationSpec(normalizedDocument, OPERATION_ID_1) as unknown as Record<string, unknown>
          const extensionKeys = Object.keys(result).filter(k => k.startsWith('x-'))
          expect(extensionKeys).toEqual([])
        })
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

      test('should default asyncapi version to 3.0.0 when missing', () => {
        const document = cloneDocument(baseDocument)
        delete (document as Partial<AsyncAPIV3.AsyncAPIObject>).asyncapi

        const result = createOperationSpec(document, OPERATION_ID_1)
        expect(result.asyncapi).toBe('3.0.0')
      })

      test('should throw when document has no operations', () => {
        const document = cloneDocument(baseDocument)
        delete document.operations

        expect(() => createOperationSpec(document, OPERATION_ID_1)).toThrow(
          'AsyncAPI document has no operations. Expected non-empty "operations".',
        )
      })

      test('should throw when operation keys array is empty', () => {
        expect(() => createOperationSpec(baseDocument, [])).toThrow(
          'No operation ids provided.',
        )
      })

      test('should return empty operations when the requested operation key is not found', () => {
        const result = createOperationSpec(normalizedDocument, 'missing-operation')
        expect(Object.keys(result.operations || {})).toHaveLength(0)
      })

      test('should return only matched operations when some requested keys are not found', () => {
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
      describe('shared channel message filtering', () => {
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
          const result = createOperationSpec(sharedChannelNormalized, operationIdA)

          const operation = result.operations?.[MULTI_MESSAGE_OP] as AsyncAPIV3.OperationObject
          expect(operation).toBeDefined()
          expect(operation.messages).toHaveLength(1)

          const channel = operation.channel as AsyncAPIV3.ChannelObject
          expect(Object.keys(channel.messages ?? {})).toEqual([MESSAGE_ID_A])

          expect(Object.keys(result.channels!)).toEqual(['sharedChannel'])
          expect(result.channels?.sharedChannel).toBe(channel)
        })

        test('should filter channel messages independently per single operationId', () => {
          const resultA = createOperationSpec(sharedChannelNormalized, operationIdA)
          const resultB = createOperationSpec(sharedChannelNormalized, operationIdB)

          const channelA = (resultA.operations?.[MULTI_MESSAGE_OP] as AsyncAPIV3.OperationObject).channel as AsyncAPIV3.ChannelObject
          const channelB = (resultB.operations?.[MULTI_MESSAGE_OP] as AsyncAPIV3.OperationObject).channel as AsyncAPIV3.ChannelObject

          expect(Object.keys(channelA.messages ?? {})).toEqual([MESSAGE_ID_A])
          expect(Object.keys(channelB.messages ?? {})).toEqual([MESSAGE_ID_B])

          expect(Object.keys(resultA.channels!)).toEqual(['sharedChannel'])
          expect(Object.keys(resultB.channels!)).toEqual(['sharedChannel'])
          expect(resultA.channels?.sharedChannel).toBe(channelA)
          expect(resultB.channels?.sharedChannel).toBe(channelB)
        })

        test('should include only requested messages in channel when requesting multiple operationIds', () => {
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

          expect(Object.keys(result.channels!)).toEqual(['sharedChannel'])
          expect(result.channels?.sharedChannel).toBe(multiMessageOperationChannel)
        })

        test('should share same channel instance between operations referencing the same channel', () => {
          const result = createOperationSpec(sharedChannelNormalized, [operationIdA, operationIdD])

          const multiMessageOperation = result.operations?.[MULTI_MESSAGE_OP] as AsyncAPIV3.OperationObject
          const operationD = result.operations?.[OPERATION_D] as AsyncAPIV3.OperationObject

          expect(multiMessageOperation.channel).toBe(operationD.channel)

          expect(Object.keys(result.channels!)).toEqual(['sharedChannel'])
          expect(result.channels?.sharedChannel).toBe(multiMessageOperation.channel)
        })

        test('should have different channel instances for operations referencing different channels', () => {
          const result = createOperationSpec(sharedChannelNormalized, [operationIdA, operationIdE])

          const multiMessageOperation = result.operations?.[MULTI_MESSAGE_OP] as AsyncAPIV3.OperationObject
          const operationE = result.operations?.[OPERATION_E] as AsyncAPIV3.OperationObject

          expect(multiMessageOperation.channel).not.toBe(operationE.channel)

          expect(Object.keys(result.channels!)).toEqual(expect.arrayContaining(['sharedChannel', 'otherChannel']))
          expect(Object.keys(result.channels!)).toHaveLength(2)

          expect(result.channels?.sharedChannel).toBe(multiMessageOperation.channel)
          expect(result.channels?.otherChannel).toBe(operationE.channel)
        })

        test('should have different channel instances when different channels reference the same message', () => {
          const result = createOperationSpec(sharedChannelNormalized, [operationIdA, operationIdF])

          const multiMessageOperation = result.operations?.[MULTI_MESSAGE_OP] as AsyncAPIV3.OperationObject
          const operationF = result.operations?.[OPERATION_F] as AsyncAPIV3.OperationObject

          expect(multiMessageOperation.channel).not.toBe(operationF.channel)

          expect(Object.keys(result.channels!)).toEqual(expect.arrayContaining(['sharedChannel', 'anotherChannelWithSameMessage']))
          expect(Object.keys(result.channels!)).toHaveLength(2)

          expect(result.channels?.sharedChannel).toBe(multiMessageOperation.channel)
          expect(result.channels?.anotherChannelWithSameMessage).toBe(operationF.channel)
        })
      })
    })

    describe('createOperationSpecEnrichedWithRefs', () => {
      test('should add referenced channels/servers/components when refsOnlyDocument has inline refs', () => {
        const result = createOperationSpecEnrichedWithRefs(OPERATION_ID_1, baseDocument, buildRefsOnlyDoc(baseDocument))

        expect(result).toHaveProperty(['servers', 'amqp1'], baseDocument.servers?.amqp1)
        expect(result).toHaveProperty(['channels', 'userSignedUp'], baseDocument.channels?.userSignedUp)
        expect(result).toHaveProperty(['channels', 'userSignedUp', 'messages', 'UserSignedUp'], (baseDocument.channels?.userSignedUp as AsyncAPIV3.ChannelObject)?.messages?.UserSignedUp)
        expect(result).toHaveProperty(['components', 'messages', 'UserSignedUp'], baseDocument.components?.messages?.UserSignedUp)
      })

      test('should resolve only matched operations when some requested ids are not found', () => {
        const result = createOperationSpecEnrichedWithRefs(
          [OPERATION_ID_1, 'nonexistent-op'],
          baseDocument,
          buildRefsOnlyDoc(baseDocument),
        )

        const operationKeys = Object.keys(result.operations || {})
        expect(operationKeys).toEqual([OPERATION_KEY_1])
        expect(operationKeys).not.toContain(OPERATION_KEY_2)
      })

      test('should include only channels referenced by selected operations from full refsDocument', () => {
        const result = createOperationSpecEnrichedWithRefs(OPERATION_ID_1, baseDocument, buildRefsOnlyDoc(baseDocument))

        expect(Object.keys(result.channels!)).toEqual(['userSignedUp'])
      })

      describe('defaultContentType propagation', () => {
        test('should include root defaultContentType when the selected message has no explicit contentType', () => {
          const document = cloneDocument(baseDocument)
          document.defaultContentType = 'application/json'

          const result = createOperationSpecEnrichedWithRefs(OPERATION_ID_1, document, buildRefsOnlyDoc(baseDocument))
          expect(result.defaultContentType).toBe('application/json')
        })

        test('should omit root defaultContentType when the selected message has its own contentType', () => {
          const document = cloneDocument(baseDocument)
          document.defaultContentType = 'application/json';
          (document.components!.messages!.UserSignedUp as AsyncAPIV3.MessageObject).contentType = 'application/xml'

          const refsOnlyDoc = buildRefsOnlyDoc(baseDocument)
          const resolvedMessage = (refsOnlyDoc.operations![OPERATION_KEY_1] as AsyncAPIV3.OperationObject).messages![0] as Record<string, unknown>
          resolvedMessage.contentType = 'application/xml'

          const result = createOperationSpecEnrichedWithRefs(OPERATION_ID_1, document, refsOnlyDoc)
          expect(result.defaultContentType).toBeUndefined()
        })

        test('should omit defaultContentType when source document has none', () => {
          const result = createOperationSpecEnrichedWithRefs(OPERATION_ID_1, baseDocument, buildRefsOnlyDoc(baseDocument))
          expect(result.defaultContentType).toBeUndefined()
        })

        test('should include root defaultContentType when selecting a non-first message from a multi-message operation', async () => {
          const sharedChannelDoc = await loadYamlFile<AsyncAPIV3.AsyncAPIObject>('asyncapi/operations/shared-channel/spec.yaml')
          const document = cloneDocument(sharedChannelDoc)
          document.defaultContentType = 'application/json'

          const operationIdB = calculateAsyncOperationId('multiMessageOp', 'MessageB')
          const result = createOperationSpecEnrichedWithRefs(operationIdB, document, buildRefsOnlyDoc(sharedChannelDoc))
          expect(result.defaultContentType).toBe('application/json')
        })
      })

      describe('root specification extensions', () => {
        test('should copy root-level x-* extensions into the result', () => {
          const document = cloneDocument(baseDocument) as AsyncAPIV3.AsyncAPIObject & Record<string, unknown>
          document['x-apihub-custom'] = { foo: 'bar' }
          document['x-vendor-flag'] = true

          const result = createOperationSpecEnrichedWithRefs(OPERATION_ID_1, document, buildRefsOnlyDoc(baseDocument)) as unknown as Record<string, unknown>
          expect(result['x-apihub-custom']).toEqual({ foo: 'bar' })
          expect(result['x-vendor-flag']).toBe(true)
        })

        test('should not add extension keys when source has none', () => {
          const result = createOperationSpecEnrichedWithRefs(OPERATION_ID_1, baseDocument, buildRefsOnlyDoc(baseDocument)) as unknown as Record<string, unknown>
          const extensionKeys = Object.keys(result).filter(k => k.startsWith('x-'))
          expect(extensionKeys).toEqual([])
        })
      })
    })

    // TODO: unskip after api-unifier propagates root servers to channels during normalization.
    describe.skip('root servers propagation to channels without explicit servers', () => {
      const ROOT_SERVERS_DOC_PATH = 'asyncapi/operations/root-servers-no-channel-servers.yaml'
      const OP_KEY = 'operation1'
      const MSG_ID = 'message1'
      let rootServersDoc: AsyncAPIV3.AsyncAPIObject
      let rootServersNormalizedDoc: AsyncAPIV3.AsyncAPIObject
      let rootServersOpId: string

      beforeAll(async () => {
        rootServersOpId = calculateAsyncOperationId(OP_KEY, MSG_ID)
        rootServersDoc = await loadYamlFile(ROOT_SERVERS_DOC_PATH)
        rootServersNormalizedDoc = normalizeAsyncApiDocument(rootServersDoc)
      })

      test('should include root servers via createOperationSpec when channel has no explicit servers', () => {
        const result = createOperationSpec(rootServersNormalizedDoc, rootServersOpId)

        expect(result.servers).toBeDefined()
        expect(Object.keys(result.servers!)).toEqual(expect.arrayContaining(['production', 'staging']))
      })

      test('should include root servers via createOperationSpecEnrichedWithRefs when channel has no explicit servers', () => {
        const serverProd: Record<string | symbol, unknown> = { host: 'prod.example.com', protocol: 'amqp' }
        serverProd[INLINE_REFS_FLAG] = ['#/servers/production']
        const serverStaging: Record<string | symbol, unknown> = { host: 'staging.example.com', protocol: 'amqp' }
        serverStaging[INLINE_REFS_FLAG] = ['#/servers/staging']

        const channelObj: Record<string | symbol, unknown> = {
          messages: { message1: createRefsMessage(MSG_ID, ['#/channels/channel1/messages/message1']) },
          servers: [serverProd, serverStaging],
        }
        channelObj[INLINE_REFS_FLAG] = ['#/channels/channel1']

        const refsOnlyDocument = {
          operations: {
            [OP_KEY]: {
              channel: channelObj,
              messages: [
                createRefsMessage(MSG_ID, ['#/channels/channel1/messages/message1']),
              ],
            },
          },
        } as unknown as AsyncAPIV3.AsyncAPIObject

        const result = createOperationSpecEnrichedWithRefs(rootServersOpId, rootServersDoc, refsOnlyDocument)

        expect(result.servers).toBeDefined()
        expect(Object.keys(result.servers!)).toEqual(expect.arrayContaining(['production', 'staging']))
      })
    })
  })

  describe('E2E: build pipeline', () => {
    describe('operation count', () => {
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
    })

    describe('basic operation data', () => {
      let operation: VersionAsyncOperation
      let asyncApiDocument: AsyncOperationData

      beforeAll(async () => {
        const result = await buildPackageWithDefaultConfig('asyncapi/operations/single-operation')
        ;[operation] = Array.from(result.operations.values()) as VersionAsyncOperation[]
        asyncApiDocument = operation.data!
      })

      // operationId
      it('should set operationId', () => {
        expect(operation.operationId).toBe('sendUserSignedup-UserSignedUp')
      })

      // title
      it('should set title as message title', () => {
        expect(operation.title).toBe('User Signed Up')
      })

      // metadata + protocol
      it('should set action, channel, messageId, asyncOperationId and protocol in metadata', () => {
        expect(operation.metadata.action).toBe('send')
        expect(operation.metadata.channel).toBe('userSignedup')
        expect(operation.metadata.messageId).toBe('UserSignedUp')
        expect(operation.metadata.asyncOperationId).toBe('sendUserSignedup')
        expect(operation.metadata.protocol).toBe('amqp')
      })

      // security (negative case)
      it('should not have security when operation has no security defined', () => {
        const operationEntries = Object.values(asyncApiDocument.operations ?? {}) as AsyncAPIV3.OperationObject[]
        const [asyncOperation] = operationEntries
        expect(asyncOperation.security).toBeUndefined()
      })
    })

    /**
     * Search config tests share a single build of the `multiple-operations`
     * fixture to verify that every operation receives the expected search fields.
     */
    describe('search text', () => {
      let operations: VersionAsyncOperation[]

      beforeAll(async () => {
        const result = await buildPackageWithDefaultConfig('asyncapi/operations/multiple-operations')
        operations = Array.from(result.operations.values()) as VersionAsyncOperation[]
      })

      test('should set search config with useOperationDataAsSearchText=true on all operations', () => {
        for (const operation of operations) {
          expect(operation.search).toEqual({ useOperationDataAsSearchText: true })
        }
      })

      // TODO: remove after new search is adopted irrevocably
      test('should set empty searchScopes (legacy) on all operations', () => {
        for (const operation of operations) {
          expect(operation.searchScopes).toEqual({})
        }
      })
    })

    describe('root fields propagation', () => {
      let data: AsyncOperationData & Record<string, unknown>

      beforeAll(async () => {
        const result = await buildPackageWithDefaultConfig('asyncapi/operations/root-fields')
        const [operation] = Array.from(result.operations.values())
        data = operation.data as AsyncOperationData & Record<string, unknown>
      })

      it('should preserve asyncapi version', () => {
        expect(data.asyncapi).toBe('3.0.0')
      })

      it('should preserve info', () => {
        expect(data.info).toEqual({ title: 'Root Fields Service', version: '1.0.0' })
      })

      it('should propagate root defaultContentType', () => {
        expect(data.defaultContentType).toBe('application/json')
      })

      it('should propagate root x-* extensions', () => {
        expect(data['x-apihub-custom']).toEqual({ foo: 'bar' })
        expect(data['x-vendor-flag']).toBe(true)
      })
    })

    describe('security', () => {
      let securityOperation: VersionAsyncOperation
      let asyncApiDocument: AsyncOperationData

      beforeAll(async () => {
        const result = await buildPackageWithDefaultConfig('asyncapi/operations/operation-security')
        ;[securityOperation] = Array.from(result.operations.values()) as VersionAsyncOperation[]
        asyncApiDocument = securityOperation.data!
      })

      it('should preserve operation-level security in built package', () => {
        const operationEntries = Object.values(asyncApiDocument.operations ?? {}) as AsyncAPIV3.OperationObject[]
        expect(operationEntries).toHaveLength(1)

        const [asyncOperation] = operationEntries
        expect(asyncOperation.security).toBeDefined()
        expect(asyncOperation.security).toHaveLength(2)
      })

      it('should include securitySchemes in components when inlined', () => {
        const securitySchemes = asyncApiDocument.components?.securitySchemes
        expect(securitySchemes).toHaveProperty('oauth2')
        expect(securitySchemes).toHaveProperty('apiKey')
      })

      it('should have security in operations channel servers', async () => {
        const result = await buildPackageWithDefaultConfig('asyncapi/operations/server-security')
        const operations = Array.from(result.operations.values())
        expect(operations).toHaveLength(1)

        const [serverSecurityOp] = operations
        const serverSecurityDoc: AsyncAPIV3.AsyncAPIObject = serverSecurityOp.data

        const serverEntries = serverSecurityDoc?.servers ? Object.values(serverSecurityDoc.servers) as AsyncAPIV3.ServerObject[] : []
        const serverWithSecurity = serverEntries.find(server => server.security)
        expect(serverWithSecurity).toBeDefined()
        expect(serverWithSecurity!.security).toHaveLength(2)
      })
    })

    describe('operation data isolation', () => {
      test('should include only relevant operation in data when multiple operations share the same message', async () => {
        const result = await buildPackageWithDefaultConfig('asyncapi/operations/shared-message')
        const operations = Array.from(result.operations.values())
        expect(operations).toHaveLength(2)

        for (const operation of operations) {
          const asyncApiData = operation.data as AsyncAPIV3.AsyncAPIObject
          const operationKeys = Object.keys(asyncApiData?.operations ?? {})
          expect(operationKeys).toEqual([operation.metadata.asyncOperationId])
        }
      })

      test('should contain only relevant components per operation (multi-channel spec)', async () => {
        const result = await buildPackageWithDefaultConfig('asyncapi/operations/multi-channel-multi-operation')
        const operations = Array.from(result.operations.values())
        expect(operations).toHaveLength(2)

        const expectedComponents: Record<string, { schemas: string[]; messages: string[] }> = {
          publishUserSignedUp: { schemas: ['User'], messages: ['UserSignedUp'] },
          receiveOrderCreated: { schemas: ['Order'], messages: ['OrderCreated'] },
        }

        for (const operation of operations) {
          const asyncApiData = operation.data as AsyncAPIV3.AsyncAPIObject
          const expected = expectedComponents[operation.metadata.asyncOperationId]

          const schemaKeys = Object.keys(asyncApiData.components?.schemas ?? {}).sort()
          expect(schemaKeys).toEqual(expected.schemas.sort())

          const messageKeys = Object.keys(asyncApiData.components?.messages ?? {}).sort()
          expect(messageKeys).toEqual(expected.messages.sort())
        }
      })
    })

    describe('duplicate operationId validation', () => {
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
})
