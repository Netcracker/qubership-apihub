import { printMultilineString } from "../../src/print-graph-api/atomics.printer"
import { buildGraphApi } from "../helpers/build-graphApi"

describe('printMultilineString', () => {
  it('save new lines and indents excluding leading and trailing ones', () => {
    const originalDescription = `
      """
      
        \\"\\"\\"My Block Description


        - Description
          - About
            - Entity
        1. Test 1
            2. Test 2
      """
    `
    const graphql = `
      ${originalDescription}
      scalar MyScalar
    `
    const graphApi = buildGraphApi(graphql)
    const parsedDescription = graphApi.components?.scalars?.MyScalar?.description
    const actual = printMultilineString(parsedDescription!)
    const expected = (
      '"""\n' +
      '\\"\\"\\"My Block Description\n\n\n' +
      '- Description\n' +
      '  - About\n' +
      '    - Entity\n' +
      '1. Test 1\n' +
      '    2. Test 2\n' +
      '"""'
    )
    expect(actual).toBe(expected)
  })
})