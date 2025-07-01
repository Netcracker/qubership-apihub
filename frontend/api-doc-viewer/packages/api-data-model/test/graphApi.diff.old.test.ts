
import { annotation, breaking, DiffAction, nonBreaking, unclassified } from '@netcracker/qubership-apihub-api-diff'
import { buildGraphApi, createGraphApiDiffTreeForTests, metaKey } from './helpers/graphql'

// Old Tests
describe.skip('GraphAPI with diffs transformation tests', () => {
  describe('Custom Directives Definitions', () => {
    it('should provide $childrenChanges for added/removed custom directives definitions in node[kind = schema]', () => {
      const before = `
      directive @limit(offset: Int = 0, limit: Int = 20) on FIELD | FIELD_DEFINITION
      directive @order(value: String = "ASC") on FIELD

      type Query {
        "A Query with 1 required argument and 1 optional argument"
        todo(
          id: ID      
        ): String
      }
      `
      const after = `
      directive @limit(limit: Int = 10) on FIELD | FIELD_DEFINITION
      directive @sortOrder(value: String = "asc") on FIELD

      type Query {
        "A Query with 1 required argument and 1 optional argument"
        todo(
          id: ID      
        ): String
      }
      `
      const beforeSource = buildGraphApi(before)
      const afterSource = buildGraphApi(after)

      const tree = createGraphApiDiffTreeForTests(beforeSource, afterSource, metaKey)

      expect(tree.root?.meta?.$childrenChanges?.['#/components/directives/order'])
        .toMatchObject({
          type: breaking,
          action: 'remove',
        })
      expect(tree.root?.meta?.$childrenChanges?.['#/components/directives/sortOrder'])
        .toMatchObject({
          type: nonBreaking,
          action: 'add',
        })
    })

    it('should provide $childrenChanges for removed custom directives section in node[kind = schema]', () => {
      const before = `
      directive @limit(offset: Int = 0, limit: Int = 20) on FIELD | FIELD_DEFINITION
      directive @order(value: String = "ASC") on FIELD

      type Query {
        "A Query with 1 required argument and 1 optional argument"
        todo(
          id: ID      
        ): String
      }
      `
      const after = `
      type Query {
        "A Query with 1 required argument and 1 optional argument"
        todo(
          id: ID      
        ): String
      }
      `
      const beforeSource = buildGraphApi(before)
      const afterSource = buildGraphApi(after)

      const tree = createGraphApiDiffTreeForTests(beforeSource, afterSource, metaKey)

      expect(tree.root?.meta?.$childrenChanges?.['#/components/directives/limit'])
        .toMatchObject({
          type: breaking,
          action: 'remove',
        })
      expect(tree.root?.meta?.$childrenChanges?.['#/components/directives/order'])
        .toMatchObject({
          type: breaking,
          action: 'remove',
        })
    })

    it('should provide $nodeChange in node[kind = directive]', () => {
      const before = `
      directive @limit(offset: Int = 0, limit: Int = 20) on FIELD | FIELD_DEFINITION
      directive @order(value: String = "ASC") on FIELD

      type Query {
        "A Query with 1 required argument and 1 optional argument"
        todo(
          id: ID      
        ): String
      }
      `
      const after = `
      directive @limit(limit: Int = 10) on FIELD | FIELD_DEFINITION
      directive @sortOrder(value: String = "asc") on FIELD

      type Query {
        "A Query with 1 required argument and 1 optional argument"
        todo(
          id: ID      
        ): String
      }
      `
      const beforeSource = buildGraphApi(before)
      const afterSource = buildGraphApi(after)

      const tree = createGraphApiDiffTreeForTests(beforeSource, afterSource, metaKey)

      expect(tree.root?.children()[2]?.meta?.$nodeChange)
        .toMatchObject({
          type: breaking,
          action: 'remove',
        })
      expect(tree.root?.children()[3]?.meta?.$nodeChange)
        .toMatchObject({
          type: nonBreaking,
          action: 'add',
        })
    })

    it('should provide $metaChanges in node[kind = directive] when locations changed', () => {
      const before = `
      directive @limit(offset: Int = 0, limit: Int = 20) on FIELD | FIELD_DEFINITION
      directive @order(value: String = "ASC") on FIELD
      
      type Query {
          "Load all the orders made by specific customer in the shop"
          getOrdersByCustomer(
              "Customer ID"
              customerId: String!
          ): [Order!]!
      }
      
      interface Order {
          orderId: Int!
      }
      `
      const after = `
      directive @limit(offset: Int = 0, limit: Int = 20) on FIELD
      directive @order(value: String = "ASC") on SCHEMA
      
      type Query {
          "Load all the orders made by specific customer in the shop"
          getOrdersByCustomer(
              "Customer ID"
              customerId: String!
          ): [Order!]!
      }
      
      interface Order {
          orderId: Int!
      }
      `

      const beforeSource = buildGraphApi(before)
      const afterSource = buildGraphApi(after)

      const tree = createGraphApiDiffTreeForTests(beforeSource, afterSource, metaKey)

      expect(tree.root?.children()[1]?.meta?.$metaChanges).toMatchObject({
        locations: {
          array: {
            1: {
              type: annotation,
              action: 'remove',
            },
          },
        },
      })
      expect(tree.root?.children()[2]?.meta?.$metaChanges).toMatchObject({
        locations: {
          array: {
            0: {
              type: annotation,
              action: 'replace',
              replaced: 'FIELD',
            },
          },
        },
      })
    })
  })

  describe('Wholly added/removed operation', () => {
    it('should provide $nodeChange for query node when query/mutation/subscription is wholly added', () => {
      const before = `
      type Query {
          firstOperation(
              id: ID!
          ): Object!
      }
      
      type Object {
          key: String!
          value: Value
      }
      
      union Value = String | Int | Boolean | Object
      `
      const after = `
      type Query {
          firstOperation(
              id: ID!
          ): Object!
      
          secondOperation(
              key: String!
          ): Object!
      }
      
      type Object {
          key: String!
          value: Value
      }
      
      union Value = String | Int | Boolean | Object
      `
      const beforeSource = buildGraphApi(before)
      const afterSource = buildGraphApi(after)

      const tree = createGraphApiDiffTreeForTests(beforeSource, afterSource, metaKey)

      expect(tree.root?.children()[1]?.id).toBe('#/queries/secondOperation')
      expect(tree.root?.children()[1]?.meta?.$nodeChange)
        .toMatchObject({
          type: nonBreaking,
          action: 'add',
        })
    })

    it('should provide $nodeChange for query node when query/mutation/subscription is wholly removed', () => {
      const before = `
      type Query {
          firstOperation(
              id: ID!
          ): Object!
      
          secondOperation(
              key: String!
          ): Object!
      }
      
      type Object {
          key: String!
          value: Value
      }
      
      union Value = String | Int | Boolean | Object
      `
      const after = `
      type Query {
          firstOperation(
              id: ID!
          ): Object!
      }
      
      type Object {
          key: String!
          value: Value
      }
      
      union Value = String | Int | Boolean | Object
      `
      const beforeSource = buildGraphApi(before)
      const afterSource = buildGraphApi(after)

      const tree = createGraphApiDiffTreeForTests(beforeSource, afterSource, metaKey)

      expect(tree.root?.children()[1]?.id).toBe('#/queries/secondOperation')
      expect(tree.root?.children()[1]?.meta?.$nodeChange)
        .toMatchObject({
          type: breaking,
          action: 'remove',
        })
    })

    it('should NOT fail with "Maximum Call Stack Size Exceeded" on $nodeChangesSummary invocation', () => {
      const before = `
      type Query {
          firstOperation(
              id: ID!
          ): Object!
      }
      
      type Object {
          key: String!
          value: Value
      }
      
      union Value = String | Int | Boolean | Object
      `
      const after = `
      type Query {
          firstOperation(
              id: ID!
          ): Object!
      
          secondOperation(
              key: String!
          ): Object!
      }
      
      type Object {
          key: String!
          value: Value
      }
      
      union Value = String | Int | Boolean | Object
      `
      const beforeSource = buildGraphApi(before)
      const afterSource = buildGraphApi(after)

      const tree = createGraphApiDiffTreeForTests(beforeSource, afterSource, metaKey)

      const nodeChangesSummary = tree.root?.meta?.$nodeChangesSummary

      expect(nodeChangesSummary).toBeDefined()
    })

  })

  describe('Deprecation with/without reason changes', () => {
    it([
      'given node deprecated with reason',
      'when reason is changed',
      'then it accumulated in $metaChanges in "deprecated.reason" property',
    ].join(', '), () => {

      const before = `
        type Query {
            "A Query with 1 required argument"
            todo(
                id: ID!
        
                "A default value of false"
                isCompleted: Boolean = false @deprecated(reason: "just deleted")
            ): String
        }
      `
      const after = `
        type Query {
            "A Query with 1 required argument"
            todo(
                id: ID!
        
                "A default value of false"
                isCompleted: Boolean = false @deprecated(reason: "another just deleted")
            ): String
        }
      `

      const beforeSource = buildGraphApi(before)
      const afterSource = buildGraphApi(after)

      const tree = createGraphApiDiffTreeForTests(beforeSource, afterSource, metaKey)
      const root = tree.root

      const target = root!.children()[0]?.children()[0]?.children()[1]
      expect(target?.id).toBe('#/queries/todo/args/type/properties/isCompleted')
      expect(target?.meta.deprecationReason).toBe('another just deleted')
      expect(target?.meta.$metaChanges)
        .toMatchObject({
          deprecationReason: {
            type: unclassified,
            action: DiffAction.replace,
            beforeValue: 'just deleted',
            afterValue: 'another just deleted',
          },
        })
    })
  })
})
