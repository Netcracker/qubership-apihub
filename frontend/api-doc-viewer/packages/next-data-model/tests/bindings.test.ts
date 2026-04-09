import { TreeNodeComplexityTypes } from "../src/model/abstract/tree/tree-node.interface"
import { AsyncApiTreeNodeKinds } from "../src/model/async-api/types/node-kind"
import { createAsyncApiTreeForTests } from "./helpers/create-async-api-tree-for-tests"
import { simplifyConsole } from "./helpers/simplify-console"

const COMPONENTS_WITH_MESSAGES = {
  components: {
    messages: {
      'test-message': {
        name: "TestMessage",
        title: "Test Message",
      }
    }
  }
}

const SINGLE_MESSAGE_USAGE = {
  messages: [
    { $ref: "#/components/messages/test-message" }
  ]
}

describe('Bindings', () => {
  simplifyConsole()

  describe('Operation bindings', () => {
    it('should handle operation with single binding', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "operation-single-binding-test",
          version: "1.0.0"
        },
        channels: {
          'test-channel': {
            address: "test-channel"
          }
        },
        operations: {
          'test-operation': {
            action: "send",
            channel: { $ref: "#/channels/test-channel" },
            ...SINGLE_MESSAGE_USAGE,
            bindings: {
              kafka: {
                groupId: {
                  type: "string",
                  enum: ["consumer-group-1"]
                },
                clientId: {
                  type: "string",
                  enum: ["client-1"]
                },
                bindingVersion: "0.5.0"
              }
            }
          }
        },
        ...COMPONENTS_WITH_MESSAGES
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree?.root ?? null
      expect(messageNode).not.toBeNull()

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
      expect(messageSectionSelectorNode).toBeDefined()

      const sections = messageSectionSelectorNode?.nestedNodes() ?? []
      expect(sections.length).toBe(3)

      const contentSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT)
      const channelSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
      const operationSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_OPERATION)
      expect(contentSectionNode).toBeDefined()
      expect(channelSectionNode).toBeDefined()
      expect(operationSectionNode).toBeDefined()

      const operationBindingsNode = operationSectionNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.BINDINGS)
      expect(operationBindingsNode).toBeDefined()
      expect(operationBindingsNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)
      expect(operationBindingsNode!.key).toBe('bindings')

      const bindingNodes = operationBindingsNode!.nestedNodes()
      expect(bindingNodes.length).toBe(1)

      const bindingNode = bindingNodes.find(node => node.kind === AsyncApiTreeNodeKinds.BINDING)
      expect(bindingNode).toBeDefined()
      expect(bindingNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(bindingNode!.key).toBe('kafka')
      expect(bindingNode!.value()).toEqual({
        binding: {
          groupId: {
            type: "string",
            enum: ["consumer-group-1"]
          },
          clientId: {
            type: "string",
            enum: ["client-1"]
          },
        },
        version: '0.5.0',
        protocol: 'kafka',
      })
    })

    it('should handle operation with two bindings', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "operation-two-bindings-test",
          version: "1.0.0"
        },
        channels: {
          'test-channel': {
            address: "test-channel"
          }
        },
        operations: {
          'test-operation': {
            action: "send",
            channel: { $ref: "#/channels/test-channel" },
            ...SINGLE_MESSAGE_USAGE,
            bindings: {
              kafka: {
                groupId: {
                  type: "string",
                  enum: ["consumer-group-1"]
                },
                bindingVersion: "0.5.0"
              },
              amqp: {
                expiration: 100000,
                userId: "guest",
                cc: ["user.logs"],
                priority: 10,
                deliveryMode: 2,
                mandatory: false,
                bindingVersion: "0.3.0"
              }
            }
          }
        },
        ...COMPONENTS_WITH_MESSAGES
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      
      const messageNode = tree?.root ?? null
      expect(messageNode).not.toBeNull()

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
      expect(messageSectionSelectorNode).toBeDefined()

      const sections = messageSectionSelectorNode?.nestedNodes() ?? []
      expect(sections.length).toBe(3)

      const contentSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT)
      const channelSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
      const operationSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_OPERATION)
      expect(contentSectionNode).toBeDefined()
      expect(channelSectionNode).toBeDefined()
      expect(operationSectionNode).toBeDefined()

      const operationBindingsNode = operationSectionNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.BINDINGS)
      expect(operationBindingsNode).toBeDefined()
      expect(operationBindingsNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)
      expect(operationBindingsNode!.key).toBe('bindings')

      const bindingNodes = operationBindingsNode!.nestedNodes()
      expect(bindingNodes.length).toBe(2)

      const kafkaBindingNode = bindingNodes.find(node => node.kind === AsyncApiTreeNodeKinds.BINDING && node.key === 'kafka')
      expect(kafkaBindingNode).toBeDefined()
      expect(kafkaBindingNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(kafkaBindingNode!.value()).toEqual({
        binding: {
          groupId: {
            type: "string",
            enum: ["consumer-group-1"]
          },
        },
        version: '0.5.0',
        protocol: 'kafka',
      })

      const amqpBindingNode = bindingNodes.find(node => node.kind === AsyncApiTreeNodeKinds.BINDING && node.key === 'amqp')
      expect(amqpBindingNode).toBeDefined()
      expect(amqpBindingNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(amqpBindingNode!.value()).toEqual({
        binding: {
          expiration: 100000,
          userId: "guest",
          cc: ["user.logs"],
          priority: 10,
          deliveryMode: 2,
          mandatory: false,
        },
        version: '0.3.0',
        protocol: 'amqp',
      })
    })
  })

  describe('Channel bindings', () => {
    it('should handle channel with single binding', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "channel-single-binding-test",
          version: "1.0.0"
        },
        channels: {
          'test-channel': {
            address: "test-topic",
            bindings: {
              kafka: {
                topic: "test-topic",
                partitions: 3,
                replicas: 2,
                bindingVersion: "0.5.0"
              }
            }
          }
        },
        operations: {
          'test-operation': {
            action: "send",
            channel: { $ref: "#/channels/test-channel" },
            ...SINGLE_MESSAGE_USAGE,
          }
        },
        ...COMPONENTS_WITH_MESSAGES
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()
      
      const messageNode = tree?.root ?? null
      expect(messageNode).not.toBeNull()

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
      expect(messageSectionSelectorNode).toBeDefined()

      const sections = messageSectionSelectorNode?.nestedNodes() ?? []
      expect(sections.length).toBe(3)

      const contentSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT)
      const channelSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
      const operationSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_OPERATION)
      expect(contentSectionNode).toBeDefined()
      expect(channelSectionNode).toBeDefined()
      expect(operationSectionNode).toBeDefined()

      const channelBindingsNode = channelSectionNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.BINDINGS)
      expect(channelBindingsNode).toBeDefined()
      expect(channelBindingsNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)
      expect(channelBindingsNode!.key).toBe('bindings')

      const bindingNodes = channelBindingsNode!.nestedNodes()
      expect(bindingNodes.length).toBe(1)
      
      const bindingNode = bindingNodes.find(node => node.kind === AsyncApiTreeNodeKinds.BINDING && node.key === 'kafka')
      expect(bindingNode).toBeDefined()
      expect(bindingNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(bindingNode!.value()).toEqual({
        binding: {
          topic: "test-topic",
          partitions: 3,
          replicas: 2,
        },
        version: '0.5.0',
        protocol: 'kafka',
      })
    })

    it('should handle channel with two bindings', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "channel-two-bindings-test",
          version: "1.0.0"
        },
        channels: {
          'test-channel': {
            address: "test-topic",
            bindings: {
              kafka: {
                topic: "events-topic",
                partitions: 5,
                bindingVersion: "0.5.0"
              },
              amqp: {
                is: "routingKey",
                exchange: {
                  name: "events-exchange",
                  type: "topic",
                  durable: true,
                  autoDelete: false
                },
                bindingVersion: "0.3.0"
              }
            }
          }
        },
        operations: {
          'test-operation': {
            action: "send",
            channel: { $ref: "#/channels/test-channel" },
            ...SINGLE_MESSAGE_USAGE,
          }
        },
        ...COMPONENTS_WITH_MESSAGES
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree?.root ?? null
      expect(messageNode).not.toBeNull()

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
      expect(messageSectionSelectorNode).toBeDefined()

      const sections = messageSectionSelectorNode?.nestedNodes() ?? []
      expect(sections.length).toBe(3)

      const contentSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT)
      const channelSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
      const operationSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_OPERATION)
      expect(contentSectionNode).toBeDefined()
      expect(channelSectionNode).toBeDefined()
      expect(operationSectionNode).toBeDefined()

      const channelBindingsNode = channelSectionNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.BINDINGS)
      expect(channelBindingsNode).toBeDefined()
      expect(channelBindingsNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)
      expect(channelBindingsNode!.key).toBe('bindings')

      const bindingNodes = channelBindingsNode!.nestedNodes()
      expect(bindingNodes.length).toBe(2)

      const kafkaBindingNode = bindingNodes.find(node => node.kind === AsyncApiTreeNodeKinds.BINDING && node.key === 'kafka')
      expect(kafkaBindingNode).toBeDefined()
      expect(kafkaBindingNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(kafkaBindingNode!.value()).toEqual({
        binding: {
          topic: "events-topic",
          partitions: 5,
        },
        version: '0.5.0',
        protocol: 'kafka',
      })

      const amqpBindingNode = bindingNodes.find(node => node.kind === AsyncApiTreeNodeKinds.BINDING && node.key === 'amqp')
      expect(amqpBindingNode).toBeDefined()
      expect(amqpBindingNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(amqpBindingNode!.value()).toEqual({
        binding: {
          is: "routingKey",
          exchange: {
            name: "events-exchange",
            type: "topic",
            durable: true,
            autoDelete: false,
          },
        },
        version: '0.3.0',
        protocol: 'amqp',
      })
    })
  })

  describe('Message bindings', () => {
    it('should handle message with single binding', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "message-single-binding-test",
          version: "1.0.0"
        },
        channels: {
          'test-channel': {
            address: "test-channel",
          }
        },
        operations: {
          'test-operation': {
            action: "send",
            channel: { $ref: "#/channels/test-channel" },
            ...SINGLE_MESSAGE_USAGE,
          }
        },
        components: {
          messages: {
            'test-message': {
              ...COMPONENTS_WITH_MESSAGES.components.messages['test-message'],
              bindings: {
                kafka: {
                  key: {
                    type: "string",
                    description: "Message key"
                  },
                  schemaIdLocation: "payload",
                  schemaIdPayloadEncoding: 'apicurio-new',
                  bindingVersion: "0.5.0"
                }
              }
            }
          }
        },
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree?.root ?? null
      expect(messageNode).not.toBeNull()

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
      expect(messageSectionSelectorNode).toBeDefined()

      const sections = messageSectionSelectorNode?.nestedNodes() ?? []
      expect(sections.length).toBe(3)
      
      const contentSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT)
      const channelSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
      const operationSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_OPERATION)
      expect(contentSectionNode).toBeDefined()
      expect(channelSectionNode).toBeDefined()
      expect(operationSectionNode).toBeDefined()
      
      const messageBindingsNode = contentSectionNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.BINDINGS)
      expect(messageBindingsNode).toBeDefined()
      expect(messageBindingsNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)
      expect(messageBindingsNode!.key).toBe('bindings')

      const bindingNodes = messageBindingsNode!.nestedNodes()
      expect(bindingNodes.length).toBe(1)
      
      const bindingNode = bindingNodes.find(node => node.kind === AsyncApiTreeNodeKinds.BINDING && node.key === 'kafka')
      expect(bindingNode).toBeDefined()
      expect(bindingNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(bindingNode!.value()).toEqual({
        binding: {
          key: {
            type: "string",
            description: "Message key"
          },
          schemaIdLocation: "payload",
          schemaIdPayloadEncoding: 'apicurio-new',
        },
        version: '0.5.0',
        protocol: 'kafka',
      })
    })

    it('should handle message with two bindings', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "message-two-bindings-test",
          version: "1.0.0"
        },
        channels: {
          'test-channel': {
            address: "test-channel",
          }
        },
        operations: {
          'test-operation': {
            action: "send",
            channel: { $ref: "#/channels/test-channel" },
            ...SINGLE_MESSAGE_USAGE,
          }
        },
        components: {
          messages: {
            'test-message': {
              ...COMPONENTS_WITH_MESSAGES.components.messages['test-message'],
              bindings: {
                kafka: {
                  key: {
                    type: "string"
                  },
                  schemaIdLocation: "header",
                  bindingVersion: "0.5.0"
                },
                amqp: {
                  contentEncoding: "gzip",
                  messageType: "user.signup",
                  bindingVersion: "0.3.0"
                }
              }
            }
          }
        },
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree?.root ?? null
      expect(messageNode).not.toBeNull()

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
      expect(messageSectionSelectorNode).toBeDefined()

      const sections = messageSectionSelectorNode?.nestedNodes() ?? []
      expect(sections.length).toBe(3)
      
      const contentSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT)
      const channelSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
      const operationSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_OPERATION)
      expect(contentSectionNode).toBeDefined()
      expect(channelSectionNode).toBeDefined()
      expect(operationSectionNode).toBeDefined()
      
      const messageBindingsNode = contentSectionNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.BINDINGS)
      expect(messageBindingsNode).toBeDefined()
      expect(messageBindingsNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)
      expect(messageBindingsNode!.key).toBe('bindings')

      const bindingNodes = messageBindingsNode!.nestedNodes()
      expect(bindingNodes.length).toBe(2)

      const kafkaBindingNode = bindingNodes.find(node => node.kind === AsyncApiTreeNodeKinds.BINDING && node.key === 'kafka')
      expect(kafkaBindingNode).toBeDefined()
      expect(kafkaBindingNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(kafkaBindingNode!.value()).toEqual({
        binding: {
          key: {
            type: "string",
          },
          schemaIdLocation: "header",
        },
        version: '0.5.0',
        protocol: 'kafka',
      })

      const amqpBindingNode = bindingNodes.find(node => node.kind === AsyncApiTreeNodeKinds.BINDING && node.key === 'amqp')
      expect(amqpBindingNode).toBeDefined()
      expect(amqpBindingNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(amqpBindingNode!.value()).toEqual({
        binding: {
          contentEncoding: "gzip",
          messageType: "user.signup",
        },
        version: '0.3.0',
        protocol: 'amqp',
      })
    })
  })
})
