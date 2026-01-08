import { denormalize, normalize } from '../../src/normalize'
import { convertOriginToHumanReadable } from '../../src/origins'
import { NormalizeOptions } from '../../src/types'
import { unify, deUnify } from '../../src/unify'
import { commonOriginsCheck, TEST_DEFAULTS_FLAG, TEST_ORIGINS_FLAG, TEST_ORIGINS_FOR_DEFAULTS } from '../helpers'

describe('AsyncAPI unify', () => {

  const NORMALIZATION_OPTIONS: NormalizeOptions = {
    defaultsFlag: TEST_DEFAULTS_FLAG,
    originsFlag: TEST_ORIGINS_FLAG,
    createOriginsForDefaults: () => TEST_ORIGINS_FOR_DEFAULTS,
    unify: true,
  }

  describe('defaults', () => {
    describe('Root object', () => {
      it('sets default empty objects for root properties', () => {
        const result = unify({
          asyncapi: '3.0.0',
        }, { unify: true })

        expect(result).toHaveProperty(['info'])
        expect(result).toHaveProperty(['servers'], {})
        expect(result).toHaveProperty(['channels'], {})
        expect(result).toHaveProperty(['operations'], {})
        expect(result).toHaveProperty(['components'])
      })
    })

    describe('Info object', () => {
      it('sets default empty objects and arrays for info properties', () => {
        const result = unify({
          asyncapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
        }, { unify: true })

        expect(result).toHaveProperty(['info', 'contact'], {})
        expect(result).toHaveProperty(['info', 'license'], {})
        expect(result).toHaveProperty(['info', 'tags'], [])
        expect(result).toHaveProperty(['info', 'externalDocs'], {})
      })
    })

    describe('Tag object', () => {
      it('sets default empty object for tag externalDocs', () => {
        const result = unify({
          asyncapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
            tags: [
              {
                name: 'user',
              },
            ],
          },
        }, { unify: true })

        expect(result).toHaveProperty(['info', 'tags', 0, 'externalDocs'], {})
      })
    })

    describe('Operation object', () => {
      it('sets default empty arrays and objects for operation properties', () => {
        const result = unify({
          asyncapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          operations: {
            testOperation: {
              action: 'send',
              channel: { $ref: '#/channels/testChannel' },
            },
          },
        }, { unify: true })

        expect(result).toHaveProperty(['operations', 'testOperation', 'security'], [])
        expect(result).toHaveProperty(['operations', 'testOperation', 'tags'], [])
        expect(result).toHaveProperty(['operations', 'testOperation', 'externalDocs'], {})
        expect(result).toHaveProperty(['operations', 'testOperation', 'bindings'], {})
        expect(result).toHaveProperty(['operations', 'testOperation', 'reply'])
        expect(result).toHaveProperty(['operations', 'testOperation', 'traits'], [])
        expect(result).toHaveProperty(['operations', 'testOperation', 'messages'], [])
      })
    })

    describe('Operation Trait object', () => {
      it('sets default empty arrays and objects for operation trait properties', () => {
        const result = unify({
          asyncapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          components: {
            operationTraits: {
              commonTrait: {
                description: 'Common operation trait',
              },
            },
          },
        }, { unify: true })

        expect(result).toHaveProperty(['components', 'operationTraits', 'commonTrait', 'security'], [])
        expect(result).toHaveProperty(['components', 'operationTraits', 'commonTrait', 'tags'], [])
        expect(result).toHaveProperty(['components', 'operationTraits', 'commonTrait', 'externalDocs'], {})
        expect(result).toHaveProperty(['components', 'operationTraits', 'commonTrait', 'bindings'], {})
        expect(result).toHaveProperty(['components', 'operationTraits', 'commonTrait', 'reply'])
      })
    })

    describe('Operation Reply object', () => {
      it('sets default empty array for operation reply messages', () => {
        const result = unify({
          asyncapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          operations: {
            sendOperation: {
              action: 'send',
              channel: { $ref: '#/channels/testChannel' },
              reply: {
                channel: { $ref: '#/channels/replyChannel' },
              },
            },
          },
        }, { unify: true })

        expect(result).toHaveProperty(['operations', 'sendOperation', 'reply', 'messages'], [])
      })
    })

    describe('Server object', () => {
      it('sets default empty objects and arrays for server properties', () => {
        const result = unify({
          asyncapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          servers: {
            production: {
              host: 'example.com',
              protocol: 'mqtt',
            },
          },
        }, { unify: true })

        expect(result).toHaveProperty(['servers', 'production', 'variables'], {})
        expect(result).toHaveProperty(['servers', 'production', 'security'], [])
        expect(result).toHaveProperty(['servers', 'production', 'tags'], [])
        expect(result).toHaveProperty(['servers', 'production', 'externalDocs'], {})
        expect(result).toHaveProperty(['servers', 'production', 'bindings'], {})
      })
    })

    describe('Server Variable object', () => {
      it('sets default empty arrays for server variable properties', () => {
        const result = unify({
          asyncapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          servers: {
            production: {
              host: '{env}.example.com',
              protocol: 'mqtt',
              variables: {
                env: {
                  default: 'prod',
                },
              },
            },
          },
        }, { unify: true })

        expect(result).toHaveProperty(['servers', 'production', 'variables', 'env', 'enum'], [])
        expect(result).toHaveProperty(['servers', 'production', 'variables', 'env', 'examples'], [])
      })

      it('removes duplicate values from server variable enum', () => {
        const result = unify({
          asyncapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          servers: {
            production: {
              host: '{env}.example.com',
              protocol: 'mqtt',
              variables: {
                env: {
                  enum: ['dev', 'staging', 'prod', 'dev', 'staging'],
                  default: 'prod',
                },
              },
            },
          },
        }, { unify: true })

        expect(result).toHaveProperty(['servers', 'production', 'variables', 'env', 'enum'], ['dev', 'staging', 'prod'])
      })

      it('removes duplicates from component server variable enum', () => {
        const result = unify({
          asyncapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          components: {
            serverVariables: {
              env: {
                enum: ['dev', 'staging', 'prod', 'dev', 'prod'],
                default: 'prod',
                description: 'Environment variable',
              },
            },
          },
        }, { unify: true })

        expect(result).toHaveProperty(['components', 'serverVariables', 'env', 'enum'], ['dev', 'staging', 'prod'])
      })

      it('preserves enum order when removing duplicates', () => {
        const result = unify({
          asyncapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          servers: {
            production: {
              host: '{env}.example.com',
              protocol: 'mqtt',
              variables: {
                env: {
                  enum: ['prod', 'staging', 'dev', 'staging', 'prod'],
                  default: 'prod',
                },
              },
            },
          },
        }, { unify: true })

        expect(result).toHaveProperty(['servers', 'production', 'variables', 'env', 'enum'], ['prod', 'staging', 'dev'])
      })

      it('handles server variable enum with no duplicates', () => {
        const result = unify({
          asyncapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          servers: {
            production: {
              host: '{env}.example.com',
              protocol: 'mqtt',
              variables: {
                env: {
                  enum: ['dev', 'staging', 'prod'],
                  default: 'prod',
                },
              },
            },
          },
        }, { unify: true })

        expect(result).toHaveProperty(['servers', 'production', 'variables', 'env', 'enum'], ['dev', 'staging', 'prod'])
      })

      it('merges origins when removing duplicates from server variable enum ', () => {
        const source = {
          asyncapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          servers: {
            production: {
              host: '{env}.example.com',
              protocol: 'mqtt',
              variables: {
                env: {
                  enum: ['dev', 'staging', 'prod', 'dev'],
                  default: 'prod',
                },
              },
            },
          },
        }
        const result = normalize(source, NORMALIZATION_OPTIONS) as any

        commonOriginsCheck(result, { source })
        const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
        expect(resultWithHmr).toHaveProperty(
          ['servers', 'production', 'variables', 'env', 'enum', TEST_ORIGINS_FLAG, 0],
          ['servers/production/variables/env/enum/0',
            'servers/production/variables/env/enum/3']
        )
      })
    })

    describe('Channel object', () => {
      it('sets default empty collections for channel properties', () => {
        const result = unify({
          asyncapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          channels: {
            testChannel: {
              address: '/test',
            },
          },
        }, { unify: true })

        expect(result).toHaveProperty(['channels', 'testChannel', 'messages'], {})
        expect(result).toHaveProperty(['channels', 'testChannel', 'servers'], [])
        expect(result).toHaveProperty(['channels', 'testChannel', 'parameters'], {})
        expect(result).toHaveProperty(['channels', 'testChannel', 'tags'], [])
        expect(result).toHaveProperty(['channels', 'testChannel', 'externalDocs'], {})
        expect(result).toHaveProperty(['channels', 'testChannel', 'bindings'], {})
      })
    })

    describe('Message object', () => {
      it('sets default empty arrays and objects for message properties', () => {
        const result = unify({
          asyncapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          channels: {
            userSignup: {
              messages: {
                userSignedUp: {
                  payload: {
                    type: 'object',
                  },
                },
              },
            },
          },
        }, { unify: true })

        expect(result).toHaveProperty(['channels', 'userSignup', 'messages', 'userSignedUp', 'tags'], [])
        expect(result).toHaveProperty(['channels', 'userSignup', 'messages', 'userSignedUp', 'externalDocs'], {})
        expect(result).toHaveProperty(['channels', 'userSignup', 'messages', 'userSignedUp', 'bindings'], {})
        expect(result).toHaveProperty(['channels', 'userSignup', 'messages', 'userSignedUp', 'examples'], [])
        expect(result).toHaveProperty(['channels', 'userSignup', 'messages', 'userSignedUp', 'traits'], [])
      })

      // just basic test here to check that rule is specified for the message object,
      // defaultContentType logic is tested extensively in Message Trait Object tests
      it('defaults contentType to root defaultContentType', () => {
        const source = {
          asyncapi: '3.0.0',
          defaultContentType: 'application/json',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          channels: {
            userChannel: {
              messages: {
                userMessage: {
                  payload: {
                    type: 'object',
                  },
                },
              },
            },
          },
        }
        const result = unify(source, { unify: true })

        expect(result).toHaveProperty(
          ['channels', 'userChannel', 'messages', 'userMessage', 'contentType'],
          'application/json'
        )
      })
    })

    describe('Message Trait object', () => {
      it('sets default empty arrays and objects for message trait properties', () => {
        const result = unify({
          asyncapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          components: {
            messageTraits: {
              commonTrait: {
                contentType: 'application/json',
              },
            },
          },
        }, { unify: true })

        expect(result).toHaveProperty(['components', 'messageTraits', 'commonTrait', 'tags'], [])
        expect(result).toHaveProperty(['components', 'messageTraits', 'commonTrait', 'externalDocs'], {})
        expect(result).toHaveProperty(['components', 'messageTraits', 'commonTrait', 'bindings'], {})
        expect(result).toHaveProperty(['components', 'messageTraits', 'commonTrait', 'examples'], [])
      })

      it('defaults contentType to root defaultContentType', () => {
        const source = {
          asyncapi: '3.0.0',
          defaultContentType: 'application/json',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          components: {
            messageTraits: {
              commonTrait: {
                summary: 'Common message trait',
              },
            },
          },
        }
        const result = unify(source, { unify: true })

        expect(result).toHaveProperty(
          ['components', 'messageTraits', 'commonTrait', 'contentType'],
          'application/json'
        )
      })

      it('preserves explicit contentType over root defaultContentType', () => {
        const source = {
          asyncapi: '3.0.0',
          defaultContentType: 'application/json',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          components: {
            messageTraits: {
              commonTrait: {
                contentType: 'application/xml',
              },
            },
          },
        }
        const result = unify(source, { unify: true })

        expect(result).toHaveProperty(
          ['components', 'messageTraits', 'commonTrait', 'contentType'],
          'application/xml'
        )
      })

      it('does not set contentType when root has no defaultContentType', () => {
        const source = {
          asyncapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          components: {
            messageTraits: {
              commonTrait: {
                summary: 'Common message trait',
              },
            },
          },
        }
        const result = unify(source, { unify: true })

        // Should not have contentType property
        expect(result).not.toHaveProperty(
          ['components', 'messageTraits', 'commonTrait', 'contentType']
        )
      })

      it('sets correct origin for synthetic contentType', () => {
        const source = {
          asyncapi: '3.0.0',
          defaultContentType: 'application/json',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          components: {
            messageTraits: {
              commonTrait: {
                summary: 'Common message trait',
              },
            },
          },
        }
        const result = normalize(source, NORMALIZATION_OPTIONS)

        commonOriginsCheck(result, { source })
        const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
        expect(resultWithHmr).toHaveProperty(['components', 'messageTraits', 'commonTrait', TEST_ORIGINS_FLAG, 'contentType'], ['defaultContentType'])
      })
    })

    describe('Message Trait object - reversibility', () => {
      it('removes synthetic contentType during deUnify', () => {
        const source = {
          asyncapi: '3.0.0',
          defaultContentType: 'application/json',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          components: {
            messageTraits: {
              commonTrait: {
                summary: 'Common message trait',
                // No contentType property
              },
            },
          },
        }

        const unified = unify(source, { unify: true })
        const result = deUnify(unified, { unify: true })

        // Synthetic contentType should be removed
        expect(result).not.toHaveProperty(['components', 'messageTraits', 'commonTrait', 'contentType'])
      })

      it('preserves pure contentType during deUnify', () => {
        const source = {
          asyncapi: '3.0.0',
          defaultContentType: 'application/json',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          components: {
            messageTraits: {
              commonTrait: {
                summary: 'Common message trait',
                contentType: 'application/json',  // Explicitly set to match default
              },
            },
          },
        }

        const unified = unify(source, NORMALIZATION_OPTIONS)
        const result = deUnify(unified, NORMALIZATION_OPTIONS)

        // Pure contentType should be preserved
        expect(result).toHaveProperty(['components', 'messageTraits', 'commonTrait', 'contentType'], 'application/json')
      })
      it('removes defaults and origins metadata after de-normalization', () => {
        const source = {
          asyncapi: '3.0.0',
          defaultContentType: 'application/json',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          components: {
            messageTraits: {
              commonTrait: {
                summary: 'Common message trait',
                // No explicit contentType, tags, externalDocs, bindings, examples
              },
            },
          },
        }

        const normalized = normalize(source, NORMALIZATION_OPTIONS)

        // Verify defaults were added
        expect(normalized).toHaveProperty(['components', 'messageTraits', 'commonTrait', 'contentType'], 'application/json')
        expect(normalized).toHaveProperty(['components', 'messageTraits', 'commonTrait', 'tags'], [])
        expect(normalized).toHaveProperty(['components', 'messageTraits', 'commonTrait', 'externalDocs'], {})
        expect(normalized).toHaveProperty(['components', 'messageTraits', 'commonTrait', 'bindings'], {})
        expect(normalized).toHaveProperty(['components', 'messageTraits', 'commonTrait', 'examples'], [])

        const result = denormalize(normalized, NORMALIZATION_OPTIONS)

        // Verify defaults and origins metadata are removed
        expect(result).not.toHaveProperty(['components', 'messageTraits', 'commonTrait', 'contentType'])
        expect(result).not.toHaveProperty(['components', 'messageTraits', 'commonTrait', 'tags'])
        expect(result).not.toHaveProperty(['components', 'messageTraits', 'commonTrait', 'externalDocs'])
        expect(result).not.toHaveProperty(['components', 'messageTraits', 'commonTrait', 'bindings'])
        expect(result).not.toHaveProperty(['components', 'messageTraits', 'commonTrait', 'examples'])
        expect(result).not.toHaveProperty(['components', 'messageTraits', 'commonTrait', TEST_DEFAULTS_FLAG])
        expect(result).not.toHaveProperty(['components', 'messageTraits', 'commonTrait', TEST_ORIGINS_FLAG])

        // Verify original property is preserved
        expect(result).toHaveProperty(['components', 'messageTraits', 'commonTrait', 'summary'], 'Common message trait')
      })
    })

    describe('Message Example object', () => {
      it('sets default empty object for message example headers', () => {
        const result = unify({
          asyncapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          channels: {
            userSignup: {
              messages: {
                userSignedUp: {
                  payload: {
                    type: 'object',
                  },
                  examples: [
                    {
                      name: 'Example 1',
                      payload: {
                        userId: '123',
                      },
                    },
                  ],
                },
              },
            },
          },
        }, { unify: true })

        expect(result).toHaveProperty(['channels', 'userSignup', 'messages', 'userSignedUp', 'examples', 0, 'headers'], {})
      })
    })

    describe('Parameter object', () => {
      it('sets default empty arrays for parameter properties', () => {
        const result = unify({
          asyncapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          channels: {
            userChannel: {
              parameters: {
                userId: {
                  description: 'User ID',
                },
              },
            },
          },
        }, { unify: true })

        expect(result).toHaveProperty(['channels', 'userChannel', 'parameters', 'userId', 'enum'], [])
        expect(result).toHaveProperty(['channels', 'userChannel', 'parameters', 'userId', 'examples'], [])
      })
    })

    describe('Security Scheme object', () => {
      it('sets default empty arrays and objects for security scheme properties', () => {
        const result = unify({
          asyncapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          components: {
            securitySchemes: {
              oauth: {
                type: 'oauth2',
                description: 'OAuth2 security',
              },
            },
          },
        }, { unify: true })

        expect(result).toHaveProperty(['components', 'securitySchemes', 'oauth', 'flows'], {})
        expect(result).toHaveProperty(['components', 'securitySchemes', 'oauth', 'scopes'], [])
      })
    })

    describe('Components object', () => {
      it('sets default empty objects for all components properties', () => {
        const result = unify({
          asyncapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          components: {},
        }, { unify: true })

        expect(result).toHaveProperty(['components', 'schemas'], {})
        expect(result).toHaveProperty(['components', 'servers'], {})
        expect(result).toHaveProperty(['components', 'channels'], {})
        expect(result).toHaveProperty(['components', 'operations'], {})
        expect(result).toHaveProperty(['components', 'messages'], {})
        expect(result).toHaveProperty(['components', 'securitySchemes'], {})
        expect(result).toHaveProperty(['components', 'serverVariables'], {})
        expect(result).toHaveProperty(['components', 'parameters'], {})
        expect(result).toHaveProperty(['components', 'correlationIds'], {})
        expect(result).toHaveProperty(['components', 'replies'], {})
        expect(result).toHaveProperty(['components', 'replyAddresses'], {})
        expect(result).toHaveProperty(['components', 'externalDocs'], {})
        expect(result).toHaveProperty(['components', 'tags'], [])
        expect(result).toHaveProperty(['components', 'operationTraits'], {})
        expect(result).toHaveProperty(['components', 'messageTraits'], {})
        expect(result).toHaveProperty(['components', 'serverBindings'], {})
        expect(result).toHaveProperty(['components', 'channelBindings'], {})
        expect(result).toHaveProperty(['components', 'operationBindings'], {})
        expect(result).toHaveProperty(['components', 'messageBindings'], {})
      })
    })

    describe('Integration tests', () => {
      it('applies all defaults to a minimal AsyncAPI document', () => {
        const result: unknown = unify({
          asyncapi: '3.0.0',
        }, { unify: true })

        // Root defaults
        expect(result).toHaveProperty(['info'])
        expect(result).toHaveProperty(['servers'], {})
        expect(result).toHaveProperty(['channels'], {})
        expect(result).toHaveProperty(['operations'], {})
        expect(result).toHaveProperty(['components'])

        // Components defaults
        const components = (result as Record<string, unknown>).components as Record<string, unknown>
        expect(components).toHaveProperty('schemas', {})
        expect(components).toHaveProperty('servers', {})
        expect(components).toHaveProperty('channels', {})
        expect(components).toHaveProperty('operations', {})
        expect(components).toHaveProperty('messages', {})
        expect(components).toHaveProperty('securitySchemes', {})
      })

      it('applies nested defaults correctly', () => {
        const result = unify({
          asyncapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          servers: {
            dev: {
              host: '{env}.example.com',
              protocol: 'mqtt',
              variables: {
                env: {
                  default: 'dev',
                  description: 'Environment',
                },
              },
            },
          },
          channels: {
            userChannel: {
              address: '/user/{userId}',
              parameters: {
                userId: {
                  description: 'User ID',
                },
              },
              messages: {
                userMessage: {
                  payload: {
                    type: 'object',
                  },
                },
              },
            },
          },
          operations: {
            sendUser: {
              action: 'send',
              channel: { $ref: '#/channels/userChannel' },
              reply: {
                channel: { $ref: '#/channels/replyChannel' },
              },
            },
          },
        }, { unify: true })

        // Server defaults
        expect(result).toHaveProperty(['servers', 'dev', 'security'], [])
        expect(result).toHaveProperty(['servers', 'dev', 'tags'], [])
        expect(result).toHaveProperty(['servers', 'dev', 'externalDocs'], {})
        expect(result).toHaveProperty(['servers', 'dev', 'bindings'], {})

        // Server variable defaults
        expect(result).toHaveProperty(['servers', 'dev', 'variables', 'env', 'enum'], [])
        expect(result).toHaveProperty(['servers', 'dev', 'variables', 'env', 'examples'], [])

        // Channel defaults
        expect(result).toHaveProperty(['channels', 'userChannel', 'servers'], [])
        expect(result).toHaveProperty(['channels', 'userChannel', 'tags'], [])
        expect(result).toHaveProperty(['channels', 'userChannel', 'externalDocs'], {})
        expect(result).toHaveProperty(['channels', 'userChannel', 'bindings'], {})

        // Parameter defaults
        expect(result).toHaveProperty(['channels', 'userChannel', 'parameters', 'userId', 'enum'], [])
        expect(result).toHaveProperty(['channels', 'userChannel', 'parameters', 'userId', 'examples'], [])

        // Message defaults
        expect(result).toHaveProperty(['channels', 'userChannel', 'messages', 'userMessage', 'tags'], [])
        expect(result).toHaveProperty(['channels', 'userChannel', 'messages', 'userMessage', 'externalDocs'], {})
        expect(result).toHaveProperty(['channels', 'userChannel', 'messages', 'userMessage', 'bindings'], {})
        expect(result).toHaveProperty(['channels', 'userChannel', 'messages', 'userMessage', 'examples'], [])
        expect(result).toHaveProperty(['channels', 'userChannel', 'messages', 'userMessage', 'traits'], [])

        // Operation defaults
        expect(result).toHaveProperty(['operations', 'sendUser', 'security'], [])
        expect(result).toHaveProperty(['operations', 'sendUser', 'tags'], [])
        expect(result).toHaveProperty(['operations', 'sendUser', 'externalDocs'], {})
        expect(result).toHaveProperty(['operations', 'sendUser', 'bindings'], {})
        expect(result).toHaveProperty(['operations', 'sendUser', 'traits'], [])
        expect(result).toHaveProperty(['operations', 'sendUser', 'messages'], [])

        // Operation reply defaults
        expect(result).toHaveProperty(['operations', 'sendUser', 'reply', 'messages'], [])

        // Info defaults
        expect(result).toHaveProperty(['info', 'contact'], {})
        expect(result).toHaveProperty(['info', 'license'], {})
        expect(result).toHaveProperty(['info', 'tags'], [])
        expect(result).toHaveProperty(['info', 'externalDocs'], {})
      })
    })
  })
})

