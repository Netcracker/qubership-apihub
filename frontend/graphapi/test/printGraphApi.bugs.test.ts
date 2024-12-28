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
})
