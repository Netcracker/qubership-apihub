import { printGraphApi } from "../src/print-graph-api"
import { buildGraphApi } from "./helpers/build-graphApi"

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
