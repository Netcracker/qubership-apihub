
import { normalize, convertOriginToHumanReadable } from '../../src'
import { checkOriginsAreTheSame, commonOriginsCheck, setValueAtPath, TEST_ORIGINS_FLAG, TEST_INLINE_REFS_FLAG, TEST_REFERENCE_NAME_PROPERTY, TEST_SYNTHETIC_TITLE_FLAG } from '../helpers'
import { parseAsyncApiAndAssertValid } from '../helpers/asyncapi'
import type { Input } from '@asyncapi/parser/esm/types'
import 'jest-extended'


describe('AsyncAPI: merge traits', () => {
  describe('operation traits merging', () => {
    it('should merge operation traits with last trait winning', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {}
        },
        operations: {
          someOperation1: {
            action: 'send',
            channel: {
              $ref: '#/channels/channel1'
            },
            traits: [
              {
                description: 'first description'
              },
              {
                description: 'last description'
              }
            ]
          }
        }
      }

      const unifierResult: any = normalize(spec)
      const parserResult = await parseAsyncApiAndAssertValid(spec)

      // Verify traits were merged and last trait wins (same for unifier and parser)
      for (const result of [unifierResult, parserResult]) {
        expect(result.operations.someOperation1.description).toBe('last description')
        expect(result.operations.someOperation1.traits).toBeArray()
        expect(result.operations.someOperation1.traits).toHaveLength(2)
      }
    })

    it('should merge operation with root property overriding traits', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {}
        },
        operations: {
          someOperation2: {
            action: 'send',
            channel: {
              $ref: '#/channels/channel1'
            },
            description: 'root description',
            traits: [
              {
                description: 'trait description 1'
              },
              {
                description: 'trait description 2'
              }
            ]
          }
        }
      }

      const unifierResult: any = normalize(spec)
      const parserResult = await parseAsyncApiAndAssertValid(spec)

      // Verify root property wins over traits (same for unifier and parser)
      for (const result of [unifierResult, parserResult]) {
        expect(result.operations.someOperation2.description).toBe('root description')
      }
    })

    it('should merge complex operation traits with bindings', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {}
        },
        operations: {
          complexOp: {
            action: 'receive',
            channel: {
              $ref: '#/channels/channel1'
            },
            traits: [
              {
                summary: 'trait summary',
                bindings: {
                  kafka: {
                    clientId: {}
                  }
                }
              },
              {
                description: 'trait description',
                bindings: {
                  kafka: {
                    groupId: {}
                  }
                }
              }
            ]
          }
        }
      }

      const unifierResult: any = normalize(spec)
      const parserResult = await parseAsyncApiAndAssertValid(spec)

      // Verify all properties merged correctly (same for normalize result and parser)
      for (const result of [unifierResult, parserResult]) {
        expect(result.operations.complexOp.summary).toBe('trait summary')
        expect(result.operations.complexOp.description).toBe('trait description')
        expect(result.operations.complexOp.bindings).toEqual({
          kafka: {
            clientId: {},  // from first trait
            groupId: {}    // from second trait (merged)
          }
        })
      }
    })
  })

  describe('message traits merging', () => {
    it('should merge message traits in channels', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          someChannel1: {
            messages: {
              someMessage: {
                traits: [
                  {
                    summary: 'trait summary',
                    description: 'trait description'
                  },
                  {
                    description: 'last description'
                  }
                ]
              }
            }
          }
        }
      }

      const unifierResult: any = normalize(spec)
      const parserResult = await parseAsyncApiAndAssertValid(spec)

      // Verify merge: summary from first trait, description from second (same for unifier and parser)
      for (const result of [unifierResult, parserResult]) {
        expect(result.channels.someChannel1.messages.someMessage.summary).toBe('trait summary')
        expect(result.channels.someChannel1.messages.someMessage.description).toBe('last description')
      }
    })

    it('should merge message with root properties overriding traits', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          someChannel2: {
            messages: {
              someMessage: {
                summary: 'root summary',
                description: 'root description',
                traits: [
                  {
                    summary: 'trait summary',
                    description: 'trait description'
                  },
                  {
                    description: 'another trait description'
                  }
                ]
              }
            }
          }
        }
      }

      const unifierResult: any = normalize(spec)
      const parserResult = await parseAsyncApiAndAssertValid(spec)

      // Verify root properties win (same for unifier and parser)
      for (const result of [unifierResult, parserResult]) {
        expect(result.channels.someChannel2.messages.someMessage.summary).toBe('root summary')
        expect(result.channels.someChannel2.messages.someMessage.description).toBe('root description')
      }
    })

    it('should merge message traits in components', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        components: {
          messages: {
            someMessage1: {
              traits: [
                {
                  summary: 'trait summary',
                  description: 'trait description'
                },
                {
                  description: 'last description'
                }
              ]
            },
            someMessage2: {
              summary: 'root summary',
              description: 'root description',
              traits: [
                {
                  summary: 'trait summary',
                  description: 'trait description'
                },
                {
                  description: 'another description'
                }
              ]
            }
          }
        }
      }

      const unifierResult: any = normalize(spec)
      const parserResult = await parseAsyncApiAndAssertValid(spec)

      // Message 1: traits only; Message 2: root overrides traits (same for unifier and parser)
      for (const result of [unifierResult, parserResult]) {
        expect(result.components.messages.someMessage1.summary).toBe('trait summary')
        expect(result.components.messages.someMessage1.description).toBe('last description')
        expect(result.components.messages.someMessage2.summary).toBe('root summary')
        expect(result.components.messages.someMessage2.description).toBe('root description')
      }
    })

    it('should keep reference equality for objects defined via ref if they are not patched during traits merge', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        components: {
          schemas: {
            MessageHeadersSchema: {
              type: 'object',
              properties: {
                messageHeaderProperty: {
                  type: 'string'
                }
              }
            }
          },
          messages: {
            someMessage1: {
              headers: {
                $ref: '#/components/schemas/MessageHeadersSchema'
              },
              traits: [
                {
                  summary: 'trait summary',
                }
              ]
            }
          }
        }
      }

      await parseAsyncApiAndAssertValid(spec)

      const unifierResult: any = normalize(spec)

      expect(unifierResult.components.messages.someMessage1.headers).toBe(unifierResult.components.schemas.MessageHeadersSchema)
      // for parser result it is not so
    })

    it('should handle cyclic references in messages during merge traits', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        components: {
          schemas: {
            CycledSchema: {
              type: 'object',
              title: 'SchemaTitle',
              properties: {
                messageHeaderProperty: {
                  type: 'string',
                },
                cycle: {
                  $ref: '#/components/schemas/CycledSchema',
                },
              },
            }
          }
        },
        channels: {
          channel1: {
            messages: {
              msg1: {
                headers: {
                  $ref: '#/components/schemas/CycledSchema',
                },
                traits: [
                  {
                    headers: {
                      type: 'object',
                      properties: {
                        messageTraitHeaderProperty: {
                          type: 'string'
                        }
                      },
                    }
                  }
                ]
              }
            }
          }
        },
      }

      const parserResult = await parseAsyncApiAndAssertValid(spec)

      const unifierResult: any = normalize(spec)

      for (const result of [unifierResult, parserResult]) {
        // Verify that the headers schema was merged into the message
        const messageHeaders = result.channels.channel1.messages.msg1.headers
        expect(messageHeaders.properties.messageHeaderProperty).toBeDefined()
        expect(messageHeaders.properties.cycle).toBeDefined()
        expect(messageHeaders.properties.messageTraitHeaderProperty).toBeDefined()
        // second level of cycle should point to the original cycled schema
        expect(messageHeaders.properties.cycle).toBe(result.components.schemas.CycledSchema)
      }
    })

    it('should handle cyclic references in message traits during merge traits', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        components: {
          schemas: {
            CycledSchema: {
              type: 'object',
              title: 'SchemaTitle',
              properties: {
                messageTraitHeaderProperty: {
                  type: 'string',
                },
                cycle: {
                  $ref: '#/components/schemas/CycledSchema',
                },
              },
            }
          }
        },
        channels: {
          channel1: {
            messages: {
              msg1: {
                headers: {
                  type: 'object',
                  properties: {
                    messageHeaderProperty: {
                      type: 'string'
                    }
                  },
                },
                traits: [
                  {
                    headers: {
                      $ref: '#/components/schemas/CycledSchema',
                    }
                  }
                ]
              }
            }
          }
        },
      }

      const parserResult = await parseAsyncApiAndAssertValid(spec)

      const unifierResult: any = normalize(spec)

      for (const result of [unifierResult]) { // parser does not resolve $ref in this case for some reason
        // Verify that the headers schema was merged into the message
        const messageHeaders = result.channels.channel1.messages.msg1.headers
        expect(messageHeaders.properties.messageHeaderProperty).toBeDefined()
        expect(messageHeaders.properties.messageTraitHeaderProperty).toBeDefined()
        expect(messageHeaders.properties.cycle).toBeDefined()
        // second level of cycle should point to the original cycled schema
        expect(messageHeaders.properties.cycle).toBe(result.components.schemas.CycledSchema)
      }
    })

    it('cycled property in message should override cycled property in trait', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        components: {
          schemas: {
            MessageCycledSchema: {
              type: 'object',
              title: 'MessageSchemaTitle',
              properties: {
                messageHeaderProperty: {
                  type: 'string',
                },
                cycle: {
                  $ref: '#/components/schemas/MessageCycledSchema',
                },
              },
            },
            MessageTraitCycledSchema: {
              type: 'object',
              title: 'MessageTraitSchemaTitle',
              properties: {
                messageTraitHeaderProperty: {
                  type: 'string',
                },
                cycle: {
                  $ref: '#/components/schemas/MessageTraitCycledSchema',
                },
              },
            }
          }
        },
        channels: {
          channel1: {
            messages: {
              msg1: {
                headers: {
                  $ref: '#/components/schemas/MessageCycledSchema',
                },
                traits: [
                  {
                    headers: {
                      $ref: '#/components/schemas/MessageTraitCycledSchema',
                    }
                  }
                ]
              }
            }
          }
        },
      }

      const parserResult = await parseAsyncApiAndAssertValid(spec)

      const unifierResult: any = normalize(spec)

      for (const result of [unifierResult, parserResult]) {
        // Verify that the headers schema was merged into the message
        const messageHeaders = result.channels.channel1.messages.msg1.headers
        expect(messageHeaders.properties.messageHeaderProperty).toBeDefined()
        expect(messageHeaders.properties.cycle).toBeDefined()
        expect(messageHeaders.properties.messageTraitHeaderProperty).toBeDefined()
        // second level of cycle should point to the original cycled schema for the message
        expect(messageHeaders.properties.cycle).toBe(result.components.schemas.MessageCycledSchema)
      }
    })

    it('should handle cyclic references in both messages and traits simultaneously during merge traits', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        components: {
          schemas: {
            MessageCycledSchema: {
              type: 'object',
              title: 'MessageSchemaTitle',
              properties: {
                messageHeaderProperty: {
                  type: 'string',
                },
                messageCycle: {
                  $ref: '#/components/schemas/MessageCycledSchema',
                },
              },
            },
            MessageTraitCycledSchema: {
              type: 'object',
              title: 'MessageTraitSchemaTitle',
              properties: {
                messageTraitHeaderProperty: {
                  type: 'string',
                },
                messageTraitCycle: {
                  $ref: '#/components/schemas/MessageTraitCycledSchema',
                },
              },
            }
          }
        },
        channels: {
          channel1: {
            messages: {
              msg1: {
                headers: {
                  $ref: '#/components/schemas/MessageCycledSchema',
                },
                traits: [
                  {
                    headers: {
                      $ref: '#/components/schemas/MessageTraitCycledSchema',
                    }
                  }
                ]
              }
            }
          }
        },
      }

      const parserResult = await parseAsyncApiAndAssertValid(spec)

      const unifierResult: any = normalize(spec)

      for (const result of [unifierResult, parserResult]) {
        // Verify that the headers schema was merged into the message
        const messageHeaders = result.channels.channel1.messages.msg1.headers
        expect(messageHeaders.properties.messageHeaderProperty).toBeDefined()
        expect(messageHeaders.properties.messageCycle).toBeDefined()
        expect(messageHeaders.properties.messageTraitHeaderProperty).toBeDefined()
        expect(messageHeaders.properties.messageTraitCycle).toBeDefined()
        // second level of cycle should point to the original cycled schema for the message
        expect(messageHeaders.properties.messageCycle).toBe(result.components.schemas.MessageCycledSchema)
        expect(messageHeaders.properties.messageTraitCycle).toBe(result.components.schemas.MessageTraitCycledSchema)
      }
    })
  })

  describe('origins tracking', () => {
    it('should track origins for properties from traits', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {}
        },
        operations: {
          op1: {
            action: 'send',
            channel: {
              $ref: '#/channels/channel1'
            },
            traits: [
              {
                description: 'trait description',
                summary: 'trait summary'
              }
            ]
          }
        }
      }

      await parseAsyncApiAndAssertValid(spec)

      const result: any = normalize(spec, { originsFlag: TEST_ORIGINS_FLAG })

      // Check origins are tracked
      commonOriginsCheck(result, { source: spec })

      checkOriginsAreTheSame(result.operations.op1, result.operations.op1.traits[0], 'description', TEST_ORIGINS_FLAG)
      checkOriginsAreTheSame(result.operations.op1, result.operations.op1.traits[0], 'summary', TEST_ORIGINS_FLAG)

      const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)

      expect(resultWithHmr).toHaveProperty(
        ['operations', 'op1', TEST_ORIGINS_FLAG, 'description'],
        ['operations/op1/traits/0/description']
      )
      expect(resultWithHmr).toHaveProperty(
        ['operations', 'op1', TEST_ORIGINS_FLAG, 'summary'],
        ['operations/op1/traits/0/summary']
      )
    })

    it('should track origins for root properties overriding traits', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {}
        },
        operations: {
          op1: {
            action: 'send',
            channel: {
              $ref: '#/channels/channel1'
            },
            description: 'root description',
            traits: [
              {
                description: 'trait description',
                summary: 'trait summary'
              }
            ]
          }
        }
      }

      await parseAsyncApiAndAssertValid(spec)

      const result: any = normalize(spec, { originsFlag: TEST_ORIGINS_FLAG })

      commonOriginsCheck(result, { source: spec })

      checkOriginsAreTheSame(result.operations.op1, result.operations.op1.traits[0], 'summary', TEST_ORIGINS_FLAG)

      const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)

      // Verify description origin points to root (not traits)
      expect(resultWithHmr).toHaveProperty(
        ['operations', 'op1', TEST_ORIGINS_FLAG, 'description'],
        ['operations/op1/description']
      )

      // Verify summary origin points to traits
      expect(resultWithHmr).toHaveProperty(
        ['operations', 'op1', TEST_ORIGINS_FLAG, 'summary'],
        ['operations/op1/traits/0/summary']
      )
    })

    it('should track origins for nested objects from traits', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {}
        },
        operations: {
          op1: {
            action: 'send',
            channel: {
              $ref: '#/channels/channel1'
            },
            traits: [
              {
                bindings: {
                  kafka: {
                    clientId: {}
                  }
                }
              }
            ]
          }
        }
      }

      await parseAsyncApiAndAssertValid(spec)

      const result: any = normalize(spec, { originsFlag: TEST_ORIGINS_FLAG })

      commonOriginsCheck(result, { source: spec })

      checkOriginsAreTheSame(result.operations.op1, result.operations.op1.traits[0], 'bindings', TEST_ORIGINS_FLAG)
      checkOriginsAreTheSame(result.operations.op1.bindings.kafka, result.operations.op1.traits[0].bindings.kafka, 'clientId', TEST_ORIGINS_FLAG)

      const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)

      // Verify bindings origin
      expect(resultWithHmr).toHaveProperty(
        ['operations', 'op1', TEST_ORIGINS_FLAG, 'bindings'],
        ['operations/op1/traits/0/bindings']
      )
      expect(resultWithHmr).toHaveProperty(
        ['operations', 'op1', 'bindings', 'kafka', TEST_ORIGINS_FLAG, 'clientId'],
        ['operations/op1/traits/0/bindings/kafka/clientId']
      )
    })

    it('should track origins from shared trait in components for multiple operations', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {},
          channel2: {}
        },
        operations: {
          operation1: {
            action: 'send',
            channel: {
              $ref: '#/channels/channel1'
            },
            traits: [
              {
                $ref: '#/components/operationTraits/commonTrait'
              }
            ]
          },
          operation2: {
            action: 'receive',
            channel: {
              $ref: '#/channels/channel2'
            },
            traits: [
              {
                $ref: '#/components/operationTraits/commonTrait'
              }
            ]
          }
        },
        components: {
          operationTraits: {
            commonTrait: {
              description: 'shared trait description',
              bindings: {
                kafka: {
                  clientId: {
                    type: 'string'
                  },
                  groupId: {
                    type: 'string'
                  }
                }
              }
            }
          }
        }
      }

      await parseAsyncApiAndAssertValid(spec)

      const result: any = normalize(spec, { originsFlag: TEST_ORIGINS_FLAG })

      // Check origins are tracked
      commonOriginsCheck(result, { source: spec })

      // Both operations should have the merged properties from the shared trait
      expect(result.operations.operation1.description).toBe('shared trait description')
      expect(result.operations.operation2.description).toBe('shared trait description')

      // Check origin identity: both operations should point to the SAME origin object for root properties
      checkOriginsAreTheSame(
        result.operations.operation1,
        result.operations.operation1.traits[0],
        'description',
        TEST_ORIGINS_FLAG
      )
      checkOriginsAreTheSame(
        result.operations.operation2,
        result.operations.operation2.traits[0],
        'description',
        TEST_ORIGINS_FLAG
      )

      // Check origin identity for nested properties (bindings)
      checkOriginsAreTheSame(
        result.operations.operation1,
        result.operations.operation1.traits[0],
        'bindings',
        TEST_ORIGINS_FLAG
      )
      checkOriginsAreTheSame(
        result.operations.operation2,
        result.operations.operation2.traits[0],
        'bindings',
        TEST_ORIGINS_FLAG
      )
      checkOriginsAreTheSame(
        result.operations.operation1.bindings.kafka,
        result.operations.operation1.traits[0].bindings.kafka,
        'clientId',
        TEST_ORIGINS_FLAG
      )
      checkOriginsAreTheSame(
        result.operations.operation1.bindings.kafka,
        result.operations.operation1.traits[0].bindings.kafka,
        'groupId',
        TEST_ORIGINS_FLAG
      )
      checkOriginsAreTheSame(
        result.operations.operation2.bindings.kafka,
        result.operations.operation2.traits[0].bindings.kafka,
        'clientId',
        TEST_ORIGINS_FLAG
      )
      checkOriginsAreTheSame(
        result.operations.operation2.bindings.kafka,
        result.operations.operation2.traits[0].bindings.kafka,
        'groupId',
        TEST_ORIGINS_FLAG
      )

      // Verify human-readable origins point to the component trait
      const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)

      // Check HMR for operation1 root properties
      expect(resultWithHmr).toHaveProperty(
        ['operations', 'operation1', TEST_ORIGINS_FLAG, 'description'],
        ['components/operationTraits/commonTrait/description']
      )

      // Check HMR for operation2 root properties
      expect(resultWithHmr).toHaveProperty(
        ['operations', 'operation2', TEST_ORIGINS_FLAG, 'description'],
        ['components/operationTraits/commonTrait/description']
      )

      // Check HMR for operation1 nested properties (bindings)
      expect(resultWithHmr).toHaveProperty(
        ['operations', 'operation1', TEST_ORIGINS_FLAG, 'bindings'],
        ['components/operationTraits/commonTrait/bindings']
      )
      expect(resultWithHmr).toHaveProperty(
        ['operations', 'operation1', 'bindings', 'kafka', TEST_ORIGINS_FLAG, 'clientId'],
        ['components/operationTraits/commonTrait/bindings/kafka/clientId']
      )
      expect(resultWithHmr).toHaveProperty(
        ['operations', 'operation1', 'bindings', 'kafka', TEST_ORIGINS_FLAG, 'groupId'],
        ['components/operationTraits/commonTrait/bindings/kafka/groupId']
      )

      // Check HMR for operation2 nested properties (bindings)
      expect(resultWithHmr).toHaveProperty(
        ['operations', 'operation2', TEST_ORIGINS_FLAG, 'bindings'],
        ['components/operationTraits/commonTrait/bindings']
      )
      expect(resultWithHmr).toHaveProperty(
        ['operations', 'operation2', 'bindings', 'kafka', TEST_ORIGINS_FLAG, 'clientId'],
        ['components/operationTraits/commonTrait/bindings/kafka/clientId']
      )
      expect(resultWithHmr).toHaveProperty(
        ['operations', 'operation2', 'bindings', 'kafka', TEST_ORIGINS_FLAG, 'groupId'],
        ['components/operationTraits/commonTrait/bindings/kafka/groupId']
      )
    })
  })

  describe('edge cases', () => {
    it('should handle empty traits array', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {}
        },
        operations: {
          op1: {
            action: 'send',
            channel: {
              $ref: '#/channels/channel1'
            },
            description: 'root description',
            traits: []
          }
        }
      }

      const unifierResult: any = normalize(spec)
      const parserResult = await parseAsyncApiAndAssertValid(spec)

      for (const result of [unifierResult, parserResult]) {
        expect(result.operations.op1.description).toBe('root description')
      }
    })

    it('should handle object without traits property', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {}
        },
        operations: {
          op1: {
            action: 'send',
            channel: {
              $ref: '#/channels/channel1'
            },
            description: 'root description'
          }
        }
      }

      const unifierResult: any = normalize(spec)
      const parserResult = await parseAsyncApiAndAssertValid(spec)

      for (const result of [unifierResult, parserResult]) {
        expect(result.operations.op1.description).toBe('root description')
      }
    })
  })

  describe('option flags', () => {
    it('should skip merging when mergeTraits is false', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {}
        },
        operations: {
          op1: {
            action: 'send',
            channel: {
              $ref: '#/channels/channel1'
            },
            traits: [
              {
                description: 'trait description'
              }
            ]
          }
        }
      }

      await parseAsyncApiAndAssertValid(spec)

      const result: any = normalize(spec, { mergeTraits: false })

      // Traits should not be merged
      expect(result.operations.op1.traits).toBeArray()
      expect(result.operations.op1.traits).toHaveLength(1)
      // Description should not be present at root level
      expect(result.operations.op1).not.toHaveProperty('description')
    })

    it('should merge when mergeTraits is true (default)', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {}
        },
        operations: {
          op1: {
            action: 'send',
            channel: {
              $ref: '#/channels/channel1'
            },
            traits: [
              {
                description: 'trait description'
              }
            ]
          }
        }
      }

      const unifierResult: any = normalize(spec, { mergeTraits: true })
      const parserResult = await parseAsyncApiAndAssertValid(spec)

      // Traits should be merged (same for unifier and parser)
      for (const result of [unifierResult, parserResult]) {
        expect(result.operations.op1.description).toBe('trait description')
        expect(result.operations.op1.traits).toBeArray()
      }
    })
  })

  describe('arrays handling', () => {
    it('arrays are copied without merging (required array)', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {
            messages: {
              msg1: {
                headers: {
                  type: 'object',
                  properties: {
                    messageHeaderProperty: {
                      type: 'integer'
                    },
                  },
                  required: ['messageHeaderProperty']
                },
                traits: [
                  {
                    headers: {
                      type: 'object',
                      properties: {
                        messageTraitHeaderProperty1: {
                          type: 'string'
                        },
                        messageTraitHeaderProperty2: {
                          type: 'string'
                        }
                      },
                      required: ['messageTraitHeaderProperty1', 'messageTraitHeaderProperty2']
                    }
                  }
                ]
              }
            }
          }
        },
      }

      const parserResult = await parseAsyncApiAndAssertValid(spec)

      const unifierResult: any = normalize(spec)

      for (const result of [unifierResult, parserResult]) {

        // Verify that the headers schema was merged into the message
        const messageHeaders = result.channels.channel1.messages.msg1.headers
        expect(messageHeaders.properties.messageHeaderProperty).toBeDefined()
        expect(messageHeaders.properties.messageTraitHeaderProperty1).toBeDefined()
        expect(messageHeaders.properties.messageTraitHeaderProperty2).toBeDefined()

        // arrays are copied without merging according to merge patch spec
        expect(result.channels.channel1.messages.msg1.headers.required).toEqual(['messageHeaderProperty'])
      }
    })

    // need to have mergeTraits before mergeAllOf in normalize
    // but to do it we need to first stop using synthetic allOfs
    it.skip('arrays are copied without merging (allOf array)', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {
            messages: {
              msg1: {
                headers: {
                  allOf: [
                    {
                      type: 'object',
                      properties: {
                        messageHeaderProperty1: {
                          type: 'integer'
                        },
                      }
                    },
                    {
                      type: 'object',
                      properties: {
                        messageHeaderProperty2: {
                          type: 'string'
                        }
                      }
                    }
                  ]
                },
                traits: [
                  {
                    headers: {
                      allOf: [
                        {
                          type: 'object',
                          properties: {
                            messageTraitHeaderProperty1: {
                              type: 'integer'
                            },
                          }
                        },
                        {
                          type: 'object',
                          properties: {
                            messageTraitHeaderProperty2: {
                              type: 'string'
                            }
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            }
          }
        },
      }

      const parserResult = await parseAsyncApiAndAssertValid(spec)

      const unifierResult: any = normalize(spec)

      for (const result of [unifierResult, parserResult]) {

        // Verify that the headers schema was merged into the message
        const messageHeaders = result.channels.channel1.messages.msg1.headers
        expect(messageHeaders.properties.messageHeaderProperty1).toBeDefined()
        expect(messageHeaders.properties.messageHeaderProperty2).toBeDefined()
        expect(messageHeaders.properties.messageTraitHeaderProperty1).toBeUndefined() //not so in api-unifier
        expect(messageHeaders.properties.messageTraitHeaderProperty2).toBeUndefined() //not so in api-unifier
      }
    })
  })

  describe('symbol properties handling', () => {
    it('should preserve referenceNameProperty on operation when merging traits from component refs', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {}
        },
        operations: {
          testOp: {
            $ref: '#/components/operations/TestOperation'
          }
        },
        components: {
          operations: {
            TestOperation: {
              action: 'send',
              channel: {
                $ref: '#/channels/channel1'
              },
              traits: [
                {
                  $ref: '#/components/operationTraits/CommonTrait'
                }
              ]
            }
          },
          operationTraits: {
            CommonTrait: {
              description: 'common trait description',
              summary: 'common trait summary'
            }
          }
        }
      }

      await parseAsyncApiAndAssertValid(spec)

      const result: any = normalize(spec, {
        referenceNameProperty: TEST_REFERENCE_NAME_PROPERTY,
      })

      // Operation should have referenceNameProperty preserved after trait merge
      expect(result.operations.testOp[TEST_REFERENCE_NAME_PROPERTY]).toBe('TestOperation')

      // Trait in the traits array should have referenceNameProperty preserved
      expect(result.operations.testOp.traits).toBeArray()
      expect(result.operations.testOp.traits).toHaveLength(1)
      expect(result.operations.testOp.traits[0][TEST_REFERENCE_NAME_PROPERTY]).toBe('CommonTrait')

      // Properties from trait should be merged to operation
      expect(result.operations.testOp.description).toBe('common trait description')
      expect(result.operations.testOp.summary).toBe('common trait summary')
    })

    it('should preserve referenceNameProperty on operation with multiple trait refs', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {}
        },
        operations: {
          testOp: {
            action: 'send',
            channel: {
              $ref: '#/channels/channel1'
            },
            traits: [
              {
                $ref: '#/components/operationTraits/Trait1'
              },
              {
                $ref: '#/components/operationTraits/Trait2'
              }
            ]
          }
        },
        components: {
          operationTraits: {
            Trait1: {
              description: 'trait1 description'
            },
            Trait2: {
              summary: 'trait2 summary'
            }
          }
        }
      }

      await parseAsyncApiAndAssertValid(spec)

      const result: any = normalize(spec, {
        referenceNameProperty: TEST_REFERENCE_NAME_PROPERTY,
      })

      // Both traits should preserve their referenceNameProperty
      expect(result.operations.testOp.traits).toHaveLength(2)
      expect(result.operations.testOp.traits[0][TEST_REFERENCE_NAME_PROPERTY]).toBe('Trait1')
      expect(result.operations.testOp.traits[1][TEST_REFERENCE_NAME_PROPERTY]).toBe('Trait2')

      // Properties should be merged
      expect(result.operations.testOp.description).toBe('trait1 description')
      expect(result.operations.testOp.summary).toBe('trait2 summary')
    })

    it('should preserve inlineRefsFlag on operation when merging traits', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {}
        },
        operations: {
          testOp: {
            $ref: '#/components/operations/TestOperation'
          }
        },
        components: {
          operations: {
            TestOperation: {
              action: 'send',
              channel: {
                $ref: '#/channels/channel1'
              },
              traits: [
                {
                  $ref: '#/components/operationTraits/CommonTrait'
                }
              ]
            }
          },
          operationTraits: {
            CommonTrait: {
              description: 'common trait description'
            }
          }
        }
      }

      await parseAsyncApiAndAssertValid(spec)

      const result: any = normalize(spec, {
        inlineRefsFlag: TEST_INLINE_REFS_FLAG,
      })

      // Operation should have inlineRefsFlag preserved after trait merge
      expect(result.operations.testOp[TEST_INLINE_REFS_FLAG]).toBeArray()
      expect(result.operations.testOp[TEST_INLINE_REFS_FLAG]).toContain('#/components/operations/TestOperation')

      // Trait should have inlineRefsFlag preserved
      expect(result.operations.testOp.traits[0][TEST_INLINE_REFS_FLAG]).toBeArray()
      expect(result.operations.testOp.traits[0][TEST_INLINE_REFS_FLAG]).toContain('#/components/operationTraits/CommonTrait')
    })

    it('should preserve both referenceNameProperty and inlineRefsFlag on operation', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {}
        },
        operations: {
          testOp: {
            $ref: '#/components/operations/TestOperation'
          }
        },
        components: {
          operations: {
            TestOperation: {
              action: 'send',
              channel: {
                $ref: '#/channels/channel1'
              },
              traits: [
                {
                  $ref: '#/components/operationTraits/CommonTrait'
                }
              ]
            }
          },
          operationTraits: {
            CommonTrait: {
              description: 'common trait description'
            }
          }
        }
      }

      await parseAsyncApiAndAssertValid(spec)

      const result: any = normalize(spec, {
        referenceNameProperty: TEST_REFERENCE_NAME_PROPERTY,
        inlineRefsFlag: TEST_INLINE_REFS_FLAG,
      })

      // Both symbol properties should be preserved on operation
      expect(result.operations.testOp[TEST_REFERENCE_NAME_PROPERTY]).toBe('TestOperation')
      expect(result.operations.testOp[TEST_INLINE_REFS_FLAG]).toBeArray()
      expect(result.operations.testOp[TEST_INLINE_REFS_FLAG]).toContain('#/components/operations/TestOperation')

      // Both symbol properties should be preserved on trait
      expect(result.operations.testOp.traits[0][TEST_REFERENCE_NAME_PROPERTY]).toBe('CommonTrait')
      expect(result.operations.testOp.traits[0][TEST_INLINE_REFS_FLAG]).toBeArray()
      expect(result.operations.testOp.traits[0][TEST_INLINE_REFS_FLAG]).toContain('#/components/operationTraits/CommonTrait')
    })

    it('should preserve referenceNameProperty on message when merging traits from component refs', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {
            messages: {
              msg1: {
                $ref: '#/components/messages/TestMessage'
              }
            }
          }
        },
        components: {
          messages: {
            TestMessage: {
              traits: [
                {
                  $ref: '#/components/messageTraits/CommonTrait'
                }
              ]
            }
          },
          messageTraits: {
            CommonTrait: {
              contentType: 'application/json',
              description: 'common message trait'
            }
          }
        }
      }

      await parseAsyncApiAndAssertValid(spec)

      const result: any = normalize(spec, {
        referenceNameProperty: TEST_REFERENCE_NAME_PROPERTY,
      })

      // Message should have referenceNameProperty preserved after trait merge
      expect(result.channels.channel1.messages.msg1[TEST_REFERENCE_NAME_PROPERTY]).toBe('TestMessage')

      // Trait should have referenceNameProperty preserved
      expect(result.channels.channel1.messages.msg1.traits).toBeArray()
      expect(result.channels.channel1.messages.msg1.traits).toHaveLength(1)
      expect(result.channels.channel1.messages.msg1.traits[0][TEST_REFERENCE_NAME_PROPERTY]).toBe('CommonTrait')

      // Properties from trait should be merged to message
      expect(result.channels.channel1.messages.msg1.contentType).toBe('application/json')
      expect(result.channels.channel1.messages.msg1.description).toBe('common message trait')
    })

    it('should preserve symbol properties with inline traits (not refs)', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {}
        },
        operations: {
          testOp: {
            $ref: '#/components/operations/TestOperation'
          }
        },
        components: {
          operations: {
            TestOperation: {
              action: 'send',
              channel: {
                $ref: '#/channels/channel1'
              },
              traits: [
                {
                  description: 'inline trait description'
                }
              ]
            }
          }
        }
      }

      await parseAsyncApiAndAssertValid(spec)

      const result: any = normalize(spec, {
        referenceNameProperty: TEST_REFERENCE_NAME_PROPERTY,
        inlineRefsFlag: TEST_INLINE_REFS_FLAG,
      })

      // Operation should have symbol properties preserved even with inline traits
      expect(result.operations.testOp[TEST_REFERENCE_NAME_PROPERTY]).toBe('TestOperation')
      expect(result.operations.testOp[TEST_INLINE_REFS_FLAG]).toBeArray()

      // Inline trait should not have referenceNameProperty (it's not from a ref)
      expect(result.operations.testOp.traits[0][TEST_REFERENCE_NAME_PROPERTY]).toBeUndefined()

      // Properties should be merged
      expect(result.operations.testOp.description).toBe('inline trait description')
    })

    it('should preserve symbol properties when operation has both traits and root properties', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {}
        },
        operations: {
          testOp: {
            $ref: '#/components/operations/TestOperation'
          }
        },
        components: {
          operations: {
            TestOperation: {
              action: 'send',
              channel: {
                $ref: '#/channels/channel1'
              },
              description: 'root description',
              traits: [
                {
                  $ref: '#/components/operationTraits/CommonTrait'
                }
              ]
            }
          },
          operationTraits: {
            CommonTrait: {
              description: 'trait description',
              summary: 'trait summary'
            }
          }
        }
      }

      await parseAsyncApiAndAssertValid(spec)

      const result: any = normalize(spec, {
        referenceNameProperty: TEST_REFERENCE_NAME_PROPERTY,
      })

      // Operation should preserve referenceNameProperty
      expect(result.operations.testOp[TEST_REFERENCE_NAME_PROPERTY]).toBe('TestOperation')

      // Trait should preserve referenceNameProperty
      expect(result.operations.testOp.traits[0][TEST_REFERENCE_NAME_PROPERTY]).toBe('CommonTrait')

      // Root description should win over trait description
      expect(result.operations.testOp.description).toBe('root description')
      expect(result.operations.testOp.summary).toBe('trait summary')
    })

    it('should preserve deep symbol properties on nested objects (schema in message headers)', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {
            messages: {
              msg1: {
                $ref: '#/components/messages/TestMessage'
              }
            }
          }
        },
        components: {
          messages: {
            TestMessage: {
              traits: [
                {
                  $ref: '#/components/messageTraits/CommonTrait'
                }
              ]
            }
          },
          messageTraits: {
            CommonTrait: {
              headers: {
                $ref: '#/components/schemas/TestSchema'
              }
            }
          },
          schemas: {
            TestSchema: {
              type: 'object',
              properties: {
                'my-app-header': {
                  type: 'integer'
                },
                'internal-id': {
                  $ref: '#/components/schemas/InternalSchema'
                }
              }
            },
            InternalSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string'
                }
              }
            }
          }
        },
        operations: {
          testOp: {
            action: 'send',
            channel: {
              $ref: '#/channels/channel1'
            },
          }
        }
      }

      const parsedSpec = await parseAsyncApiAndAssertValid(spec)

      const result: any = normalize(spec, {
        syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
      })

      // Verify that the headers schema was merged into the message
      const messageHeaders = result.channels.channel1.messages.msg1.headers
      expect(messageHeaders.title).toBe('TestSchema')
      expect(messageHeaders[TEST_SYNTHETIC_TITLE_FLAG]).toBe(true)

      // Verify that the internal id schema was merged into the message
      expect(messageHeaders.properties['internal-id'].title).toBe('InternalSchema')
      expect(messageHeaders.properties['internal-id'][TEST_SYNTHETIC_TITLE_FLAG]).toBe(true)

      // Verify that the headers schema in message trait has synthetic title flag preserved
      const messageTraitHeaders = result.channels.channel1.messages.msg1.traits[0].headers
      expect(messageTraitHeaders.title).toBe('TestSchema')
      expect(messageTraitHeaders[TEST_SYNTHETIC_TITLE_FLAG]).toBe(true)

      // Verify that the internal id schema in message trait has synthetic title flag preserved
      expect(messageTraitHeaders.properties['internal-id'].title).toBe('InternalSchema')
      expect(messageTraitHeaders.properties['internal-id'][TEST_SYNTHETIC_TITLE_FLAG]).toBe(true)
    })

    it('symbol properties on message object headers should be preserved after trait merge', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0',
        },
        channels: {
          channel1: {
            messages: {
              msg1: {
                $ref: '#/components/messages/TestMessage'
              }
            }
          }
        },
        components: {
          messages: {
            TestMessage: {
              headers: {
                $ref: '#/components/schemas/MessageHeadersSchema'
              },
              traits: [
                {
                  $ref: '#/components/messageTraits/CommonTrait'
                }
              ]
            }
          },
          messageTraits: {
            CommonTrait: {
              headers: {
                $ref: '#/components/schemas/MessageTraitHeaderSchema'
              }
            }
          },
          schemas: {
            MessageHeadersSchema: {
              type: 'object',
              properties: {
                messageHeaderProperty: {
                  type: 'integer'
                },
              }
            },
            MessageTraitHeaderSchema: {
              type: 'object',
              properties: {
                messageTraitHeaderProperty: {
                  type: 'string'
                }
              }
            }
          }
        },
        operations: {
          testOp: {
            action: 'send',
            channel: {
              $ref: '#/channels/channel1'
            },
          }
        }
      }

      const parsedSpec = await parseAsyncApiAndAssertValid(spec)

      const result: any = normalize(spec, {
        syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
      })

      // Verify that the headers schema was merged into the message
      const messageHeaders = result.channels.channel1.messages.msg1.headers

      expect(messageHeaders.properties.messageHeaderProperty).toBeDefined()
      expect(messageHeaders.properties.messageTraitHeaderProperty).toBeDefined()  // TODO missing due to allOf being and array which is just copied by patch merge

      expect(messageHeaders.title).toBe('MessageHeadersSchema')
      expect(messageHeaders[TEST_SYNTHETIC_TITLE_FLAG]).toBe(true)

      // Verify that the headers schema in message trait has synthetic title flag preserved
      const messageTraitHeaders = result.channels.channel1.messages.msg1.traits[0].headers
      expect(messageTraitHeaders.title).toBe('MessageTraitHeaderSchema')
      expect(messageTraitHeaders[TEST_SYNTHETIC_TITLE_FLAG]).toBe(true)
    })
  })

  describe('null handling check', () => {
    type ExtensionValue = undefined | null | 'value'
    const VALUE: ExtensionValue = 'value'

    function sampleAsyncAPISpecWithNulls(values: [ExtensionValue, ExtensionValue, ExtensionValue], nested: boolean): Input {
      const pathPrefixes = [
        ['operations', 'op1', 'traits', 0],
        ['operations', 'op1', 'traits', 1],
        ['operations', 'op1'],
      ]
      const nestedPathFragment = ['bindings', 'kafka']

      const paths = pathPrefixes.map(prefix =>
        nested
          ? [...prefix, ...nestedPathFragment, 'x-test']
          : [...prefix, 'x-test']
      )

      const spec = {
        asyncapi: '3.0.0',
        info: { title: 'Test', version: '1.0' },
        channels: { channel1: {} },
        operations: {
          op1: {
            action: 'send',
            channel: { $ref: '#/channels/channel1' },
          }
        }
      }

      for (let i = 0; i < paths.length; i++) {
        setValueAtPath(spec, paths[i], values[i])
      }
      return spec
    }

    // trait1Value, trait2Value, operationValue, expectedValue
    const TRAITS_MERGE_NULL_TEST_DATA: [ExtensionValue, ExtensionValue, ExtensionValue, ExtensionValue][] = [
      [undefined, undefined, null, null],
      [undefined, null, undefined, null],
      [undefined, null, null, null],
      [undefined, null, VALUE, VALUE],
      [undefined, VALUE, null, null],
      [null, undefined, undefined, null],
      [null, undefined, null, null],
      [null, undefined, VALUE, VALUE],
      [null, null, undefined, null],
      [null, null, null, null],
      [null, null, VALUE, VALUE],
      [null, VALUE, undefined, VALUE],
      [null, VALUE, null, null],
      [null, VALUE, VALUE, VALUE],
      [VALUE, undefined, null, null],
      [VALUE, null, undefined, null],
      [VALUE, null, null, null],
      [VALUE, null, VALUE, VALUE],
      [VALUE, VALUE, null, null],
      [VALUE, VALUE, VALUE, VALUE],
    ]
    it.each(TRAITS_MERGE_NULL_TEST_DATA)(
      'root property merged value equals expected when (trait1Value, trait2Value, operationValue) = (%s, %s, %s)',
      async (trait1Val, trait2Val, opVal, expected) => {
        const spec = sampleAsyncAPISpecWithNulls([trait1Val, trait2Val, opVal], false)

        const unifierResult: any = normalize(spec)
        const parserResult = await parseAsyncApiAndAssertValid(spec)

        for (const result of [unifierResult, parserResult]) {
          if (expected === undefined) {
            expect(result).not.toHaveProperty(['operations', 'op1', 'x-test'])
          } else {
            expect(result).toHaveProperty(['operations', 'op1', 'x-test'], expected)
          }
        }
      }
    )

    it.each(TRAITS_MERGE_NULL_TEST_DATA)(
      'nested property merged value equals expected when (trait1Value, trait2Value, operationValue) = (%s, %s, %s)',
      async (trait1Val, trait2Val, opVal, expected) => {
        const spec = sampleAsyncAPISpecWithNulls([trait1Val, trait2Val, opVal], true)

        const unifierResult: any = normalize(spec)
        const parserResult = await parseAsyncApiAndAssertValid(spec)

        for (const result of [unifierResult, parserResult]) {
          // note that for root properties and nested properties the behaviour of @asyncapi/parser is different
          // current behaviour of api-unifier is aligned with @asyncapi/parser
          // see https://github.com/asyncapi/spec/issues/1178
          if (expected === undefined || expected === null) {
            expect(result).not.toHaveProperty(['operations', 'op1', 'bindings', 'kafka', 'x-test'])
          } else {
            expect(result).toHaveProperty(['operations', 'op1', 'bindings', 'kafka', 'x-test'], expected)
          }
        }
      }
    )
  })
})
