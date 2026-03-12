import { TreeNodeComplexityTypes } from "../src/model/abstract/tree/tree-node.interface"
import { AsyncApiTreeNodeKinds } from "../src/model/async-api/types/node-kind"
import { createAsyncApiTreeForTests } from "./helpers/create-async-api-tree-for-tests"
import { simplifyConsole } from "./helpers/simplify-console"

describe('Cases with operation messages', () => {
  simplifyConsole()

  describe('Single message scenarios', () => {
    it('should handle operation with single message (minimal fields)', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "minimal-message-test",
          version: "1.0.0"
        },
        channels: {
          'test-channel': {
            address: "test-channel",
            messages: {
              TestMessage: { $ref: "#/components/messages/TestMessage" }
            }
          }
        },
        components: {
          messages: {
            TestMessage: {
              name: "TestMessage"
            }
          }
        },
        operations: {
          'test-operation': {
            action: "send",
            channel: { $ref: "#/channels/test-channel" },
            messages: [
              { $ref: "#/channels/test-channel/messages/TestMessage" }
            ]
          }
        }
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree?.root ?? null
      expect(messageNode).not.toBeNull()

      expect(messageNode!.value()).toEqual({
        internalTitle: "TestMessage",
        action: "send",
        address: "test-channel",
      })

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR) ?? null
      expect(messageSectionSelectorNode).not.toBeNull()

      const sectionNodes = messageSectionSelectorNode!.nestedNodes()
      expect(sectionNodes.length).toBe(3)
      expect(messageSectionSelectorNode!.childrenNodes().length).toBe(0) // no children

      const contentSectionNode = sectionNodes.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT) ?? null
      expect(contentSectionNode).not.toBeNull()
      expect(contentSectionNode!.value()).toBeNull()
    })

    it('should handle message with title and description', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "message-with-title-description-test",
          version: "1.0.0"
        },
        channels: {
          'test-channel': {
            address: "test-channel",
            messages: {
              UserCreatedMessage: { $ref: "#/components/messages/UserCreatedMessage" }
            }
          }
        },
        components: {
          messages: {
            UserCreatedMessage: {
              title: "User Created Event",
              description: "Event triggered when a new user is created"
            }
          }
        },
        operations: {
          'user-created-operation': {
            action: "send",
            channel: { $ref: "#/channels/test-channel" },
            messages: [
              { $ref: "#/channels/test-channel/messages/UserCreatedMessage" }
            ]
          }
        }
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree?.root ?? null
      expect(messageNode).not.toBeNull()

      expect(messageNode!.value()).toEqual({
        title: "User Created Event",
        description: "Event triggered when a new user is created",
        action: "send",
        address: "test-channel",
      })

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR) ?? null
      expect(messageSectionSelectorNode).not.toBeNull()

      const sectionNodes = messageSectionSelectorNode!.nestedNodes()
      expect(sectionNodes.length).toBe(3)
      expect(messageSectionSelectorNode!.childrenNodes().length).toBe(0) // no children

      const contentSectionNode = sectionNodes.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT) ?? null
      expect(contentSectionNode).not.toBeNull()
      expect(contentSectionNode!.value()).toBeNull()
    })

    it('should handle message with summary field', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "message-with-summary-test",
          version: "1.0.0"
        },
        channels: {
          'test-channel': {
            address: "test-channel",
            messages: {
              OrderMessage: { $ref: "#/components/messages/OrderMessage" }
            }
          }
        },
        components: {
          messages: {
            OrderMessage: {
              summary: "Summary of order event",
            }
          }
        },
        operations: {
          'order-operation': {
            action: "send",
            channel: { $ref: "#/channels/test-channel" },
            messages: [
              { $ref: "#/channels/test-channel/messages/OrderMessage" }
            ]
          }
        }
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree?.root ?? null
      expect(messageNode).not.toBeNull()

      expect(messageNode!.value()).toEqual({
        summary: "Summary of order event",
        action: "send",
        address: "test-channel",
      })

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR) ?? null
      expect(messageSectionSelectorNode).not.toBeNull()

      const sectionNodes = messageSectionSelectorNode!.nestedNodes()
      expect(sectionNodes.length).toBe(3)
      expect(messageSectionSelectorNode!.childrenNodes().length).toBe(0) // no children

      const contentSectionNode = sectionNodes.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT) ?? null
      expect(contentSectionNode).not.toBeNull()
      expect(contentSectionNode!.value()).toBeNull()
    })

    it('should handle message with headers', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "message-with-headers-test",
          version: "1.0.0"
        },
        channels: {
          'test-channel': {
            address: "test-channel",
            messages: {
              MessageWithHeaders: { $ref: "#/components/messages/MessageWithHeaders" }
            }
          }
        },
        components: {
          schemas: {
            MessageHeaders: {
              type: "object",
              properties: {
                'X-Correlation-Id': {
                  type: "string",
                  description: "Correlation identifier"
                },
                'X-Request-Id': {
                  type: "string",
                  description: "Request identifier"
                }
              }
            }
          },
          messages: {
            MessageWithHeaders: {
              name: "MessageWithHeaders",
              headers: { $ref: "#/components/schemas/MessageHeaders" }
            }
          }
        },
        operations: {
          'headers-operation': {
            action: "send",
            channel: { $ref: "#/channels/test-channel" },
            messages: [
              { $ref: "#/channels/test-channel/messages/MessageWithHeaders" }
            ]
          }
        }
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree?.root ?? null
      expect(messageNode).not.toBeNull()

      expect(messageNode!.value()).toEqual({
        internalTitle: "MessageWithHeaders",
        action: "send",
        address: "test-channel",
      })

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR) ?? null
      expect(messageSectionSelectorNode).not.toBeNull()

      const sectionNodes = messageSectionSelectorNode!.nestedNodes()
      expect(sectionNodes.length).toBe(3)

      const contentSectionNode = sectionNodes.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT) ?? null
      expect(contentSectionNode).not.toBeNull()
      expect(contentSectionNode!.value()).toBeNull()

      const contentSectionChildrenNodes = contentSectionNode!.childrenNodes()
      expect(contentSectionChildrenNodes.length).toBe(1)
      const headersNode = contentSectionChildrenNodes.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_HEADERS) ?? null
      expect(headersNode).not.toBeNull()
      expect(headersNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(headersNode!.key).toBe('headers')
      expect(headersNode!.kind).toBe(AsyncApiTreeNodeKinds.MESSAGE_HEADERS)
      expect(headersNode!.value()).toEqual({
        schema: {
          type: "object",
          properties: {
            'X-Correlation-Id': {
              type: "string",
              description: "Correlation identifier"
            },
            'X-Request-Id': {
              type: "string",
              description: "Request identifier"
            }
          }
        },
        schemaFormat: null,
      })
    })

    it('should handle message with payload', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "message-with-payload-test",
          version: "1.0.0"
        },
        channels: {
          'test-channel': {
            address: "test-channel",
            messages: {
              MessageWithPayload: { $ref: "#/components/messages/MessageWithPayload" }
            }
          }
        },
        components: {
          schemas: {
            UserPayload: {
              type: "object",
              properties: {
                userId: {
                  type: "string"
                },
                userName: {
                  type: "string"
                },
                email: {
                  type: "string"
                }
              },
              required: ["userId", "userName"]
            }
          },
          messages: {
            MessageWithPayload: {
              name: "MessageWithPayload",
              payload: {
                schemaFormat: "application/vnd.aai.asyncapi+json;version=3.0.0",
                schema: { $ref: "#/components/schemas/UserPayload" }
              }
            }
          }
        },
        operations: {
          'payload-operation': {
            action: "send",
            channel: { $ref: "#/channels/test-channel" },
            messages: [
              { $ref: "#/channels/test-channel/messages/MessageWithPayload" }
            ]
          }
        }
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree?.root ?? null
      expect(messageNode).not.toBeNull()

      expect(messageNode!.value()).toEqual({
        internalTitle: "MessageWithPayload",
        action: "send",
        address: "test-channel",
      })

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR) ?? null
      expect(messageSectionSelectorNode).not.toBeNull()

      const sectionNodes = messageSectionSelectorNode!.nestedNodes()
      expect(sectionNodes.length).toBe(3)

      const contentSectionNode = sectionNodes.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT) ?? null
      expect(contentSectionNode).not.toBeNull()
      expect(contentSectionNode!.value()).toBeNull()

      const contentSectionChildrenNodes = contentSectionNode!.childrenNodes()
      expect(contentSectionChildrenNodes.length).toBe(1)
      const payloadNode = contentSectionChildrenNodes.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD) ?? null
      expect(payloadNode).not.toBeNull()
      expect(payloadNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(payloadNode!.key).toBe('payload')
      expect(payloadNode!.kind).toBe(AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD)
      expect(payloadNode!.value()).toEqual({
        schemaFormat: null,
        schema: {
          type: "object",
          properties: {
            userId: {
              type: "string"
            },
            userName: {
              type: "string"
            },
            email: {
              type: "string"
            }
          },
          required: ["userId", "userName"]
        },
      })
    })

    it('should handle message with all fields combined', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "message-complete-test",
          version: "1.0.0"
        },
        channels: {
          'test-channel': {
            address: "test-channel",
            messages: {
              CompleteMessage: { $ref: "#/components/messages/CompleteMessage" }
            }
          }
        },
        components: {
          schemas: {
            CompleteHeaders: {
              type: "object",
              properties: {
                'X-Trace-Id': {
                  type: "string"
                }
              }
            },
            CompletePayload: {
              type: "object",
              properties: {
                eventId: {
                  type: "string"
                },
                eventType: {
                  type: "string"
                },
                timestamp: {
                  type: "string",
                  format: "date-time"
                }
              }
            }
          },
          messages: {
            CompleteMessage: {
              name: "CompleteMessage",
              title: "Complete Message",
              summary: "A complete message with all fields",
              description: "This message demonstrates all possible fields",
              headers: { $ref: "#/components/schemas/CompleteHeaders" },
              payload: {
                schemaFormat: "application/vnd.aai.asyncapi+json;version=3.0.0",
                schema: { $ref: "#/components/schemas/CompletePayload" }
              },
              bindings: {
                kafka: {
                  bindingVersion: "0.5.0"
                }
              }
            }
          }
        },
        operations: {
          'complete-operation': {
            action: "send",
            channel: { $ref: "#/channels/test-channel" },
            messages: [
              { $ref: "#/channels/test-channel/messages/CompleteMessage" }
            ]
          }
        }
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree?.root ?? null
      expect(messageNode).not.toBeNull()

      expect(messageNode!.value()).toEqual({
        internalTitle: "CompleteMessage",
        title: "Complete Message",
        summary: "A complete message with all fields",
        description: "This message demonstrates all possible fields",
        action: "send",
        address: "test-channel",
      })

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR) ?? null
      expect(messageSectionSelectorNode).not.toBeNull()

      const sectionNodes = messageSectionSelectorNode!.nestedNodes()
      expect(sectionNodes.length).toBe(3)

      const contentSectionNode = sectionNodes.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT) ?? null
      expect(contentSectionNode).not.toBeNull()
      expect(contentSectionNode!.value()).toBeNull()

      const contentSectionChildrenNodes = contentSectionNode!.childrenNodes()
      expect(contentSectionChildrenNodes.length).toBe(3)

      const headersNode = contentSectionChildrenNodes.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_HEADERS) ?? null
      expect(headersNode).not.toBeNull()
      expect(headersNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(headersNode!.key).toBe('headers')
      expect(headersNode!.kind).toBe(AsyncApiTreeNodeKinds.MESSAGE_HEADERS)
      expect(headersNode!.value()).toEqual({
        schema: {
          type: "object",
          properties: {
            'X-Trace-Id': {
              type: "string"
            }
          }
        },
        schemaFormat: null,
      })

      const payloadNode = contentSectionChildrenNodes.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD) ?? null
      expect(payloadNode).not.toBeNull()
      expect(payloadNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(payloadNode!.key).toBe('payload')
      expect(payloadNode!.kind).toBe(AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD)
      expect(payloadNode!.value()).toEqual({
        schemaFormat: null,
        schema: {
          type: "object",
          properties: {
            eventId: {
              type: "string"
            },
            eventType: {
              type: "string"
            },
            timestamp: {
              type: "string",
              format: "date-time"
            }
          }
        },
      })

      const bindingsNode = contentSectionChildrenNodes.find(node => node.kind === AsyncApiTreeNodeKinds.BINDINGS) ?? null
      expect(bindingsNode).not.toBeNull()
      expect(bindingsNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)

      const bindingNodes = bindingsNode!.nestedNodes()
      expect(bindingNodes.length).toBe(1)
      const bindingNode = bindingNodes.find(node => node.kind === AsyncApiTreeNodeKinds.BINDING) ?? null
      expect(bindingNode).not.toBeNull()
      expect(bindingNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(bindingNode!.key).toBe('kafka')
      expect(bindingNode!.value()).toEqual({
        binding: {},
        version: "0.5.0",
        protocol: "kafka",
      })
    })

    it('should handle messages in receive operation', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "receive-operation-test",
          version: "1.0.0"
        },
        channels: {
          "test-channel": {
            address: "test-channel",
            messages: {
              ReceiveMessage: { $ref: "#/components/messages/ReceiveMessage" }
            }
          }
        },
        components: {
          messages: {
            ReceiveMessage: {
              name: "ReceiveMessage",
            }
          }
        },
        operations: {
          "receive-operation": {
            action: "receive",
            channel: { $ref: "#/channels/test-channel" },
            messages: [
              { $ref: "#/channels/test-channel/messages/ReceiveMessage" }
            ]
          }
        }
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree?.root ?? null
      expect(messageNode).not.toBeNull()
      expect(messageNode!.value()).toEqual({
        internalTitle: "ReceiveMessage",
        action: "receive",
        address: "test-channel",
      })
    })
  })

  describe('Multiple messages scenarios', () => {
    it('should handle operation with two messages', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "two-messages-test",
          version: "1.0.0"
        },
        channels: {
          'test-channel': {
            address: "test-channel",
          }
        },
        operations: {
          'multi-message-operation': {
            action: "send",
            channel: { $ref: "#/channels/test-channel" },
            messages: [
              { $ref: "#/components/messages/FirstMessage" },
              { $ref: "#/components/messages/SecondMessage" }
            ]
          }
        },
        components: {
          messages: {
            FirstMessage: {
              name: "FirstMessage",
            },
            SecondMessage: {
              name: "SecondMessage",
            }
          }
        },
      }

      const treeWithFirstMessage = createAsyncApiTreeForTests(asyncApiSource)
      expect(treeWithFirstMessage).toBeDefined()
      const firstMessageNode = treeWithFirstMessage?.root ?? null
      expect(firstMessageNode).not.toBeNull()
      expect(firstMessageNode!.value()).toEqual({
        internalTitle: "FirstMessage",
        action: "send",
        address: "test-channel",
      })

      const treeWithSecondMessage = createAsyncApiTreeForTests(asyncApiSource, {
        messageKey: "SecondMessage",
        operationKey: "multi-message-operation",
        operationType: "send",
      })
      expect(treeWithSecondMessage).toBeDefined()
      const secondMessageNode = treeWithSecondMessage?.root ?? null
      expect(secondMessageNode).not.toBeNull()
      expect(secondMessageNode!.value()).toEqual({
        internalTitle: "SecondMessage",
        action: "send",
        address: "test-channel",
      })
    })
  })

  describe('Message Extensions', () => {
    it('should handle message with extensions', () => {
      const source = {
        asyncapi: "3.0.0",
        info: {
          title: "message-with-extensions-test",
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
            messages: [
              { $ref: "#/components/messages/TestMessage" }
            ]
          }
        },
        components: {
          messages: {
            TestMessage: {
              name: "TestMessageName",
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
          }
        }
      }

      const tree = createAsyncApiTreeForTests(source)
      expect(tree).toBeDefined()

      const messageNode = tree?.root ?? null
      expect(messageNode).not.toBeNull()
      expect(messageNode!.value()).toEqual({
        internalTitle: "TestMessageName",
        action: "send",
        address: "test-channel",
      })

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
      expect(messageSectionSelectorNode).toBeDefined()

      const sections = messageSectionSelectorNode!.nestedNodes()
      expect(sections.length).toBe(3)

      const contentSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT)
      expect(contentSectionNode).toBeDefined()
      expect(contentSectionNode!.value()).toBeNull()

      const contentSectionChildrenNodes = contentSectionNode!.childrenNodes()
      expect(contentSectionChildrenNodes.length).toBe(1)

      const extensionsNode = contentSectionChildrenNodes.find(node => node.kind === AsyncApiTreeNodeKinds.EXTENSIONS)
      expect(extensionsNode).toBeDefined()
      expect(extensionsNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
      expect(extensionsNode!.key).toBe('extensions')
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
          },
        }
      })
    })
  })
})
