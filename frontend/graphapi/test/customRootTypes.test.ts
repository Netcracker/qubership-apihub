import { buildGraphApi, GRAPH_API_BUILD_MODE_INTROSPECTION, GRAPH_API_BUILD_MODE_SCHEMA, type GRAPH_API_BUILD_MODE } from "./helpers/build-graphApi"
import { printGraphApi } from "../src"

describe('Custom Root Types', () => {
  // Test both build modes with the same test logic
  const buildModes: Array<[string, GRAPH_API_BUILD_MODE]> = [
    ['from schema', GRAPH_API_BUILD_MODE_SCHEMA],
    ['from introspection', GRAPH_API_BUILD_MODE_INTROSPECTION]
  ]

  describe.each(buildModes)('%s', (buildModeName, mode) => {
    it('should preserve custom root type names correctly', () => {
      const original = `schema {
  query: MyCustomQueryType
  mutation: MyCustomMutationType
  subscription: MyCustomSubscriptionType
}

type MyCustomQueryType {
  hello: String
}

type MyCustomMutationType {
  createUser(name: String!): String
}

type MyCustomSubscriptionType {
  userUpdated: String
}`

      const graphApi = buildGraphApi(original, mode)
      const actual = printGraphApi(graphApi)

      // The printed GraphQL should be valid and parseable
      expect(() => buildGraphApi(actual)).not.toThrow()

      // Verify that the custom type names are preserved
      expect(actual).toContain('schema {')
      expect(actual).toContain('query: MyCustomQueryType')
      expect(actual).toContain('mutation: MyCustomMutationType')
      expect(actual).toContain('subscription: MyCustomSubscriptionType')
      expect(actual).toContain('type MyCustomQueryType')
      expect(actual).toContain('type MyCustomMutationType')
      expect(actual).toContain('type MyCustomSubscriptionType')

      // Should NOT contain the standard names when custom names are used
      expect(actual).not.toContain('type Query')
      expect(actual).not.toContain('type Mutation')
      expect(actual).not.toContain('type Subscription')

      // Verify the GraphApi object contains the correct root type names
      expect(graphApi.queryTypeName).toBe('MyCustomQueryType')
      expect(graphApi.mutationTypeName).toBe('MyCustomMutationType')
      expect(graphApi.subscriptionTypeName).toBe('MyCustomSubscriptionType')
    })

    it('should use standard names when no custom root types are defined', () => {
      const original = `type Query {
  hello: String
}

type Mutation {
  createUser(name: String!): String
}`

      const graphApi = buildGraphApi(original, mode)
      const actual = printGraphApi(graphApi)

      // Should use standard names and not generate schema definition
      expect(actual).toContain('type Query')
      expect(actual).toContain('type Mutation')
      expect(actual).not.toContain('schema {')

      // Verify the GraphApi object contains the correct standard root type names
      expect(graphApi.queryTypeName).toBe('Query')
      expect(graphApi.mutationTypeName).toBe('Mutation')
      expect(graphApi.subscriptionTypeName).toBeUndefined()
    })

    it('should NOT emit a schema block when Query/Mutation/Subscription roots all use default names', () => {
      // Regression guard for the naming-conflict check: REAL default-named roots are excluded from
      // components, so none of Query/Mutation/Subscription must trigger a schema block. The check
      // treats all three names symmetrically, so exercise all three roots at once.
      const original = `
        type Query {
          hello: String
        }

        type Mutation {
          doIt: Boolean
        }

        type Subscription {
          event: String
        }
      `

      const graphApi = buildGraphApi(original, mode)

      // Each type IS the real root of its kind, not a conflicting component.
      expect(graphApi.queryTypeName).toBe('Query')
      expect(graphApi.mutationTypeName).toBe('Mutation')
      expect(graphApi.subscriptionTypeName).toBe('Subscription')

      const actual = printGraphApi(graphApi)

      // Standard default-named roots need no explicit schema block.
      expect(actual).not.toContain('schema {')
      expect(actual).toContain('type Query')
      expect(actual).toContain('type Mutation')
      expect(actual).toContain('type Subscription')

      // Round-trip stays lossless without a block: the types are meant to be the roots.
      const reparsed = buildGraphApi(actual, mode)
      expect(reparsed.queryTypeName).toBe('Query')
      expect(reparsed.mutationTypeName).toBe('Mutation')
      expect(reparsed.subscriptionTypeName).toBe('Subscription')
    })

    // Detection is name/kind-agnostic, so the pairing is an arbitrary diagonal sample touching each
    // kind and name once, not a full cross-product. (`Query` can't be tested: its root is mandatory,
    // so a type named `Query` is always the root, never a conflicting component.)
    const conflictCases = [
      { name: 'Mutation', kind: 'objects' },
      { name: 'Subscription', kind: 'enums' },
      { name: 'Mutation', kind: 'inputObjects' },
    ] as const

    it.each(conflictCases)(
      'should keep an explicit schema block when a $kind type is named like the $name root',
      ({ name, kind }) => {
        const typeDef = {
          objects: `type ${name} {\n  id: ID!\n}`,
          enums: `enum ${name} {\n  ACTIVE\n  INACTIVE\n}`,
          inputObjects: `input ${name} {\n  id: ID!\n}`,
        }[kind]
        // Input types can't be output field types, so reference them via an argument instead.
        const queryField = kind === 'inputObjects' ? `field(arg: ${name}): Boolean` : `field: ${name}`
        const missingRoot = name === 'Mutation' ? 'mutations' : 'subscriptions'
        const rootKeyword = name.toLowerCase() // 'mutation' | 'subscription'

        // The explicit `schema` block lists only the query root, so the source itself does NOT treat
        // the conflicting type as a root.
        const original = `
        schema {
          query: Query
        }

        type Query {
          ${queryField}
        }

        ${typeDef}
        `

        const graphApi = buildGraphApi(original, mode)

        // The conflicting type must NOT be promoted to a root operation type.
        expect(graphApi[missingRoot]).toBeUndefined()

        const actual = printGraphApi(graphApi)

        // The schema block must be emitted so the round-trip does not promote the type to a root.
        expect(actual).toContain('schema {')
        expect(actual).toContain('query: Query')
        expect(actual).not.toContain(`${rootKeyword}:`)

        // Round-trip: re-parsing the printed schema keeps the type as a component, not a root.
        const reparsed = buildGraphApi(actual, mode)
        expect(reparsed[missingRoot]).toBeUndefined()
        expect(reparsed.components?.[kind]).toHaveProperty(name)
      }
    )

    // Regression for qubership-apihub#633: a business object named Subscription must not be promoted
    // to the subscription root when the stored SDL is re-parsed without an explicit schema block.
    it('should round-trip Subscription business object without promoting it to subscription root', () => {
      const original = `
        schema {
          query: Query
        }

        type Query {
          subscriptions: [Subscription!]!
        }

        interface Node {
          id: ID!
        }

        type Subscription implements Node {
          id: ID!
          name: String
        }
      `

      const graphApi = buildGraphApi(original, mode)

      expect(graphApi.subscriptions).toBeUndefined()
      expect(graphApi.components?.objects).toHaveProperty('Subscription')
      expect(graphApi.components?.objects?.Subscription?.type?.interfaces).toEqual([
        { $ref: '#/components/interfaces/Node' },
      ])

      const actual = printGraphApi(graphApi)

      expect(actual).toContain('schema {')
      expect(actual).toContain('query: Query')
      expect(actual).not.toContain('subscription:')
      expect(actual).toContain('type Subscription implements Node')
      expect(actual).toContain('interface Node')

      const reparsed = buildGraphApi(actual, mode)
      expect(graphApi).toEqual(reparsed)
    })

    it('should handle only query type with custom name', () => {
      const original = `schema {
  query: MyOnlyQueryType
}

type MyOnlyQueryType {
  hello: String
}`

      const graphApi = buildGraphApi(original, mode)
      const actual = printGraphApi(graphApi)

      // Should generate schema definition for custom query type only
      expect(actual).toContain('schema {')
      expect(actual).toContain('query: MyOnlyQueryType')
      expect(actual).not.toContain('mutation:')
      expect(actual).not.toContain('subscription:')
      expect(actual).toContain('type MyOnlyQueryType')

      // Verify the GraphApi object
      expect(graphApi.queryTypeName).toBe('MyOnlyQueryType')
      expect(graphApi.mutationTypeName).toBeUndefined()
      expect(graphApi.subscriptionTypeName).toBeUndefined()
    })
  })
})
