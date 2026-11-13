// GraphQL schemas. APIHUB builds an operation ID from the root type and the field, so the builder prefixes the fields
// of the root types with the case ID (builders/regression.mjs, prefixGraphqlRootFields). The check parses the written
// schema and the fixture with graphql and compares their types and root fields, prefixes removed.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { REPO_ROOT, SAMPLES_ROOT, stableStringify } from '../lib.mjs'

let graphqlModule
const graphql = () =>
  (graphqlModule ??= createRequire(path.join(REPO_ROOT, 'frontend', 'graphapi', 'package.json'))('graphql'))
const COMPAT_GRAPHQL =
  path.join(REPO_ROOT, 'frontend', 'compatibility-suites', 'bin', 'comparison-base-suite', 'graphql')

function graphqlShape(sdl, prefix) {
  const schema = graphql().buildSchema(sdl)
  const roots = [schema.getQueryType(), schema.getMutationType(), schema.getSubscriptionType()].filter(Boolean)
  const strip = name => (prefix && name.startsWith(`${prefix}_`) ? name.slice(prefix.length + 1) : name)
  return {
    types: Object.keys(schema.getTypeMap()).filter(name => !name.startsWith('__')).sort(),
    roots: roots.flatMap(type => Object.keys(type.getFields()).map(field => `${type.name}.${strip(field)}`)).sort(),
    rootIds: roots.flatMap(type => Object.keys(type.getFields()).map(field => `${type.name}.${field}`)),
  }
}

// The source schema of a case: a GraphQL compatibility suite case, or the example schema of api-data-model.
function sourceSchema(item, side) {
  if (item.fixture.endsWith('example.graphql')) {
    return fs.readFileSync(path.join(SAMPLES_ROOT, '..', 'api-data-model', 'test', 'resources', 'example.graphql'),
      'utf8')
  }
  const match = item.fixture.match(/graphql\/([^/]+)\/(.+)$/)
  if (!match) return undefined
  return fs.readFileSync(path.join(COMPAT_GRAPHQL, match[1], match[2], `${['before', 'after'][side]}.graphql`), 'utf8')
}

const casePrefix = item => item.id.replace(/-/g, '_')

export default {
  name: 'GraphQL',
  matches: (content, item) => typeof content === 'string' && item.extension === 'graphql',
  lookFor: content => [...content.matchAll(/^\s*([A-Za-z_]\w*)\s*[(:]/gm)].map(match => match[1])
    .filter(name => /^[a-z]+_\d/.test(name)),
  ids: async (content, item) => graphqlShape(content, casePrefix(item)).rootIds.map(id => `root field ${id}`),
  async compare({ content, item, side }) {
    const source = sourceSchema(item, side)
    if (!source) return undefined
    const written = graphqlShape(content, casePrefix(item))
    const fixture = graphqlShape(source)
    return stableStringify([written.types, written.roots]) === stableStringify([fixture.types, fixture.roots])
      ? undefined
      : `the GraphQL schema differs from ${item.fixture}`
  },
}
