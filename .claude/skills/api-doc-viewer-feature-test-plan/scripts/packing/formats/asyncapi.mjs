// AsyncAPI documents. APIHUB builds an operation ID from the operation key and the message ID, so the builder
// prefixes the operation keys with the case ID (builders/regression.mjs, prefixAsyncApiOperations).
import fs from 'node:fs'
import { YAML, stableStringify } from '../lib.mjs'

function withoutOperationPrefix(document, prefix) {
  const strip = key => (key.startsWith(`${prefix}-`) ? key.slice(prefix.length + 1) : key)
  const copy = JSON.parse(JSON.stringify(document, (key, value) =>
    (key === '$ref' && typeof value === 'string' && value.startsWith('#/operations/')
      ? `#/operations/${strip(value.slice('#/operations/'.length))}` : value)))
  if (copy.operations) {
    copy.operations = Object.fromEntries(Object.entries(copy.operations).map(([key, value]) => [strip(key), value]))
  }
  return copy
}

export default {
  name: 'AsyncAPI',
  matches: content => typeof content === 'object' && content !== null && 'asyncapi' in content,
  lookFor: content => Object.keys(content.operations ?? {}),
  ids: async content => Object.keys(content.operations ?? {}).map(key => `operation ${key}`),
  async compare({ content, item, fixtureFile }) {
    // A case built around another fixture (a JSON Schema as a message payload) has no AsyncAPI fixture to compare.
    const fixture = fixtureFile && YAML.parse(fs.readFileSync(fixtureFile, 'utf8'))
    if (!fixture?.asyncapi) return undefined
    return stableStringify(withoutOperationPrefix(content, item.id)) === stableStringify(fixture)
      ? undefined
      : `differs from ${fixtureFile} beyond the operation keys`
  },
}
