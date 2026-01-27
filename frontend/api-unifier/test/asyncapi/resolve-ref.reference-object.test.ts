import { normalize } from '../../src/normalize'
import { TEST_REFERENCE_NAME_PROPERTY } from '../helpers'

const NORMALIZATION_OPTIONS = {
  referenceNameProperty: TEST_REFERENCE_NAME_PROPERTY,
}

describe('AsyncAPI Reference Object Resolver', () => {
  describe('Reference Name Property', () => {
    it('should capture reference name for simple channel reference', () => {
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

      const result = normalize(source, NORMALIZATION_OPTIONS) as any

      expect(result.operations.testOperation.channel[TEST_REFERENCE_NAME_PROPERTY]).toBe('UserChannel')
    })

    it('should capture last reference name in a reference chain', () => {
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

      const result = normalize(source, NORMALIZATION_OPTIONS) as any

      // All references should have the last reference name from the chain
      expect(result.operations.testOperation.channel[TEST_REFERENCE_NAME_PROPERTY]).toBe('FinalChannel')
      expect(result.channels.IntermediateChannel[TEST_REFERENCE_NAME_PROPERTY]).toBe('FinalChannel')
      // All should point to the same final object
      expect(result.operations.testOperation.channel).toBe(result.channels.FinalChannel)
      expect(result.channels.IntermediateChannel).toBe(result.channels.FinalChannel)
    })

    it('should capture reference name for multiple references to same target', () => {
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

      const result = normalize(source, NORMALIZATION_OPTIONS) as any

      // All references should have the same reference name
      expect(result.operations.sendOperation.channel[TEST_REFERENCE_NAME_PROPERTY]).toBe('SharedChannel')
      expect(result.operations.receiveOperation.channel[TEST_REFERENCE_NAME_PROPERTY]).toBe('SharedChannel')
      // All should point to the same object
      expect(result.operations.sendOperation.channel).toBe(result.channels.SharedChannel)
      expect(result.operations.receiveOperation.channel).toBe(result.channels.SharedChannel)
    })

    it('should not add reference name property when option is not provided', () => {
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

      const result = normalize(source) as any

      // Should not have reference name property
      expect(result.operations.testOperation.channel[TEST_REFERENCE_NAME_PROPERTY]).toBeUndefined()
      expect(result.channels.UserChannel[TEST_REFERENCE_NAME_PROPERTY]).toBeUndefined()
    })

    it('should capture reference name for message references', () => {
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

      const result = normalize(source, NORMALIZATION_OPTIONS) as any

      // Check that reference name is captured for message
      expect(result.channels.userChannel.messages.userCreatedMsg[TEST_REFERENCE_NAME_PROPERTY]).toBe('UserCreatedMessage')
      // Both should point to the same object
      expect(result.channels.userChannel.messages.userCreatedMsg).toBe(result.components.messages.UserCreatedMessage)
    })

    it('should capture reference name for server references', () => {
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

      const result = normalize(source, NORMALIZATION_OPTIONS) as any

      // Check that reference name is captured for server
      expect(result.channels.userChannel.servers[0][TEST_REFERENCE_NAME_PROPERTY]).toBe('ProductionServer')
      // Both should point to the same object
      expect(result.channels.userChannel.servers[0]).toBe(result.servers.ProductionServer)
    })

    it('should capture reference name for operation trait references', () => {
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

      const result = normalize(source, NORMALIZATION_OPTIONS) as any

      // Check that reference name is captured for operation trait
      expect(result.operations.testOperation.traits[0][TEST_REFERENCE_NAME_PROPERTY]).toBe('CommonTrait')
      // Both should point to the same object
      expect(result.operations.testOperation.traits[0]).toBe(result.components.operationTraits.CommonTrait)
    })
  })
})
