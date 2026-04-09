import { TreeNodeComplexityTypes } from "../src/model/abstract/tree/tree-node.interface"
import { AsyncApiTree } from "../src/model/async-api/tree/tree.impl"
import { AsyncApiTreeNodeKinds } from "../src/model/async-api/types/node-kind"
import { createAsyncApiTreeForTests } from "./helpers/create-async-api-tree-for-tests"
import { simplifyConsole } from "./helpers/simplify-console"

const COMPONENTS_WITH_MESSAGES = {
  components: {
    messages: {
      'test-message': {
        name: "TestMessage",
      }
    }
  }
}

const SINGLE_MESSAGE_USAGE = {
  messages: [
    { $ref: "#/components/messages/test-message" }
  ]
}

describe('Cases with channel', () => {
  simplifyConsole()

  describe('Single channel scenarios', () => {
    it('should handle operation with minimal channel (address only)', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "minimal-channel-test",
          version: "1.0.0"
        },
        channels: {
          'user-signup': {
            address: "user/signup"
          }
        },
        operations: {
          'user-signup-operation': {
            action: "send",
            channel: { $ref: "#/channels/user-signup" },
            ...SINGLE_MESSAGE_USAGE
          }
        },
        ...COMPONENTS_WITH_MESSAGES
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree!.root ?? null
      expect(messageNode).not.toBeNull()

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
      expect(messageSectionSelectorNode).toBeDefined()
      expect(messageSectionSelectorNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)

      const sections = messageSectionSelectorNode!.nestedNodes()
      expect(sections.length).toBe(3)

      const contentSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT)
      const channelSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
      const operationSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_OPERATION)
      expect(contentSectionNode).toBeDefined()
      expect(channelSectionNode).toBeDefined()
      expect(operationSectionNode).toBeDefined()

      expect(channelSectionNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(channelSectionNode!.key).toBe('user-signup')
    })

    it('should handle channel with title', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "channel-with-title-test",
          version: "1.0.0"
        },
        channels: {
          'user-events': {
            address: "user/events",
            title: "User Events Channel"
          }
        },
        operations: {
          'user-events-operation': {
            action: "send",
            channel: { $ref: "#/channels/user-events" },
            ...SINGLE_MESSAGE_USAGE
          }
        },
        ...COMPONENTS_WITH_MESSAGES
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree!.root ?? null
      expect(messageNode).not.toBeNull()

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
      expect(messageSectionSelectorNode).toBeDefined()
      expect(messageSectionSelectorNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)

      const sections = messageSectionSelectorNode!.nestedNodes()
      expect(sections.length).toBe(3)

      const contentSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT)
      const channelSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
      const operationSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_OPERATION)
      expect(contentSectionNode).toBeDefined()
      expect(channelSectionNode).toBeDefined()
      expect(operationSectionNode).toBeDefined()

      expect(channelSectionNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(channelSectionNode!.key).toBe('user-events')
      expect(channelSectionNode!.value()).toEqual({
        title: "User Events Channel"
      })
    })

    it('should handle channel with title and description', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "channel-with-title-description-test",
          version: "1.0.0"
        },
        channels: {
          'order-channel': {
            address: "orders",
            title: "Order Processing Channel",
            description: "Channel for handling order-related events and messages"
          }
        },
        operations: {
          'order-operation': {
            action: "send",
            channel: { $ref: "#/channels/order-channel" },
            ...SINGLE_MESSAGE_USAGE
          }
        },
        ...COMPONENTS_WITH_MESSAGES
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree!.root ?? null
      expect(messageNode).not.toBeNull()

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
      expect(messageSectionSelectorNode).toBeDefined()
      expect(messageSectionSelectorNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)

      const sections = messageSectionSelectorNode!.nestedNodes()
      expect(sections.length).toBe(3)

      const contentSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT)
      const channelSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
      const operationSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_OPERATION)
      expect(contentSectionNode).toBeDefined()
      expect(channelSectionNode).toBeDefined()
      expect(operationSectionNode).toBeDefined()

      expect(channelSectionNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(channelSectionNode!.key).toBe('order-channel')
      expect(channelSectionNode!.value()).toEqual({
        title: "Order Processing Channel",
        description: "Channel for handling order-related events and messages"
      })
    })

    it('should handle channel with summary field', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "channel-with-summary-test",
          version: "1.0.0"
        },
        channels: {
          'payment-channel': {
            address: "payments",
            title: "Payment Channel",
            summary: "Brief summary of payment channel",
            description: "Detailed description of payment processing channel"
          }
        },
        operations: {
          'payment-operation': {
            action: "receive",
            channel: { $ref: "#/channels/payment-channel" },
            ...SINGLE_MESSAGE_USAGE
          }
        },
        ...COMPONENTS_WITH_MESSAGES
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree!.root ?? null
      expect(messageNode).not.toBeNull()

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
      expect(messageSectionSelectorNode).toBeDefined()
      expect(messageSectionSelectorNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)

      const sections = messageSectionSelectorNode!.nestedNodes()
      expect(sections.length).toBe(3)

      const contentSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT)
      const channelSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
      const operationSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_OPERATION)
      expect(contentSectionNode).toBeDefined()
      expect(channelSectionNode).toBeDefined()
      expect(operationSectionNode).toBeDefined()

      expect(channelSectionNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(channelSectionNode!.key).toBe('payment-channel')
      expect(channelSectionNode!.value()).toEqual({
        title: "Payment Channel",
        summary: "Brief summary of payment channel",
        description: "Detailed description of payment processing channel"
      })
    })

    it('should handle channel with bindings', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "channel-with-bindings-test",
          version: "1.0.0"
        },
        channels: {
          'kafka-channel': {
            address: "kafka-topic",
            title: "Kafka Channel",
            bindings: {
              kafka: {
                topic: "user-events",
                partitions: 3,
                replicas: 2,
                bindingVersion: "0.5.0"
              }
            }
          }
        },
        operations: {
          'kafka-operation': {
            action: "send",
            channel: { $ref: "#/channels/kafka-channel" },
            ...SINGLE_MESSAGE_USAGE
          }
        },
        ...COMPONENTS_WITH_MESSAGES
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree!.root ?? null
      expect(messageNode).not.toBeNull()

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
      expect(messageSectionSelectorNode).toBeDefined()
      expect(messageSectionSelectorNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)

      const sections = messageSectionSelectorNode!.nestedNodes()
      expect(sections.length).toBe(3)

      const contentSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT)
      const channelSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
      const operationSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_OPERATION)
      expect(contentSectionNode).toBeDefined()
      expect(channelSectionNode).toBeDefined()
      expect(operationSectionNode).toBeDefined()

      expect(channelSectionNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(channelSectionNode!.key).toBe('kafka-channel')
      expect(channelSectionNode!.value()).toEqual({
        title: "Kafka Channel",
      })

      const bindingsNode = channelSectionNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.BINDINGS)
      expect(bindingsNode).toBeDefined()
      expect(bindingsNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)

      const bindingNodes = bindingsNode!.nestedNodes()
      expect(bindingNodes.length).toBe(1)
      expect(bindingNodes[0].kind).toBe(AsyncApiTreeNodeKinds.BINDING)
      expect(bindingNodes[0].key).toBe('kafka')
      expect(bindingNodes[0].value()).toEqual({
        binding: {
          topic: "user-events",
          partitions: 3,
          replicas: 2,
        },
        version: "0.5.0",
        protocol: "kafka",
      })
    })

    it('should handle channel with parameters', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "channel-with-parameters-test",
          version: "1.0.0"
        },
        channels: {
          'user-channel': {
            address: "user/events",
            title: "User Events Channel",
            parameters: {
              userId: {
                description: "User identifier",
                default: "testUser001",
                examples: ["testUser001", "testUser002", "testUser003"],
                location: "$user.id"
              }
            }
          }
        },
        operations: {
          'user-operation': {
            action: "send",
            channel: { $ref: "#/channels/user-channel" },
            ...SINGLE_MESSAGE_USAGE
          }
        },
        ...COMPONENTS_WITH_MESSAGES
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree!.root ?? null
      expect(messageNode).not.toBeNull()

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
      expect(messageSectionSelectorNode).toBeDefined()
      expect(messageSectionSelectorNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)

      const sections = messageSectionSelectorNode!.nestedNodes()
      expect(sections.length).toBe(3)

      const contentSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT)
      const channelSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
      const operationSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_OPERATION)
      expect(contentSectionNode).toBeDefined()
      expect(channelSectionNode).toBeDefined()
      expect(operationSectionNode).toBeDefined()

      expect(channelSectionNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(channelSectionNode!.key).toBe('user-channel')
      expect(channelSectionNode!.value()).toEqual({
        title: "User Events Channel",
      })

      const parametersNode = channelSectionNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS)
      expect(parametersNode).toBeDefined()
      expect(parametersNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(parametersNode!.value()).toEqual({
        rawValues: {
          userId: {
            type: 'string',
            description: "User identifier",
            default: "testUser001",
            examples: ["testUser001", "testUser002", "testUser003"],
            location: "$user.id"
          }
        }
      })
    })

    it('should handle channel with server (only host, protocol)', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "channel-with-servers-test",
          version: "1.0.0"
        },
        servers: {
          server1: {
            host: "server1.com",
            protocol: "https"
          }
        },
        channels: {
          'server-channel': {
            address: "server/events",
            title: "Server Events Channel",
            servers: [
              { $ref: "#/servers/server1" }
            ]
          }
        },
        operations: {
          'server-operation': {
            action: "send",
            channel: { $ref: "#/channels/server-channel" },
            ...SINGLE_MESSAGE_USAGE,
          }
        },
        ...COMPONENTS_WITH_MESSAGES
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree!.root ?? null
      expect(messageNode).not.toBeNull()

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
      expect(messageSectionSelectorNode).toBeDefined()
      expect(messageSectionSelectorNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)

      const sections = messageSectionSelectorNode!.nestedNodes()
      expect(sections.length).toBe(3)

      const channelSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
      expect(channelSectionNode).toBeDefined()
      
      const channelChildrenNodes = channelSectionNode!.childrenNodes()
      expect(channelChildrenNodes.length).toBe(1)

      const serversNode = channelChildrenNodes.find(node => node.kind === AsyncApiTreeNodeKinds.SERVERS)
      expect(serversNode).toBeDefined()
      expect(serversNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(serversNode!.key).toBe('servers')

      const serverNodes = serversNode!.childrenNodes()
      expect(serverNodes.length).toBe(1)

      const serverNode = serverNodes.find(node => node.kind === AsyncApiTreeNodeKinds.SERVER)
      expect(serverNode).toBeDefined()
      expect(serverNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(serverNode!.key).toBe('server1')
      expect(serverNode!.value()).toEqual({
        title: 'server1',
        host: "server1.com",
        protocol: "https"
      })
    })

    it('should handle channel with server (host, protocol, title, description, summary)', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "channel-with-servers-test",
          version: "1.0.0"
        },
        servers: {
          server1: {
            title: "Server 1",
            description: "Server 1 description",
            summary: "Server 1 summary",
            host: "server1.com",
            protocol: "https"
          }
        },
        channels: {
          'server-channel': {
            address: "server/events",
            title: "Server Events Channel",
            servers: [
              { $ref: "#/servers/server1" }
            ]
          }
        },
        operations: {
          'server-operation': {
            action: "send",
            channel: { $ref: "#/channels/server-channel" },
            ...SINGLE_MESSAGE_USAGE,
          }
        },
        ...COMPONENTS_WITH_MESSAGES
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree!.root ?? null
      expect(messageNode).not.toBeNull()

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
      expect(messageSectionSelectorNode).toBeDefined()
      expect(messageSectionSelectorNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)

      const sections = messageSectionSelectorNode!.nestedNodes()
      expect(sections.length).toBe(3)

      const channelSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
      expect(channelSectionNode).toBeDefined()
      
      const channelChildrenNodes = channelSectionNode!.childrenNodes()
      expect(channelChildrenNodes.length).toBe(1)

      const serversNode = channelChildrenNodes.find(node => node.kind === AsyncApiTreeNodeKinds.SERVERS)
      expect(serversNode).toBeDefined()
      expect(serversNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(serversNode!.key).toBe('servers')

      const serverNodes = serversNode!.childrenNodes()
      expect(serverNodes.length).toBe(1)

      const serverNode = serverNodes.find(node => node.kind === AsyncApiTreeNodeKinds.SERVER)
      expect(serverNode).toBeDefined()
      expect(serverNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(serverNode!.key).toBe('server1')
      expect(serverNode!.value()).toEqual({
        title: 'Server 1',
        description: "Server 1 description",
        summary: "Server 1 summary",
        host: "server1.com",
        protocol: "https"
      })
    })

    it('should handle channel with server (host, protocol, bindings)', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "channel-with-servers-test",
          version: "1.0.0"
        },
        servers: {
          server1: {
            host: "server1.com",
            protocol: "https",
            bindings: {
              kafka: {
                topic: "server-events",
                partitions: 3,
                replicas: 2,
                bindingVersion: "0.5.0"
              }
            }
          }
        },
        channels: {
          'server-channel': {
            address: "server/events",
            title: "Server Events Channel",
            servers: [
              { $ref: "#/servers/server1" }
            ]
          }
        },
        operations: {
          'server-operation': {
            action: "send",
            channel: { $ref: "#/channels/server-channel" },
            ...SINGLE_MESSAGE_USAGE,
          }
        },
        ...COMPONENTS_WITH_MESSAGES
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree!.root ?? null
      expect(messageNode).not.toBeNull()

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
      expect(messageSectionSelectorNode).toBeDefined()
      expect(messageSectionSelectorNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)

      const sections = messageSectionSelectorNode!.nestedNodes()
      expect(sections.length).toBe(3)

      const channelSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
      expect(channelSectionNode).toBeDefined()
      
      const channelChildrenNodes = channelSectionNode!.childrenNodes()
      expect(channelChildrenNodes.length).toBe(1)

      const serversNode = channelChildrenNodes.find(node => node.kind === AsyncApiTreeNodeKinds.SERVERS)
      expect(serversNode).toBeDefined()
      expect(serversNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(serversNode!.key).toBe('servers')

      const serverNodes = serversNode!.childrenNodes()
      expect(serverNodes.length).toBe(1)

      const serverNode = serverNodes.find(node => node.kind === AsyncApiTreeNodeKinds.SERVER)
      expect(serverNode).toBeDefined()
      expect(serverNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(serverNode!.key).toBe('server1')
      expect(serverNode!.value()).toEqual({
        title: 'server1',
        host: "server1.com",
        protocol: "https"
      })

      const bindingsNode = serverNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.BINDINGS)
      expect(bindingsNode).toBeDefined()
      expect(bindingsNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)
      expect(bindingsNode!.key).toBe('bindings')

      const bindingNodes = bindingsNode!.nestedNodes()
      expect(bindingNodes.length).toBe(1)
      expect(bindingNodes[0].kind).toBe(AsyncApiTreeNodeKinds.BINDING)
      expect(bindingNodes[0].key).toBe('kafka')
      expect(bindingNodes[0].value()).toEqual({
        binding: {
          topic: "server-events",
          partitions: 3,
          replicas: 2,
        },
        version: "0.5.0",
        protocol: "kafka",
      })
    })

    it('should handle channel with all fields combined', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "channel-complete-test",
          version: "1.0.0"
        },
        channels: {
          'complete-channel': {
            address: "tenant/{tenantId}/complete",
            title: "Complete Channel",
            summary: "A channel with all possible fields",
            description: "This channel demonstrates all possible channel fields in AsyncAPI 3.0",
            parameters: {
              tenantId: {
                description: "Tenant identifier",
                default: "testTenant001",
                examples: ["testTenant001", "testTenant002", "testTenant003"],
                location: "$tenant.id"
              }
            },
            messages: {
              CompleteMessage: {
                name: "CompleteMessage",
                title: "Complete Message"
              }
            },
            tags: [
              {
                name: "complete",
                description: "Complete functionality"
              }
            ],
            externalDocs: {
              description: "More information",
              url: "https://example.com/complete-docs"
            },
            bindings: {
              kafka: {
                topic: "complete-topic",
                partitions: 5,
                replicas: 3,
                bindingVersion: "0.5.0"
              }
            }
          }
        },
        operations: {
          'complete-operation': {
            action: "send",
            channel: { $ref: "#/channels/complete-channel" },
            ...SINGLE_MESSAGE_USAGE
          }
        },
        ...COMPONENTS_WITH_MESSAGES
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree!.root ?? null
      expect(messageNode).not.toBeNull()

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
      expect(messageSectionSelectorNode).toBeDefined()
      expect(messageSectionSelectorNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)

      const sections = messageSectionSelectorNode!.nestedNodes()
      expect(sections.length).toBe(3)

      const contentSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT)
      const channelSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
      const operationSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_OPERATION)
      expect(contentSectionNode).toBeDefined()
      expect(channelSectionNode).toBeDefined()
      expect(operationSectionNode).toBeDefined()

      expect(channelSectionNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(channelSectionNode!.key).toBe('complete-channel')
      expect(channelSectionNode!.value()).toEqual({
        title: "Complete Channel",
        summary: "A channel with all possible fields",
        description: "This channel demonstrates all possible channel fields in AsyncAPI 3.0",
      })

      const channelChildrenNodes = channelSectionNode!.childrenNodes()
      expect(channelChildrenNodes.length).toBe(2)

      const bindingsNode = channelChildrenNodes.find(node => node.kind === AsyncApiTreeNodeKinds.BINDINGS)
      expect(bindingsNode).toBeDefined()
      expect(bindingsNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)

      const bindingNodes = bindingsNode!.nestedNodes()
      expect(bindingNodes.length).toBe(1)
      expect(bindingNodes[0].kind).toBe(AsyncApiTreeNodeKinds.BINDING)
      expect(bindingNodes[0].key).toBe('kafka')
      expect(bindingNodes[0].value()).toEqual({
        binding: {
          topic: "complete-topic",
          partitions: 5,
          replicas: 3,
        },
        version: "0.5.0",
        protocol: "kafka",
      })

      const parametersNode = channelChildrenNodes.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS)
      expect(parametersNode).toBeDefined()
      expect(parametersNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(parametersNode!.value()).toEqual({
        rawValues: {
          tenantId: {
            type: 'string',
            description: "Tenant identifier",
            default: "testTenant001",
            examples: ["testTenant001", "testTenant002", "testTenant003"],
            location: "$tenant.id"
          }
        }
      })
    })
  })

  describe('Channel Extensions', () => {
    it('should handle channel with extensions', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "channel-with-extensions-test",
          version: "1.0.0"
        },
        channels: {
          'test-channel': {
            address: "test-channel",
            'x-first': "first",
            'x-second': {
              a: 1,
              b: '2',
              c: true,
              d: [1, 2, 3],
              e: {
                f: 'g',
                h: 4,
                i: false,
                j: [4, 5, 6],
              }
            }
          }
        },
        operations: {
          'test-operation': {
            action: "send",
            channel: { $ref: "#/channels/test-channel" },
            ...SINGLE_MESSAGE_USAGE
          }
        },
        ...COMPONENTS_WITH_MESSAGES
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree!.root ?? null
      expect(messageNode).not.toBeNull()

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
      expect(messageSectionSelectorNode).toBeDefined()
      expect(messageSectionSelectorNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)

      const sections = messageSectionSelectorNode!.nestedNodes()
      expect(sections.length).toBe(3)

      const channelSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
      expect(channelSectionNode).toBeDefined()
      expect(channelSectionNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(channelSectionNode!.key).toBe('test-channel')
      expect(channelSectionNode!.value()).toEqual({})

      const channelChildrenNodes = channelSectionNode!.childrenNodes()
      expect(channelChildrenNodes.length).toBe(1)

      const extensionsNode = channelChildrenNodes.find(node => node.kind === AsyncApiTreeNodeKinds.EXTENSIONS)
      expect(extensionsNode).toBeDefined()
      expect(extensionsNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(extensionsNode!.value()).toEqual({
        rawValues: {
          'x-first': "first",
          'x-second': {
            a: 1,
            b: '2',
            c: true,
            d: [1, 2, 3],
            e: {
              f: 'g',
              h: 4,
              i: false,
              j: [4, 5, 6],
            }
          }
        }
      })
    })
  })

  describe('Channels in different operation actions', () => {
    it('should handle channel in receive operation', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "channel-receive-operation-test",
          version: "1.0.0"
        },
        channels: {
          'receive-channel': {
            address: "receive/events",
            title: "Receive Channel",
            description: "Channel for receiving events"
          }
        },
        operations: {
          'receive-operation': {
            action: "receive",
            channel: { $ref: "#/channels/receive-channel" },
            ...SINGLE_MESSAGE_USAGE
          }
        },
        ...COMPONENTS_WITH_MESSAGES
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree!.root ?? null
      expect(messageNode).not.toBeNull()

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
      expect(messageSectionSelectorNode).toBeDefined()
      expect(messageSectionSelectorNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)

      const sections = messageSectionSelectorNode!.nestedNodes()
      expect(sections.length).toBe(3)

      const contentSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT)
      const channelSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
      const operationSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_OPERATION)
      expect(contentSectionNode).toBeDefined()
      expect(channelSectionNode).toBeDefined()
      expect(operationSectionNode).toBeDefined()

      expect(channelSectionNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(channelSectionNode!.key).toBe('receive-channel')
      expect(channelSectionNode!.value()).toEqual({
        title: "Receive Channel",
        description: "Channel for receiving events"
      })
    })

    it('should handle same channel in multiple operations', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "channel-multiple-operations-test",
          version: "1.0.0"
        },
        channels: {
          'shared-channel': {
            address: "shared/channel",
            title: "Shared Channel",
            description: "Channel used by multiple operations"
          }
        },
        operations: {
          'send-operation': {
            action: "send",
            channel: { $ref: "#/channels/shared-channel" },
            ...SINGLE_MESSAGE_USAGE
          },
          'receive-operation': {
            action: "receive",
            channel: { $ref: "#/channels/shared-channel" },
            ...SINGLE_MESSAGE_USAGE
          }
        },
        ...COMPONENTS_WITH_MESSAGES
      }

      function test(tree: AsyncApiTree | null) {
        const messageNode = tree!.root ?? null
        expect(messageNode).not.toBeNull()

        const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
        expect(messageSectionSelectorNode).toBeDefined()
        expect(messageSectionSelectorNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)

        const sections = messageSectionSelectorNode!.nestedNodes()
        expect(sections.length).toBe(3)

        const contentSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT)
        const channelSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
        const operationSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_OPERATION)
        expect(contentSectionNode).toBeDefined()
        expect(channelSectionNode).toBeDefined()
        expect(operationSectionNode).toBeDefined()

        expect(channelSectionNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
        expect(channelSectionNode!.key).toBe('shared-channel')
        expect(channelSectionNode!.value()).toEqual({
          title: "Shared Channel",
          description: "Channel used by multiple operations"
        })
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()
      test(tree)

      const treeWithSpecificOperation = createAsyncApiTreeForTests(asyncApiSource, {
        operationKey: 'receive-operation',
        operationType: 'receive',
        messageKey: 'test-message',
      })
      expect(treeWithSpecificOperation).toBeDefined()
      test(treeWithSpecificOperation)
    })
  })

  describe('Edge cases and special scenarios', () => {
    it('should handle channel with null address', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "channel-null-address-test",
          version: "1.0.0"
        },
        channels: {
          'null-address-channel': {
            address: null,
            title: "Null Address Channel",
            description: "Channel with null address"
          }
        },
        operations: {
          'null-address-operation': {
            action: "send",
            channel: { $ref: "#/channels/null-address-channel" },
            ...SINGLE_MESSAGE_USAGE
          }
        },
        ...COMPONENTS_WITH_MESSAGES
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree!.root ?? null
      expect(messageNode).not.toBeNull()

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
      expect(messageSectionSelectorNode).toBeDefined()
      expect(messageSectionSelectorNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)

      const sections = messageSectionSelectorNode!.nestedNodes()
      expect(sections.length).toBe(3)

      const contentSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT)
      const channelSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
      const operationSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_OPERATION)
      expect(contentSectionNode).toBeDefined()
      expect(channelSectionNode).toBeDefined()
      expect(operationSectionNode).toBeDefined()

      expect(channelSectionNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(channelSectionNode!.key).toBe('null-address-channel')
      expect(channelSectionNode!.value()).toEqual({
        title: "Null Address Channel",
        description: "Channel with null address"
      })

      expect(messageNode!.value()).toMatchObject({
        action: 'send',
        address: '<address unknown>'
      })
    })
  })
})
