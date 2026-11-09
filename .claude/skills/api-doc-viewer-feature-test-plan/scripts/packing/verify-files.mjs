// Checks of the "files" packages, called by verify.mjs. Each written file must equal its case, the renaming
// must keep the fixture otherwise unchanged, and the IDs APIHUB builds must not repeat within one version:
// - AsyncAPI: without the case prefix of the operation keys, the document equals the fixture; operation keys are
//   unique in a version;
// - DDL: ddlapi parses the written script and the fixture into the same model, schema names aside; tables
//   (schema plus name) are unique in a version;
// - GraphQL: graphql parses both into the same types, root field prefixes aside; root fields are unique.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { OUTPUT_ROOT, REPO_ROOT, SAMPLES_ROOT, VERSIONS, YAML, caseFileContent, stableStringify } from './lib.mjs'

const ddlParser = createRequire(import.meta.url)(path.join(REPO_ROOT, 'frontend', 'ddlapi', 'dist', 'parser.cjs'))
const graphql = createRequire(path.join(REPO_ROOT, 'frontend', 'graphapi', 'package.json'))('graphql')
const COMPAT_GRAPHQL =
  path.join(REPO_ROOT, 'frontend', 'compatibility-suites', 'bin', 'comparison-base-suite', 'graphql')
const SIDE_FILES = { plain: ['sample', 'document'], diffs: ['before', 'after'] }

// The fixture file of a case side, when the case comes from a fixture folder of api-doc-viewer.
function fixtureFile(item, layout, side) {
  const dir = path.join(SAMPLES_ROOT, item.fixture)
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return undefined
  const names = layout === 'plain' ? SIDE_FILES.plain : [SIDE_FILES.diffs[side]]
  for (const name of names) {
    const file = fs.readdirSync(dir).find(f => f.startsWith(`${name}.`))
    if (file) return path.join(dir, file)
  }
  return undefined
}

// ----- AsyncAPI -----

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

// ----- DDL -----

// The parsed model as JSON with the case schemas renamed back ("ddp_x" -> "public", "ddp_x_custom" -> "custom").
async function ddlModel(sql, prefix) {
  const realm = await ddlParser.buildFromDdl(sql)
  let text = stableStringify(realm)
  if (prefix) {
    text = text.replaceAll(`"${prefix}_`, '"').replaceAll(`"${prefix}"`, '"public"')
      .replaceAll(`${prefix}_`, '').replaceAll(`${prefix}.`, 'public.')
  }
  const model = JSON.parse(text)
  model.schemas = (model.schemas ?? []).filter(schema => (schema.tables ?? []).length || (schema.objects ?? []).length)
    .sort((a, b) => a.name.localeCompare(b.name))
  return { text: stableStringify(model), realm }
}

function ddlTableIds(realm) {
  return (realm.schemas ?? []).flatMap(schema => (schema.tables ?? []).map(table => `${schema.name}.${table.name}`))
}

// ----- GraphQL -----

function graphqlShape(sdl, prefix) {
  const schema = graphql.buildSchema(sdl)
  const roots = [schema.getQueryType(), schema.getMutationType(), schema.getSubscriptionType()].filter(Boolean)
  const strip = name => (prefix && name.startsWith(`${prefix}_`) ? name.slice(prefix.length + 1) : name)
  return {
    types: Object.keys(schema.getTypeMap()).filter(name => !name.startsWith('__')).sort(),
    roots: roots.flatMap(type => Object.keys(type.getFields()).map(field => `${type.name}.${strip(field)}`)).sort(),
    rootIds: roots.flatMap(type => Object.keys(type.getFields()).map(field => `${type.name}.${field}`)),
  }
}

function graphqlFixture(item, side) {
  if (item.fixture.endsWith('example.graphql')) {
    const example = path.join(SAMPLES_ROOT, '..', 'api-data-model', 'test', 'resources', 'example.graphql')
    return fs.readFileSync(example, 'utf8')
  }
  const [, suiteId, testId] = item.fixture.match(/graphql\/([^/]+)\/(.+)$/)
  return fs.readFileSync(path.join(COMPAT_GRAPHQL, suiteId, testId, `${['before', 'after'][side]}.graphql`), 'utf8')
}

export async function checkFilesPackage(definition, cases, fail) {
  const versions = VERSIONS[definition.layout]
  let checked = 0
  for (const [side, version] of versions.entries()) {
    const ids = new Map()
    const claim = (id, owner) => {
      if (ids.has(id)) fail(`${definition.name} ${version}: ${id} of ${owner} repeats ${ids.get(id)}`)
      ids.set(id, owner)
    }
    for (const item of cases) {
      const file = path.join(OUTPUT_ROOT, definition.name, version, `${item.id}.${item.extension}`)
      if (!fs.existsSync(file)) {
        fail(`${definition.name}: ${file} is missing`)
        continue
      }
      if (fs.readFileSync(file, 'utf8') !== caseFileContent(item, side)) fail(`${definition.name}: ${file} differs`)
      const content = item.sides[side]
      const original = fixtureFile(item, definition.layout, side)
      if (item.extension === 'yaml' && content.asyncapi) {
        for (const key of Object.keys(content.operations ?? {})) claim(`operation ${key}`, item.id)
        // QA-JSS-ASYNC builds its documents around JSON Schema fixtures: only AsyncAPI fixtures are compared.
        const fixture = original && YAML.parse(fs.readFileSync(original, 'utf8'))
        const unprefixed = withoutOperationPrefix(content, item.id)
        if (fixture?.asyncapi && stableStringify(unprefixed) !== stableStringify(fixture)) {
          fail(`${definition.name} ${item.id} ${version}: differs from ${original} beyond the operation keys`)
        }
      } else if (item.extension === 'sql') {
        const prefix = item.id.replace(/-/g, '_')
        const written = await ddlModel(content, prefix)
        for (const id of ddlTableIds(written.realm)) claim(`table ${id}`, item.id)
        // PostgreSQL truncates identifiers longer than 63 bytes; a long case ID must not make two schemas one.
        for (const schema of written.realm.schemas ?? []) {
          if (schema.name.length > 63) fail(`${definition.name} ${item.id}: schema name ${schema.name} is too long`)
        }
        if (original) {
          const fixture = await ddlModel(fs.readFileSync(original, 'utf8'))
          if (written.text !== fixture.text) {
            fail(`${definition.name} ${item.id} ${version}: the DDL model differs from ${original}`)
          }
        }
      } else if (item.extension === 'graphql') {
        const prefix = item.id.replace(/-/g, '_')
        const written = graphqlShape(content, prefix)
        for (const id of written.rootIds) claim(`root field ${id}`, item.id)
        const fixture = graphqlShape(graphqlFixture(item, side))
        if (stableStringify([written.types, written.roots]) !== stableStringify([fixture.types, fixture.roots])) {
          fail(`${definition.name} ${item.id} ${version}: the GraphQL schema differs from ${item.fixture}`)
        }
      }
      checked++
    }
  }
  return checked
}
