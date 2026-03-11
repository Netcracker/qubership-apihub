import { normalize } from '../../src/normalize'
import { TEST_FIRST_REFERENCE_KEY_PROPERTY, TEST_LAST_REFERENCE_KEY_PROPERTY, TEST_SYNTHETIC_TITLE_FLAG } from '../helpers'
import { parseAsyncApiAndAssertValid } from '../helpers/asyncapi'

const NORMALIZATION_OPTIONS_FIRST_REFERENCE_KEY = {
  firstReferenceKeyProperty: TEST_FIRST_REFERENCE_KEY_PROPERTY,
}

const NORMALIZATION_OPTIONS_LAST_REFERENCE_KEY = {
  lastReferenceKeyProperty: TEST_LAST_REFERENCE_KEY_PROPERTY,
}

const NORMALIZATION_OPTIONS_BOTH_REFERENCE_KEYS = {
  firstReferenceKeyProperty: TEST_FIRST_REFERENCE_KEY_PROPERTY,
  lastReferenceKeyProperty: TEST_LAST_REFERENCE_KEY_PROPERTY,
}
describe('AsyncAPI Reference Object Resolver', () => {
  describe('Last Reference Key Property', () => {
    it('should capture last reference key for simple channel reference', async () => {
      const source = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        operations: {
          testOperation: {
            action: 'send',
            channel: { $ref: '#/channels/UserChannel' },
          },
        },
        channels: {
          UserChannel: {
            address: 'user/created',
            messages: {
              userCreated: {
                payload: {
                  type: 'object',
                },
              },
            },
          },
        },
      }

      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS_LAST_REFERENCE_KEY) as any

      expect(result.operations.testOperation.channel[TEST_LAST_REFERENCE_KEY_PROPERTY]).toBe('UserChannel')
    })

    it('should capture last reference key in a reference chain', async () => {
      const source = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        operations: {
          testOperation: {
            action: 'send',
            channel: { $ref: '#/channels/IntermediateChannel' },
          },
        },
        channels: {
          IntermediateChannel: {
            $ref: '#/channels/FinalChannel',
          },
          FinalChannel: {
            address: 'final/address',
            messages: {
              finalMessage: {
                payload: {
                  type: 'object',
                },
              },
            },
          },
        },
      }

      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS_LAST_REFERENCE_KEY) as any

      // All references should have the last reference name from the chain
      expect(result.operations.testOperation.channel[TEST_LAST_REFERENCE_KEY_PROPERTY]).toBe('FinalChannel')
      expect(result.channels.IntermediateChannel[TEST_LAST_REFERENCE_KEY_PROPERTY]).toBe('FinalChannel')
      // All should point to the same final object
      expect(result.operations.testOperation.channel).toBe(result.channels.FinalChannel)
      expect(result.channels.IntermediateChannel).toBe(result.channels.FinalChannel)
    })

    it('should capture last reference key for multiple references to same target', async () => {
      const source = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        operations: {
          sendOperation: {
            action: 'send',
            channel: { $ref: '#/channels/SharedChannel' },
          },
          receiveOperation: {
            action: 'receive',
            channel: { $ref: '#/channels/SharedChannel' },
          },
        },
        channels: {
          SharedChannel: {
            address: 'shared/address',
            messages: {
              sharedMessage: {
                payload: {
                  type: 'object',
                },
              },
            },
          },
        },
      }

      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS_LAST_REFERENCE_KEY) as any

      // All references should have the same reference name
      expect(result.operations.sendOperation.channel[TEST_LAST_REFERENCE_KEY_PROPERTY]).toBe('SharedChannel')
      expect(result.operations.receiveOperation.channel[TEST_LAST_REFERENCE_KEY_PROPERTY]).toBe('SharedChannel')
      // All should point to the same object
      expect(result.operations.sendOperation.channel).toBe(result.channels.SharedChannel)
      expect(result.operations.receiveOperation.channel).toBe(result.channels.SharedChannel)
    })

    it('should not add last reference key property when option is not provided', async () => {
      const source = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        operations: {
          testOperation: {
            action: 'send',
            channel: { $ref: '#/channels/UserChannel' },
          },
        },
        channels: {
          UserChannel: {
            address: 'user/created',
            messages: {
              userCreated: {
                payload: {
                  type: 'object',
                },
              },
            },
          },
        },
      }

      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source) as any

      // Should not have reference name property
      expect(result.operations.testOperation.channel[TEST_LAST_REFERENCE_KEY_PROPERTY]).toBeUndefined()
      expect(result.channels.UserChannel[TEST_LAST_REFERENCE_KEY_PROPERTY]).toBeUndefined()
    })

    it('should capture last reference key for message references', async () => {
      const source = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        channels: {
          userChannel: {
            address: 'user/events',
            messages: {
              userCreatedMsg: {
                $ref: '#/components/messages/UserCreatedMessage',
              },
            },
          },
        },
        components: {
          messages: {
            UserCreatedMessage: {
              payload: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                },
              },
            },
          },
        },
      }

      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS_LAST_REFERENCE_KEY) as any

      // Check that reference name is captured for message
      expect(result.channels.userChannel.messages.userCreatedMsg[TEST_LAST_REFERENCE_KEY_PROPERTY]).toBe('UserCreatedMessage')
      // Both should point to the same object
      expect(result.channels.userChannel.messages.userCreatedMsg).toBe(result.components.messages.UserCreatedMessage)
    })

    it('should capture last reference key for server references', async () => {
      const source = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        channels: {
          userChannel: {
            address: 'user/events',
            servers: [
              { $ref: '#/servers/ProductionServer' },
            ],
          },
        },
        servers: {
          ProductionServer: {
            host: 'prod.example.com',
            protocol: 'amqp',
          },
        },
      }

      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS_LAST_REFERENCE_KEY) as any

      // Check that reference name is captured for server
      expect(result.channels.userChannel.servers[0][TEST_LAST_REFERENCE_KEY_PROPERTY]).toBe('ProductionServer')
      // Both should point to the same object
      expect(result.channels.userChannel.servers[0]).toBe(result.servers.ProductionServer)
    })

    it('should capture last reference key for operation trait references', async () => {
      const source = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        operations: {
          testOperation: {
            action: 'send',
            channel: {
              address: 'test/channel',
            },
            traits: [
              { $ref: '#/components/operationTraits/CommonTrait' },
            ],
          },
        },
        components: {
          operationTraits: {
            CommonTrait: {
              tags: [
                { name: 'common' },
              ],
            },
          },
        },
      }

      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS_LAST_REFERENCE_KEY) as any

      // Check that reference name is captured for operation trait
      expect(result.operations.testOperation.traits[0][TEST_LAST_REFERENCE_KEY_PROPERTY]).toBe('CommonTrait')
      // Both should point to the same object
      expect(result.operations.testOperation.traits[0]).toBe(result.components.operationTraits.CommonTrait)
    })

    it('should capture last reference key for operation with channel ref and channel message ref in messages array', async () => {
      const source = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        operations: {
          'send-operation': {
            action: 'send',
            channel: {
              $ref: '#/channels/test-channel',
            },
            messages: [
              { $ref: '#/channels/test-channel/messages/MessageID' },
            ],
          },
        },
        channels: {
          'test-channel': {
            messages: {
              MessageID: {
              },
            },
          },
        },
      }

      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS_LAST_REFERENCE_KEY) as any

      // Channel reference name
      expect(result.operations['send-operation'].channel[TEST_LAST_REFERENCE_KEY_PROPERTY]).toBe('test-channel')
      expect(result.operations['send-operation'].channel).toBe(result.channels['test-channel'])
      // Message reference in operation messages array (channel message by ID)
      expect(result.operations['send-operation'].messages[0][TEST_LAST_REFERENCE_KEY_PROPERTY]).toBe('MessageID')
      expect(result.operations['send-operation'].messages[0]).toBe(result.channels['test-channel'].messages.MessageID)
    })
  })

  describe('First Reference Key Property', () => {
    function createSpecTwoOperationsSameFinalChannel() {
      return {
        asyncapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        operations: {
          sendFromDirectChannel: {
            action: 'send',
            channel: { $ref: '#/channels/DirectChannel' },
          },
          sendFromAliasChannel: {
            action: 'send',
            channel: { $ref: '#/channels/AliasChannel' },
          },
        },
        channels: {
          DirectChannel: {
            $ref: '#/channels/FinalChannel',
          },
          AliasChannel: {
            $ref: '#/channels/DirectChannel',
          },
          FinalChannel: {
            address: 'final/address',
            messages: {
              finalMessage: {
                payload: {
                  type: 'object',
                },
              },
            },
          },
        },
      }
    }

    function createSpecTwoServersSameFinalServer() {
      return {
        asyncapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        servers: {
          DirectServer: {
            $ref: '#/servers/FinalServer',
          },
          AliasServer: {
            $ref: '#/servers/DirectServer',
          },
          FinalServer: {
            host: 'final.example.com',
            protocol: 'amqp',
          },
        },
        channels: {
          userChannel: {
            address: 'user/events',
            servers: [
              {
                $ref: '#/servers/DirectServer',
              },
            ],
          },
          providerChannel: {
            address: 'provider/events',
            servers: [
              {
                $ref: '#/servers/AliasServer',
              },
            ],
          },
        },
      }
    }

    function createSpecTwoMessagesSameFinalMessage() {
      return {
        asyncapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        channels: {
          myChannel: {
            messages: {
              DirectMessage: {
                $ref: '#/components/messages/FinalMessage',
              },
              AliasMessage: {
                $ref: '#/channels/myChannel/messages/DirectMessage',
              },
            },
          },
        },
        components: {
          messages: {
            FinalMessage: {
              payload: {
                type: 'object',
              },
            },
          },
        },
        operations: {
          testOperation: {
            action: 'send',
            channel: { $ref: '#/channels/myChannel' },
            messages: [
              { $ref: '#/channels/myChannel/messages/DirectMessage' },
              { $ref: '#/channels/myChannel/messages/AliasMessage' },
            ],
          },
        },
      }
    }

    it('should capture different first reference keys for root channel reached via different paths', async () => {
      const source = createSpecTwoOperationsSameFinalChannel()
      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS_BOTH_REFERENCE_KEYS) as any

      const sendFromDirectChannel = result.operations.sendFromDirectChannel.channel
      const sendFromAliasChannel = result.operations.sendFromAliasChannel.channel

      // First reference key should reflect the first key in the resolution chain
      expect(sendFromDirectChannel[TEST_FIRST_REFERENCE_KEY_PROPERTY]).toBe('DirectChannel')
      expect(sendFromAliasChannel[TEST_FIRST_REFERENCE_KEY_PROPERTY]).toBe('AliasChannel')

      // Last reference key should be the same because both resolve to the same final channel
      expect(sendFromDirectChannel[TEST_LAST_REFERENCE_KEY_PROPERTY]).toBe('FinalChannel')
      expect(sendFromAliasChannel[TEST_LAST_REFERENCE_KEY_PROPERTY]).toBe('FinalChannel')

      // Different first keys for the same final target should result in different instances
      expect(sendFromDirectChannel).not.toBe(sendFromAliasChannel)
    })

    it('should resolve to same channel instance when firstReferenceKeyProperty is not provided', async () => {
      const source = createSpecTwoOperationsSameFinalChannel()
      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS_LAST_REFERENCE_KEY) as any

      const sendFromDirectChannel = result.operations.sendFromDirectChannel.channel
      const sendFromAliasChannel = result.operations.sendFromAliasChannel.channel

      // Without firstReferenceKeyProperty there is no need to copy; same final target => same instance
      expect(sendFromDirectChannel).toBe(sendFromAliasChannel)
      expect(sendFromDirectChannel[TEST_LAST_REFERENCE_KEY_PROPERTY]).toBe('FinalChannel')
    })

    it('should capture different first reference keys for messages in root operation messages array', async () => {
      const source = createSpecTwoMessagesSameFinalMessage()
      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS_BOTH_REFERENCE_KEYS) as any

      const [directMessage, aliasMessage] = result.operations.testOperation.messages

      // First reference key should correspond to the first key in the ref-chain from the operation
      expect(directMessage[TEST_FIRST_REFERENCE_KEY_PROPERTY]).toBe('DirectMessage')
      expect(aliasMessage[TEST_FIRST_REFERENCE_KEY_PROPERTY]).toBe('AliasMessage')

      // Last reference key should be the same for both, since both resolve to FinalMessage
      expect(directMessage[TEST_LAST_REFERENCE_KEY_PROPERTY]).toBe('FinalMessage')
      expect(aliasMessage[TEST_LAST_REFERENCE_KEY_PROPERTY]).toBe('FinalMessage')

      // Different first keys for the same final target should produce different instances
      expect(directMessage).not.toBe(aliasMessage)
    })

    it('should capture different first reference keys for messages in root operation messages array when only first reference key is captured', async () => {
      const source = createSpecTwoMessagesSameFinalMessage()
      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS_FIRST_REFERENCE_KEY) as any

      const [directMessage, aliasMessage] = result.operations.testOperation.messages

      // First reference key should correspond to the first key in the ref-chain from the operation
      expect(directMessage[TEST_FIRST_REFERENCE_KEY_PROPERTY]).toBe('DirectMessage')
      expect(aliasMessage[TEST_FIRST_REFERENCE_KEY_PROPERTY]).toBe('AliasMessage')

      // Different first keys for the same final target should produce different instances
      expect(directMessage).not.toBe(aliasMessage)
    })

    it('should resolve to same message instance when firstReferenceKeyProperty is not provided', async () => {
      const source = createSpecTwoMessagesSameFinalMessage()
      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS_LAST_REFERENCE_KEY) as any

      const [directMessage, aliasMessage] = result.operations.testOperation.messages

      // Without firstReferenceKeyProperty there is no need to copy; same final target => same instance
      expect(directMessage).toBe(aliasMessage)
      expect(directMessage[TEST_LAST_REFERENCE_KEY_PROPERTY]).toBe('FinalMessage')
    })

    it('should capture different first reference keys for servers in channel servers array', async () => {
      const source = createSpecTwoServersSameFinalServer()
      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS_BOTH_REFERENCE_KEYS) as any

      const [fromDirectServer] = result.channels.userChannel.servers
      const [fromAliasServer] = result.channels.providerChannel.servers

      // First reference key should correspond to the first key in the ref-chain from the channel
      expect(fromDirectServer[TEST_FIRST_REFERENCE_KEY_PROPERTY]).toBe('DirectServer')
      expect(fromAliasServer[TEST_FIRST_REFERENCE_KEY_PROPERTY]).toBe('AliasServer')

      // Last reference key should be the same for both, since both resolve to FinalServer
      expect(fromDirectServer[TEST_LAST_REFERENCE_KEY_PROPERTY]).toBe('FinalServer')
      expect(fromAliasServer[TEST_LAST_REFERENCE_KEY_PROPERTY]).toBe('FinalServer')

      // Different first keys for the same final target should produce different instances
      expect(fromDirectServer).not.toBe(fromAliasServer)
    })

    it('should capture different first reference keys for servers in channel servers array when only first reference key is captured', async () => {
      const source = createSpecTwoServersSameFinalServer()
      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS_FIRST_REFERENCE_KEY) as any

      const [fromDirectServer] = result.channels.userChannel.servers
      const [fromAliasServer] = result.channels.providerChannel.servers

      // First reference key should correspond to the first key in the ref-chain from the channel
      expect(fromDirectServer[TEST_FIRST_REFERENCE_KEY_PROPERTY]).toBe('DirectServer')
      expect(fromAliasServer[TEST_FIRST_REFERENCE_KEY_PROPERTY]).toBe('AliasServer')

      // Different first keys for the same final target should produce different instances
      expect(fromDirectServer).not.toBe(fromAliasServer)
    })

    it('should resolve to same server instance when firstReferenceKeyProperty is not provided', async () => {
      const source = createSpecTwoServersSameFinalServer()
      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS_LAST_REFERENCE_KEY) as any

      const [fromDirectServer] = result.channels.userChannel.servers
      const [fromAliasServer] = result.channels.providerChannel.servers

      // Without firstReferenceKeyProperty there is no need to copy; same final target => same instance
      expect(fromDirectServer).toBe(fromAliasServer)
      expect(fromDirectServer[TEST_LAST_REFERENCE_KEY_PROPERTY]).toBe('FinalServer')
    })

    it('should capture first reference key for channel, message and server in a single operation', async () => {
      const source = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        servers: {
          'ServerID': {
            host: 'localhost',
            protocol: 'http',
          },
        },
        operations: {
          'send-operation': {
            action: 'send',
            channel: {
              $ref: '#/channels/ChannelID',
            },
            messages: [
              { $ref: '#/channels/ChannelID/messages/MessageID' },
            ],
          },
        },
        channels: {
          ChannelID: {
            servers: [
              { $ref: '#/servers/ServerID' },
            ],
            messages: {
              MessageID: {
                name: 'Message Name',
              },
            },
          },
        },
      }

      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS_FIRST_REFERENCE_KEY) as any

      // Channel reference from operation captures first reference key
      expect(result.operations['send-operation'].channel[TEST_FIRST_REFERENCE_KEY_PROPERTY]).toBe('ChannelID')
      // Message reference from operation messages array captures first reference key
      expect(result.operations['send-operation'].messages[0][TEST_FIRST_REFERENCE_KEY_PROPERTY]).toBe('MessageID')
      // Server reference from channel servers array captures first reference key
      expect(result.channels.ChannelID.servers[0][TEST_FIRST_REFERENCE_KEY_PROPERTY]).toBe('ServerID')

      // All resolved objects should point to the same instances as their definition sites
      expect(result.operations['send-operation'].channel).toBe(result.channels.ChannelID)
      expect(result.operations['send-operation'].messages[0]).toBe(result.channels.ChannelID.messages.MessageID)
      expect(result.channels.ChannelID.servers[0]).toBe(result.servers.ServerID)
    })

    it('should reuse the same object when same first key is used in different operations', async () => {
      const source = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        operations: {
          sendFromDirectChannel: {
            action: 'send',
            channel: { $ref: '#/channels/DirectChannel' },
          },
          sendFromAliasChannel1: {
            action: 'send',
            channel: { $ref: '#/channels/AliasChannel' },
          },
          sendFromAliasChannel2: {
            action: 'send',
            channel: { $ref: '#/channels/AliasChannel' },
          },
        },
        channels: {
          DirectChannel: {
            $ref: '#/channels/FinalChannel',
          },
          AliasChannel: {
            $ref: '#/channels/DirectChannel',
          },
          FinalChannel: {
            address: 'final/address',
            messages: {
              finalMessage: {
                payload: {
                  type: 'object',
                },
              },
            },
          },
        },
      }

      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS_BOTH_REFERENCE_KEYS) as any

      const fromDirect = result.operations.sendFromDirectChannel.channel
      const fromAlias1 = result.operations.sendFromAliasChannel1.channel
      const fromAlias2 = result.operations.sendFromAliasChannel2.channel

      expect(fromDirect[TEST_FIRST_REFERENCE_KEY_PROPERTY]).toBe('DirectChannel')
      expect(fromAlias1[TEST_FIRST_REFERENCE_KEY_PROPERTY]).toBe('AliasChannel')
      expect(fromAlias2[TEST_FIRST_REFERENCE_KEY_PROPERTY]).toBe('AliasChannel')
      // Both AliasChannel refs must resolve to the same copy (cache hit in getOrCreateCopyForFirstKey)
      expect(fromAlias1).toBe(fromAlias2)
      expect(fromDirect).not.toBe(fromAlias1)
    })

    it('should reuse the same instance when resolving the same target through the same first reference key', async () => {
      const source = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        channels: {
          sharedChannel: {
            messages: {
              SharedMessage: {
                $ref: '#/components/messages/FinalMessage',
              },
            },
          },
        },
        components: {
          messages: {
            FinalMessage: {
              payload: {
                type: 'object',
              },
            },
          },
        },
        operations: {
          sendOperation: {
            action: 'send',
            channel: { $ref: '#/channels/sharedChannel' },
            messages: [
              { $ref: '#/channels/sharedChannel/messages/SharedMessage' },
            ],
          },
          receiveOperation: {
            action: 'receive',
            channel: { $ref: '#/channels/sharedChannel' },
            messages: [
              { $ref: '#/channels/sharedChannel/messages/SharedMessage' },
            ],
          },
        },
      }

      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS_BOTH_REFERENCE_KEYS) as any

      const sendMessage = result.operations.sendOperation.messages[0]
      const receiveMessage = result.operations.receiveOperation.messages[0]

      // Both paths start with the same first reference key, so they should share the same instance
      expect(sendMessage[TEST_FIRST_REFERENCE_KEY_PROPERTY]).toBe('SharedMessage')
      expect(receiveMessage[TEST_FIRST_REFERENCE_KEY_PROPERTY]).toBe('SharedMessage')
      expect(sendMessage).toBe(receiveMessage)
    })

    it('should not capture first reference key where captureFirstReferenceKey rule is not specified', async () => {
      const source = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        channels: {
          mainChannel: {},
        },
        operations: {
          myOp: {
            $ref: '#/components/operations/SharedOperation',
          },
        },
        components: {
          operations: {
            SharedOperation: {
              action: 'send',
              channel: { $ref: '#/channels/mainChannel' },
              summary: 'Shared operation',
            },
          },
        },
      }

      const parserResult = await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS_BOTH_REFERENCE_KEYS) as any

      const resolvedOperation = result.operations.myOp

      // Last reference key is always captured when option is provided
      expect(resolvedOperation[TEST_LAST_REFERENCE_KEY_PROPERTY]).toBe('SharedOperation')
      // First reference key is only captured where captureFirstReferenceKey rule is set (e.g. root channel, root message); operation ref has no such rule
      expect(resolvedOperation[TEST_FIRST_REFERENCE_KEY_PROPERTY]).toBeUndefined()
    })
  })

  describe('Broken Reference Handling', () => {
    const NORMALIZATION_OPTIONS_BROKEN_REFERENCE = {
      firstReferenceKeyProperty: TEST_FIRST_REFERENCE_KEY_PROPERTY,
      validate: true,
    }

    it('should keep unresolved server reference on channel when target server does not exist', () => {
      const source = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        operations: {
          'send-operation': {
            action: 'send',
            channel: {
              $ref: '#/channels/ChannelID',
            },
            messages: [
              { $ref: '#/channels/ChannelID/messages/MessageID' },
            ],
          },
        },
        channels: {
          ChannelID: {
            servers: [
              {
                // Broken reference: target server does not exist in components.servers
                $ref: '#/components/servers/not-existing-server',
              },
            ],
            messages: {
              MessageID: {
                name: 'Message Name',
              },
            },
          },
        },
        // No components.servers defined on purpose to keep the reference broken
      }

      const result = normalize(source, NORMALIZATION_OPTIONS_BROKEN_REFERENCE) as any

      // Channel reference from operation should still resolve correctly
      expect(result.operations['send-operation'].channel).toBe(result.channels.ChannelID)
      // Message reference from operation messages array should still resolve correctly
      expect(result.operations['send-operation'].messages[0]).toBe(result.channels.ChannelID.messages.MessageID)
      // Broken server reference should remain unresolved (kept as $ref) in the final spec
      expect(result.channels.ChannelID.servers[0].$ref).toBe('#/components/servers/not-existing-server')
    })

    it('should keep unresolved parameter reference on channel when target parameter does not exist', () => {
      const source = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        operations: {
          'send-operation': {
            action: 'send',
            channel: {
              $ref: '#/channels/ChannelID',
            },
            messages: [
              { $ref: '#/channels/ChannelID/messages/MessageID' },
            ],
          },
        },
        channels: {
          ChannelID: {
            parameters: {
              notExistingParameter: {
                // Broken reference: target parameter does not exist in components.parameters
                $ref: '#/components/parameters/not-existing-parameter',
              },
            },
            messages: {
              MessageID: {
                name: 'Message Name',
              },
            },
          },
        },
        // No components.parameters defined on purpose to keep the reference broken
      }

      const result = normalize(source, NORMALIZATION_OPTIONS_BROKEN_REFERENCE) as any

      // Channel reference from operation should still resolve correctly
      expect(result.operations['send-operation'].channel).toBe(result.channels.ChannelID)
      // Message reference from operation messages array should still resolve correctly
      expect(result.operations['send-operation'].messages[0]).toBe(result.channels.ChannelID.messages.MessageID)
      // Broken parameter reference should remain unresolved (kept as $ref) in the final spec
      expect(result.channels.ChannelID.parameters.notExistingParameter.$ref).toBe('#/components/parameters/not-existing-parameter')
    })
  })
})
