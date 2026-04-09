import { denormalize, normalize } from "@netcracker/qubership-apihub-api-unifier"
import { AsyncApiTreeBuilder } from "../src/building-service/async-api/tree/builder"
import { AsyncApiTree } from "../src/model/async-api/tree/tree.impl"
import { AsyncApiTreeNodeKinds } from "../src/model/async-api/types/node-kind"
import { simplifyConsole } from "./helpers/simplify-console"

const TEST_REFERENCE_NAME_PROPERTY = Symbol('referenceName')

function mergeAsyncApi(source: unknown): unknown {
  const normalizedSource = normalize(source, {
    validate: true,
    unify: true,
    liftCombiners: true,
    lastReferenceKeyProperty: TEST_REFERENCE_NAME_PROPERTY,
  })
  const mergedSource = denormalize(normalizedSource, {
    unify: true,
    validate: true,
    liftCombiners: true,
  })
  return mergedSource
}

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

describe('Feature: Reference Name Property', () => {
  simplifyConsole()

  it('should resolve operation node key based on the reference name property', () => {
    const source = {
      asyncapi: '3.0.0',
      operations: {
        'test-operation': {
          $ref: '#/components/operations/test-operation',
        },
      },
      channels: {
        'test-channel': {
          title: 'Test channel',
        },
      },
      components: {
        ...COMPONENTS_WITH_MESSAGES.components,
        operations: {
          'test-operation': {
            action: 'send',
            channel: {
              $ref: '#/channels/test-channel',
            },
            ...SINGLE_MESSAGE_USAGE,
          },
        }
      },
    }
    const mergedSource = mergeAsyncApi(source)
    const treeBuilder = new AsyncApiTreeBuilder(mergedSource, TEST_REFERENCE_NAME_PROPERTY)
    const tree: AsyncApiTree = treeBuilder.build()
    const messageNode = tree.root ?? null
    expect(messageNode).not.toBeNull()

    const selectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
    const sections = selectorNode!.nestedNodes()
    const operationSection = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_OPERATION)
    expect(operationSection?.key).toBe('test-operation')
  })

  it('should resolve operation node key based on the id property if reference name property is not present', () => {
    const source = {
      asyncapi: '3.0.0',
      operations: {
        'test-operation': {
          title: 'Test operation',
          action: 'send',
          channel: {
            $ref: '#/channels/test-channel',
          },
          ...SINGLE_MESSAGE_USAGE,
        },
      },
      channels: {
        'test-channel': {
          title: 'Test channel',
        },
      },
      ...COMPONENTS_WITH_MESSAGES,
    }
    const mergedSource = mergeAsyncApi(source)
    const treeBuilder = new AsyncApiTreeBuilder(mergedSource, TEST_REFERENCE_NAME_PROPERTY)
    const tree: AsyncApiTree = treeBuilder.build()
    const messageNode = tree.root ?? null
    expect(messageNode).not.toBeNull()

    const selectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
    const sections = selectorNode!.nestedNodes()
    const operationSection = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_OPERATION)
    expect(operationSection?.key).toBe('test-operation')
  })

  it('should resolve channel node key based on the reference name property', () => {
    const source = {
      asyncapi: '3.0.0',
      operations: {
        'test-operation': {
          title: 'Test operation',
          action: 'send',
          channel: {
            $ref: '#/channels/test-channel',
          },
          ...SINGLE_MESSAGE_USAGE,
        },
      },
      channels: {
        'test-channel': {
          description: 'Test channel without title',
        },
      },
      ...COMPONENTS_WITH_MESSAGES,
    }
    const mergedSource = mergeAsyncApi(source)

    const treeBuilder = new AsyncApiTreeBuilder(mergedSource, TEST_REFERENCE_NAME_PROPERTY)
    const tree: AsyncApiTree = treeBuilder.build()
    const messageNode = tree.root ?? null
    expect(messageNode).not.toBeNull()

    const selectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
    const sections = selectorNode!.nestedNodes()
    const channelSection = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
    expect(channelSection?.key).toBe('test-channel')
  })

  it('should resolve message node key based on the reference name property', () => {
    const source = {
      asyncapi: '3.0.0',
      operations: {
        'test-operation': {
          title: 'Test operation',
          action: 'send',
          messages: [
            {
              $ref: '#/messages/test-message-1',
            },
            {
              $ref: '#/messages/test-message-2',
            },
          ],
          channel: {
            $ref: '#/channels/test-channel',
          },
        },
      },
      channels: {
        'test-channel': {
          title: 'Test channel',
        },
      },
      messages: {
        'test-message-1': {
          description: 'Test message 1',
        },
        'test-message-2': {
          description: 'Test message 2',
        },
      },
    }
    const mergedSource = mergeAsyncApi(source)

    function test(tree: AsyncApiTree | null, messageKey: string) {
      const messageNode = tree!.root ?? null
      expect(messageNode).not.toBeNull()
      expect(messageNode!.key).toBe(messageKey)
    }

    const treeBuilder = new AsyncApiTreeBuilder(mergedSource, TEST_REFERENCE_NAME_PROPERTY)
    const tree: AsyncApiTree = treeBuilder.build()
    test(tree, 'test-message-1')

    const treeWithSpecificMessageBuilder = new AsyncApiTreeBuilder(mergedSource, TEST_REFERENCE_NAME_PROPERTY, {
      messageKey: 'test-message-2',
      operationKey: 'test-operation',
    })
    const treeWithSpecificMessage = treeWithSpecificMessageBuilder.build()
    test(treeWithSpecificMessage, 'test-message-2')
  })
})