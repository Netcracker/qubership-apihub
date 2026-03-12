import { TreeNodeComplexityTypes } from "../src/model/abstract/tree/tree-node.interface"
import { AsyncApiTreeNodeKinds } from "../src/model/async-api/types/node-kind"
import { createAsyncApiTreeForTests } from "./helpers/create-async-api-tree-for-tests"
import { simplifyConsole } from "./helpers/simplify-console"

describe('Simple E2E test', () => {
  simplifyConsole()

  it('should build async api tree from source', () => {
    const source = {
      asyncapi: "3.0.0",
      info: {
        title: "example-event-service",
        version: "1.0.0",
        "x-generator": "springwolf"
      },
      defaultContentType: "application/json",
      servers: {
        "kafka-main": {
          host: "kafka-host",
          protocol: "kafka"
        }
      },
      channels: {
        "customer-change-topic": {
          address: "customer-change-topic",
          description: "Channel for customer change notifications",
          messages: {
            BaseEventMessage: { $ref: "#/components/messages/BaseEventMessage" }
          },
          servers: [
            { $ref: "#/servers/kafka-main" }
          ],
          bindings: {}
        }
      },
      operations: {
        "customer-change-topic_send_BaseEvent": {
          action: "send",
          channel: { $ref: "#/channels/customer-change-topic" },
          title: "Customer change topic send",
          description: "Send events about Customer's data changes",
          bindings: {
            kafka: { bindingVersion: "0.5.0" }
          },
          messages: [
            { $ref: "#/channels/customer-change-topic/messages/BaseEventMessage" }
          ]
        }
      },
      components: {
        schemas: {
          HeadersExample: {
            title: "HeadersExample",
            type: "object",
            properties: {
              "X-Idempotency-Key": { type: "string" }
            },
            examples: [
              { "X-Idempotency-Key": "string" }
            ]
          },
          BaseEvent: {
            title: "BaseEvent",
            type: "object",
            properties: {
              currentInstance: {
                type: "object",
                description: "New data state"
              },
              currentModelVersion: {
                type: "integer",
                description: "Model Version",
                format: "int32"
              },
              previousInstance: {
                type: "object",
                description: "Previous data state"
              },
              resourceAction: {
                type: "string",
                description: "Resource Action"
              },
              resourceType: {
                type: "string",
                description: "Resource Type"
              }
            },
            description: "Base event to describe Customer's data changes",
            examples: [
              {
                currentInstance: {},
                currentModelVersion: 0,
                previousInstance: {},
                resourceAction: "string",
                resourceType: "string"
              }
            ],
            required: [
              "currentInstance",
              "currentModelVersion",
              "previousInstance",
              "resourceAction",
              "resourceType"
            ]
          }
        },
        messages: {
          BaseEventMessage: {
            headers: { $ref: "#/components/schemas/HeadersExample" },
            payload: {
              schemaFormat: "application/vnd.aai.asyncapi+json;version=3.0.0",
              schema: { $ref: "#/components/schemas/BaseEvent" }
            },
            name: "BaseEventMessage",
            title: "BaseEvent",
            bindings: {
              kafka: { bindingVersion: "0.5.0" }
            }
          }
        }
      },
    }

    const tree = createAsyncApiTreeForTests(source)
    expect(tree).toBeDefined()

    const messageNode = tree!.root ?? null
    expect(messageNode).not.toBeNull()

    const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
    expect(messageSectionSelectorNode).not.toBeNull()
    expect(messageSectionSelectorNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)

    const sections = messageSectionSelectorNode!.nestedNodes()
    expect(sections.length).toBe(3)

    const contentSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT)
    const channelSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
    const operationSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_OPERATION)
    expect(contentSectionNode).toBeDefined()
    expect(channelSectionNode).toBeDefined()
    expect(operationSectionNode).toBeDefined()

    expect(contentSectionNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
    expect(channelSectionNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
    expect(operationSectionNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)

    expect(contentSectionNode!.key).toBe('content')
    expect(channelSectionNode!.key).toBe('customer-change-topic')
    expect(operationSectionNode!.key).toBe('customer-change-topic_send_BaseEvent')

    const contentSectionChildren = contentSectionNode!.childrenNodes()
    expect(contentSectionChildren.length).toBe(3)

    const headersNode = contentSectionChildren.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_HEADERS)
    expect(headersNode).toBeDefined()
    expect(headersNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
    expect(headersNode!.key).toBe('headers')
    expect(headersNode!.value()).toEqual({
      schema: {
        title: "HeadersExample",
        type: "object",
        properties: {
          "X-Idempotency-Key": { type: "string" }
        },
        examples: [
          { "X-Idempotency-Key": "string" }
        ]
      },
      schemaFormat: null,
    })

    const payloadNode = contentSectionChildren.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD)
    expect(payloadNode).toBeDefined()
    expect(payloadNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
    expect(payloadNode!.key).toBe('payload')
    expect(payloadNode!.value()).toEqual({
      schema: {
        title: "BaseEvent",
        type: "object",
        properties: {
          currentInstance: {
            type: "object",
            description: "New data state"
          },
          currentModelVersion: {
            type: "integer",
            description: "Model Version",
            format: "int32"
          },
          previousInstance: {
            type: "object",
            description: "Previous data state"
          },
          resourceAction: {
            type: "string",
            description: "Resource Action"
          },
          resourceType: {
            type: "string",
            description: "Resource Type"
          }
        },
        description: "Base event to describe Customer's data changes",
        examples: [
          {
            currentInstance: {},
            currentModelVersion: 0,
            previousInstance: {},
            resourceAction: "string",
            resourceType: "string"
          }
        ],
        required: [
          "currentInstance",
          "currentModelVersion",
          "previousInstance",
          "resourceAction",
          "resourceType"
        ]
      },
      schemaFormat: null,
    })

    const channelSectionChildren = channelSectionNode!.childrenNodes()
    expect(channelSectionChildren.length).toBe(1)
    expect(channelSectionNode!.value()).toEqual({
      description: "Channel for customer change notifications",
    })

    const channelServersNode = channelSectionChildren.find(node => node.kind === AsyncApiTreeNodeKinds.SERVERS)
    expect(channelServersNode).toBeDefined()
    expect(channelServersNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
    expect(channelServersNode!.key).toBe('servers')
    
    const channelServersChildren = channelServersNode!.childrenNodes()
    expect(channelServersChildren.length).toBe(1)

    const channelServerNode = channelServersChildren.find(node => node.kind === AsyncApiTreeNodeKinds.SERVER)
    expect(channelServerNode).toBeDefined()
    expect(channelServerNode!.type).toBe(TreeNodeComplexityTypes.SIMPLE)
    expect(channelServerNode!.key).toBe('kafka-main')
    expect(channelServerNode!.value()).toEqual({
      title: "kafka-main",
      host: "kafka-host",
      protocol: "kafka"
    })

    const operationSectionChildren = operationSectionNode!.childrenNodes()
    expect(operationSectionChildren.length).toBe(1)
    expect(operationSectionNode!.value()).toEqual({
      title: "Customer change topic send",
      description: "Send events about Customer's data changes",
    })
    
    const operationBindingsNode = operationSectionChildren.find(node => node.kind === AsyncApiTreeNodeKinds.BINDINGS)
    expect(operationBindingsNode).toBeDefined()
    expect(operationBindingsNode!.type).toBe(TreeNodeComplexityTypes.COMPLEX)
    expect(operationBindingsNode!.key).toBe('bindings')
    expect(operationBindingsNode!.value()).toEqual({
      binding: {},
      protocol: 'kafka',
      version: '0.5.0',
    })
  })
})