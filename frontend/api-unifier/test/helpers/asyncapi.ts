import { Parser } from '@asyncapi/parser'
import type { Input } from '@asyncapi/parser/esm/types'
import type { v3 } from '@asyncapi/parser/esm/spec-types'
import 'jest-extended'

const parser = new Parser()

/**
 * Parses an AsyncAPI spec with the AsyncAPI parser, asserts there are no diagnostics,
 * and returns the parsed document as JSON. Use in tests to ensure the spec is valid
 * and to compare unifier output with parser output.
 */
export async function parseAsyncApiAndAssertValid(spec: Input): Promise<v3.AsyncAPIObject> {
  const { document, diagnostics } = await parser.parse(spec)
  expect(diagnostics).toBeEmpty()
  const json = document?.json()
  if (json === undefined) {
    throw new Error('Expected document when diagnostics are empty')
  }
  return json as v3.AsyncAPIObject
}
