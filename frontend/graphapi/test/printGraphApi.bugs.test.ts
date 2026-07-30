import { printGraphApi } from "../src/print-graph-api"
import { buildGraphApi, GRAPH_API_BUILD_MODE_INTROSPECTION, GRAPH_API_BUILD_MODE_SCHEMA } from "./helpers/build-graphApi"

describe('bugs in printing GraphAPI', () => {
  it('directive "specifiedBy" is not duplicated when other directives are present', () => {
    const expected = (
      'directive @foo on SCALAR\n' +
      '\n' +
      'scalar MyScalar @specifiedBy(url: "https://example.com/")'
    )
    const graphApi = buildGraphApi(expected)
    const actual = printGraphApi(graphApi)
    expect(actual).toBe(expected)
  })

  it('scalar description with double quotes should escape quotes properly during print', () => {
    const original = `"""
A monetary value string without a currency symbol or code. Example value: \`"100.57"\`.
"""
scalar Money`
    
    const graphApi = buildGraphApi(original)
    const actual = printGraphApi(graphApi)
    
    // The printed GraphQL should be valid and parseable
    expect(() => buildGraphApi(actual)).not.toThrow()
    
    // Verify the generated GraphQL contains properly formatted quotes
    expect(actual).toContain('`"100.57"`')
    expect(actual).toContain('scalar Money')
  })

  it('should print an input-object default value without throwing and round-trip it', () => {
    const original = `input Point {
      x: Int
      y: Int
    }
    
    type Query {
      near(p: Point = {x: 1, y: 2}): String
    }`
    const graphApi = buildGraphApi(original)

    expect(() => printGraphApi(graphApi)).not.toThrow()
    const actual = printGraphApi(graphApi)
    expect(actual).toContain('p: Point = {x: 1, y: 2}')
    expect(() => buildGraphApi(actual)).not.toThrow()
  })

  // Enum defaults lose the enum-vs-string distinction once coerced; the printer re-derives the type
  // from the schema components so enum values print unquoted (`ASC`, not `"ASC"`). Verified for both
  // build paths: of-schema stores a coerced value, of-introspection parses the literal string.
  it.each([GRAPH_API_BUILD_MODE_SCHEMA, GRAPH_API_BUILD_MODE_INTROSPECTION] as const)(
    'should print enum default values unquoted (top-level and nested), built from %s',
    (mode) => {
      const original = `enum OrderDirection {
        ASC
        DESC
      }
      
      input RepositoryOrder {
        field: String
        direction: OrderDirection
      }
      
      type Query {
        repositories(orderBy: RepositoryOrder = {field: "NAME", direction: ASC}, direction: OrderDirection = DESC): String
      }`
      const actual = printGraphApi(buildGraphApi(original, mode))

      expect(actual).toContain('orderBy: RepositoryOrder = {field: "NAME", direction: ASC}')
      expect(actual).toContain('direction: OrderDirection = DESC')
      expect(() => buildGraphApi(actual)).not.toThrow()
    }
  )

  it('should coerce scalar, wrapped and list default values from introspection instead of leaving literal strings', () => {
    const original = `type Query {
  search(count: Int = 42, rate: Float = 3.14, flag: Boolean = true, req: Int! = 7, tags: [String!] = ["a", "b"], nums: [Int!] = [1, 2]): String
}`
    const actual = printGraphApi(buildGraphApi(original, GRAPH_API_BUILD_MODE_INTROSPECTION))

    expect(actual).toBe(original)
  })

  it('should print input-object field defaults for every kind (scalar, enum, list, nested-object, list-of-list)', () => {
    const original = `enum Role {
  ADMIN
  USER
}

input Inner {
  role: Role
}

input Outer {
  inner: Inner
}

input Filter {
  id: Int
  role: Role
}

input User {
  name: String = "any"
  limit: Int = 10
  role: Role = ADMIN
  names: [String!] = ["a", "b"]
  roles: [Role!] = [ADMIN, USER]
  filter: Filter = {id: 5, role: ADMIN}
  nested: Outer = {inner: {role: ADMIN}}
  matrix: [[Filter]] = [[{id: 1, role: USER}]]
}

type Query {
  create(user: User): String
}`
    const actual = printGraphApi(buildGraphApi(original))

    // The schema is already in canonical printed form, so the dump must reproduce it verbatim.
    // One exact match pins every default kind at once — scalar, enum, list, nested-object and
    // list-of-list — plus field order and formatting, which `toContain` can't catch.
    expect(actual).toBe(original)
  })

  it('directive arguments with special characters should print correctly', () => {
    const original = `type PrivateMetafield {
  id: ID
}

type Query {
  """
  Returns a private metafield by namespace and key that belongs to the resource.
  """
  privateMetafield(
    """The namespace for the private metafield."""
    namespace: String!

    """The key for the private metafield."""
    key: String!
  ): PrivateMetafield @deprecated(reason: "Metafields created using a reserved namespace are private by default. \\n")
}`
    
    const graphApi = buildGraphApi(original)
    const actual = printGraphApi(graphApi)
    
    // The printed GraphQL should be valid and parseable
    expect(() => buildGraphApi(actual)).not.toThrow()
  })

})
