import { printGraphApi } from "../src/print-graph-api"
import { buildGraphApi } from "./helpers/build-graphApi"

describe('bugs in printing GraphAPI', () => {
  it('directive "specifiedBy" is not duplicated when other directives are present', () => {
    const expected = (
      'directive @foo on SCALAR\n' +
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
})
