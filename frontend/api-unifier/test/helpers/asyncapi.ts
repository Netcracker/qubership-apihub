import { Parser } from '@asyncapi/parser'
import type { Input } from '@asyncapi/parser/esm/types'
import type { v3 } from '@asyncapi/parser/esm/spec-types'
import 'jest-extended'

const parser = new Parser()

/** Spectral's DiagnosticSeverity: 0 Error, 1 Warning, 2 Information, 3 Hint. */
const ADVISORY_SEVERITY = 2

/**
 * Parses an AsyncAPI spec with the AsyncAPI parser, asserts nothing is wrong with it,
 * and returns the parsed document as JSON. Use in tests to ensure the spec is valid
 * and to compare unifier output with parser output.
 *
 * "Nothing is wrong" means no error and no warning. It deliberately does not mean "no
 * diagnostics at all", which is what this used to assert: @asyncapi/specs 6.11.1 knows
 * that AsyncAPI 3.1.0 exists and the parser therefore emits `asyncapi-latest-version`,
 * an Information diagnostic, for every 3.0.0 document in this suite. That took 123
 * tests red on a dependency bump without a single specification in them changing, and
 * it would have done so again the next time AsyncAPI published a version. A calendar
 * event is not a regression.
 */
export async function parseAsyncApiAndAssertValid(spec: Input): Promise<v3.AsyncAPIObject> {
  const { document, diagnostics } = await parser.parse(spec)
  expect(diagnostics.filter(({ severity }) => severity < ADVISORY_SEVERITY)).toBeEmpty()
  const json = document?.json()
  if (json === undefined) {
    throw new Error('Expected document when the spec has no errors or warnings')
  }
  return json as v3.AsyncAPIObject
}
