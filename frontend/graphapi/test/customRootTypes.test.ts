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
