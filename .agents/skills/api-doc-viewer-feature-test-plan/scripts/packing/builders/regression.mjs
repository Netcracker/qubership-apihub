// Cases of the regression packages of the other API types: AsyncAPI, DDL API, GraphQL, and JSO.
//
// AsyncAPI, DDL, and GraphQL cases stay one document each ("files" packages): their documents cannot be merged
// without renaming what the viewers show. Only the names that APIHUB derives its IDs from get the case prefix, so
// that the documents of one version do not clash:
// - AsyncAPI: operation keys (the operation ID is the operation key plus the message ID);
// - DDL: schema names (the table ID is the schema name plus the table name; an unqualified table is in "public");
// - GraphQL: the fields of the root types Query, Mutation, and Subscription (the operation ID is the root type plus
//   the field name).
// JSO cases are OpenAPI operations whose extension x-payload holds the JSO fixture, packed like the OpenAPI cases.
import fs from 'node:fs'
import path from 'node:path'
import { SAMPLES_ROOT, caseFile, numberedCaseDirs, readYaml, toPosix } from '../lib.mjs'
import { graphqlCompatibilityPairs } from './compatibility.mjs'

function folderCases(dir, code, layout, read) {
  return numberedCaseDirs(path.join(SAMPLES_ROOT, dir), code).map(({ caseDir, id }) => {
    const sides = layout === 'plain'
      ? [read(caseFile(caseDir, fs.existsSync(path.join(caseDir, 'document.yaml')) ? 'document' : 'sample'), id)]
      : ['before', 'after'].map(side => read(caseFile(caseDir, side), id))
    return { id, fixture: toPosix(path.relative(SAMPLES_ROOT, caseDir)), sides }
  })
}

// ----- AsyncAPI -----

// Prefixes the keys of `operations` and rewrites the references to them ("#/operations/<key>").
export function prefixAsyncApiOperations(document, prefix) {
  const keys = Object.keys(document.operations ?? {})
  const renamed = new Map(keys.map(key => [key, `${prefix}-${key}`]))
  const text = JSON.stringify(document, (key, value) =>
    (key === '$ref' && typeof value === 'string' && value.startsWith('#/operations/')
      ? `#/operations/${renamed.get(value.slice('#/operations/'.length)) ?? value.slice('#/operations/'.length)}`
      : value))
  const copy = JSON.parse(text)
  if (copy.operations) {
    copy.operations = Object.fromEntries(
      Object.entries(copy.operations).map(([key, value]) => [renamed.get(key), value]))
  }
  return copy
}

const readAsyncApi = (file, id) => prefixAsyncApiOperations(readYaml(file), id)

export const asyncApiPlainCases = () => folderCases('async-api', 'aap', 'plain', readAsyncApi)
  .map(c => ({ ...c, extension: 'yaml' }))
export const asyncApiDiffsCases = () => folderCases('async-api-diffs', 'aad', 'diffs', readAsyncApi)
  .map(c => ({ ...c, extension: 'yaml' }))

// ----- DDL -----

const IDENT = '(?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)'
const unquote = name => name.replace(/^"|"$/g, '')

// Moves every object of the script into schemas of its own: "public" (explicit, or implied by an unqualified name)
// becomes "<prefix>", and any other schema "s" becomes "<prefix>_s". Handles the statements the fixtures use:
// CREATE SCHEMA, CREATE TABLE, CREATE TYPE, CREATE [UNIQUE] INDEX … ON, ALTER TABLE, REFERENCES, COMMENT ON TABLE,
// TYPE, INDEX, and COLUMN, and schema-qualified names anywhere else (column types such as public.mood).
// verify-files.mjs parses the result and the original with ddlapi and compares them.
export function prefixDdlSchemas(sql, prefix) {
  const schemas = new Set(['public'])
  for (const [, name] of sql.matchAll(new RegExp(`CREATE\\s+SCHEMA\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(${IDENT})`, 'gi'))) {
    schemas.add(unquote(name).toLowerCase())
  }
  const schemaName = name => (unquote(name).toLowerCase() === 'public' ? prefix : `${prefix}_${unquote(name)}`)
  const isSchema = name => schemas.has(unquote(name).toLowerCase())
  let text = sql
    // CREATE SCHEMA <name>
    .replace(new RegExp(`(CREATE\\s+SCHEMA\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?)(${IDENT})`, 'gi'),
      (_, head, name) => `${head}${schemaName(name)}`)
    // <schema>.<name> anywhere: the schemas are "public" and the ones the script creates.
    .replace(new RegExp(`(^|[^.\\w"])(${IDENT})\\.(?=${IDENT})`, 'g'),
      (match, before, name) => (isSchema(name) ? `${before}${schemaName(name)}.` : match))
    // COMMENT ON COLUMN <table>.<column>: an unqualified table.
    .replace(new RegExp(`(COMMENT\\s+ON\\s+COLUMN\\s+)(${IDENT}\\.${IDENT})(?=\\s+IS\\b)`, 'gi'),
      (_, head, name) => `${head}${prefix}.${name}`)
    // An unqualified table, type, domain, or index after the keywords that name one.
    .replace(new RegExp('((?:CREATE\\s+(?:UNLOGGED\\s+)?TABLE|CREATE\\s+TYPE|CREATE\\s+DOMAIN|ALTER\\s+TABLE|' +
      'REFERENCES|COMMENT\\s+ON\\s+(?:TABLE|TYPE|DOMAIN|INDEX)|\\bON)\\s+(?:ONLY\\s+)?(?:IF\\s+NOT\\s+EXISTS\\s+)?)' +
      `(${IDENT})(?![.\\w"])`, 'gi'),
    (match, head, name) => (/^(TABLE|COLUMN|INDEX|TYPE|DOMAIN|SCHEMA|ONLY|DELETE|UPDATE)$/i.test(name)
      ? match : `${head}${prefix}.${name}`))
  // The uses of an unqualified type or domain that the script creates (column types): it moved to the case schema.
  for (const [, name] of sql.matchAll(new RegExp(`CREATE\\s+(?:TYPE|DOMAIN)\\s+(${IDENT})(?![.\\w"])`, 'gi'))) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    text = text.replace(new RegExp(`(?<![.\\w"])${escaped}(?![\\w".])`, 'g'), `${prefix}.${name}`)
  }
  if (!new RegExp(`CREATE\\s+SCHEMA\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${prefix}\\b`, 'i').test(text)) {
    text = `CREATE SCHEMA IF NOT EXISTS ${prefix};\n\n${text}`
  }
  return text
}

const readDdl = (file, id) => prefixDdlSchemas(fs.readFileSync(file, 'utf8'), id.replace(/-/g, '_'))

export const ddlPlainCases = () => folderCases('ddlapi', 'ddp', 'plain', readDdl).map(c => ({ ...c, extension: 'sql' }))
export const ddlDiffsCases = () => folderCases('ddlapi-diffs', 'ddd', 'diffs', readDdl)
  .map(c => ({ ...c, extension: 'sql' }))

// ----- GraphQL -----

// Prefixes the fields of the root types (type or extend type Query, Mutation, Subscription).
export function prefixGraphqlRootFields(sdl, prefix) {
  const out = []
  let depth = 0
  let inRoot = false
  for (const line of sdl.split('\n')) {
    if (depth === 0 && /^\s*(extend\s+)?type\s+(Query|Mutation|Subscription)\b/.test(line)) inRoot = true
    let current = line
    if (inRoot && depth === 1) current = line.replace(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*[(:])/, `$1${prefix}_$2$3`)
    for (const char of line.replace(/"""[\s\S]*?"""|"[^"]*"|#.*$/g, '')) {
      if (char === '{' || char === '(') depth++
      if (char === '}' || char === ')') depth--
    }
    if (depth === 0) inRoot = false
    out.push(current)
  }
  return out.join('\n')
}

// GraphQL compatibility pairs numbered per suite: "gqd-03-02" is the second case of the third suite.
function numberedGraphqlPairs() {
  const suiteNumbers = new Map()
  const testCounts = new Map()
  return graphqlCompatibilityPairs().map(pair => {
    if (!suiteNumbers.has(pair.suiteId)) suiteNumbers.set(pair.suiteId, suiteNumbers.size + 1)
    testCounts.set(pair.suiteId, (testCounts.get(pair.suiteId) ?? 0) + 1)
    const pad = n => String(n).padStart(2, '0')
    return { ...pair, number: `${pad(suiteNumbers.get(pair.suiteId))}-${pad(testCounts.get(pair.suiteId))}` }
  })
}

const graphqlCase = (id, pair, sdls) => ({
  id,
  title: `${pair.suiteId}: ${pair.testId}`,
  fixture: `compatibility-suites graphql/${pair.suiteId}/${pair.testId}`,
  extension: 'graphql',
  sides: sdls.map(sdl => prefixGraphqlRootFields(sdl, id.replace(/-/g, '_'))),
})

export const graphqlDiffsCases = () =>
  numberedGraphqlPairs().map(pair => graphqlCase(`gqd-${pair.number}`, pair, [pair.before, pair.after]))

// Plain GraphQL: the example schema of api-data-model, and the before side of the first case of each suite.
export function graphqlPlainCases() {
  const example = path.join(SAMPLES_ROOT, '..', 'api-data-model', 'test', 'resources', 'example.graphql')
  return [
    {
      id: 'gqp-00',
      title: 'Example schema of api-data-model',
      fixture: 'packages/api-data-model/test/resources/example.graphql',
      extension: 'graphql',
      sides: [prefixGraphqlRootFields(fs.readFileSync(example, 'utf8'), 'gqp_00')],
    },
    ...numberedGraphqlPairs().filter(pair => pair.number.endsWith('-01'))
      .map(pair => graphqlCase(`gqp-${pair.number.slice(0, 2)}`, pair, [pair.before])),
  ]
}

// ----- JSO -----

// A JSO value as the extension x-payload of one POST /orders operation (OpenAPI 3.0).
function wrapJso(value) {
  return {
    openapi: '3.0.3',
    info: { title: 'Orders', version: '1.0.0' },
    paths: { '/orders': { post: { 'x-payload': value, responses: { 200: { description: 'OK' } } } } },
  }
}

export function jsoDiffsCases() {
  return numberedCaseDirs(path.join(SAMPLES_ROOT, 'jso-diffs'), 'jso').map(({ caseDir, id }) => ({
    id,
    fixture: toPosix(path.relative(SAMPLES_ROOT, caseDir)),
    sides: ['before', 'after'].map(side => wrapJso(readYaml(caseFile(caseDir, side)))),
  }))
}
