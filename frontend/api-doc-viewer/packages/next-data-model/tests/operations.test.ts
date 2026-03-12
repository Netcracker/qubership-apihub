import { TreeNodeComplexityTypes } from "../src/model/abstract/tree/tree-node.interface"
import { AsyncApiTreeNodeKinds } from "../src/model/async-api/types/node-kind"
import { createAsyncApiTreeForTests } from "./helpers/create-async-api-tree-for-tests"

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

describe('AsyncAPI Operations', () => {
  describe('Operation Extensions', () => {
    it('should handle operation with extensions', () => {
      const asyncApiSource = {
        asyncapi: "3.0.0",
        info: {
          title: "operation-with-extensions-test",
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
        ...COMPONENTS_WITH_MESSAGES
      }

      const tree = createAsyncApiTreeForTests(asyncApiSource)
      expect(tree).toBeDefined()

      const messageNode = tree!.root ?? null
      expect(messageNode).not.toBeNull()

      const messageSectionSelectorNode = messageNode!.childrenNodes().find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
      expect(messageSectionSelectorNode).toBeDefined()

      const sections = messageSectionSelectorNode!.nestedNodes()
      expect(sections.length).toBe(3)

      const operationSectionNode = sections.find(node => node.kind === AsyncApiTreeNodeKinds.MESSAGE_OPERATION)
      expect(operationSectionNode).toBeDefined()
      const operationChildrenNodes = operationSectionNode!.childrenNodes()
      expect(operationChildrenNodes.length).toBe(1)

      const extensionsNode = operationChildrenNodes.find(node => node.kind === AsyncApiTreeNodeKinds.EXTENSIONS)
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
})