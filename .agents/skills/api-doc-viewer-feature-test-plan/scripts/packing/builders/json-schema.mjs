// Cases of the JSON Schema track (QA-JSS-*): each JSON Schema fixture, or before and after pair, becomes the
// application/json request body of POST /orders, as prepareJsonDiffSchema() of the stories puts it into an
// operation. The programmatic suites (combiners, value range) come from the builders the stories use.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  SAMPLES_ROOT,
  VIEWER_PACKAGE,
  YAML,
  caseFile,
  caseNumber,
  findCaseDirs,
  numberedCaseDirs,
  readYaml,
  toPosix,
} from '../lib.mjs'
import { registerTypeScriptHooks } from '../typescript-loader.mjs'

const OPENAPI_VERSIONS = { '3.0': '3.0.3', '3.1': '3.1.0' }

// One POST /orders operation whose request body is the schema.
export function wrapSchema(schema, { dialect = '3.0', summary, components } = {}) {
  return {
    openapi: OPENAPI_VERSIONS[dialect],
    info: { title: 'Orders', version: '1.0.0' },
    paths: {
      '/orders': {
        post: {
          ...(summary ? { summary } : {}),
          requestBody: { content: { 'application/json': { schema } } },
          responses: { 200: { description: 'OK' } },
        },
      },
    },
    ...(components ? { components } : {}),
  }
}

const readSchema = file => (file.endsWith('.json') ? JSON.parse(fs.readFileSync(file, 'utf8')) : readYaml(file))

// Plain fixture folders: every case folder with sample.yaml or sample.json.
export function plainFolderCases({ dir, code, dialect = '3.0' }) {
  return numberedCaseDirs(path.join(SAMPLES_ROOT, dir), code).map(({ caseDir, id }) => ({
    id,
    fixture: toPosix(path.relative(SAMPLES_ROOT, caseDir)),
    sides: [wrapSchema(readSchema(caseFile(caseDir, 'sample')), { dialect })],
  }))
}

// Diffs fixture folders: before.* and after.* hold the schemas.
export function diffsFolderCases({ dir, code, dialect = '3.0' }) {
  return numberedCaseDirs(path.join(SAMPLES_ROOT, dir), code).map(({ caseDir, id }) => ({
    id,
    fixture: toPosix(path.relative(SAMPLES_ROOT, caseDir)),
    sides: ['before', 'after'].map(side => wrapSchema(readSchema(caseFile(caseDir, side)), { dialect })),
  }))
}

// ----- Programmatic suites of the stories -----

const STORIES = path.join(VIEWER_PACKAGE, 'src', 'stories')
const STORIES_FIXTURE = 'packages/api-doc-viewer/src/stories'
let stories
async function loadStories() {
  registerTypeScriptHooks()
  const load = file => import(pathToFileURL(path.join(STORIES, file)).href)
  return {
    combinerPlain: await load('json-schema-suite/combiner-plain-samples.ts'),
    valueRangePlain: await load('json-schema-suite/value-range-plain-samples.ts'),
    combinerDiffs: await load('json-schema-diffs-suite/combiner-diff-case-definitions.ts'),
    valueRangeDiffs: await load('json-schema-diffs-suite/value-range-diff-samples.ts'),
    valueRangeDiffs31: await load('json-schema-diffs-suite/value-range-diff-oas-31-samples.ts'),
  }
}
stories = await loadStories()

const COMBINERS = [['oneOf', 'one'], ['anyOf', 'any'], ['allOf', 'all']]
const number = caseId => caseId.match(/^(\d+)-/)[1]

export function combinerPlainCases(code) {
  return COMBINERS.flatMap(([kind, short]) =>
    stories.combinerPlain.buildCombinerPlainProgrammaticSampleCases(kind).map(c => ({
      id: `${code}${short}-${number(c.caseId)}`,
      fixture: `${STORIES_FIXTURE}/json-schema-suite/combiner-plain-case-definitions.ts, ${kind} ${c.caseId}`,
      title: c.summary,
      sides: [wrapSchema(c.schema)],
    })))
}

// Value range: integer and number, in OAS 3.0 or (with the 3.1-only exclusive bounds) OAS 3.1.
export function valueRangePlainCases(code, dialect) {
  const build = dialect === '3.1'
    ? stories.valueRangePlain.buildValueRangePlainOas31ProgrammaticSampleCases
    : stories.valueRangePlain.buildValueRangePlainProgrammaticSampleCases
  return ["integer", "number"].flatMap(type => build({ type, includeOas31Only: dialect === "3.1" }).map(c => ({
    id: `${code}${type === 'integer' ? 'i' : 'n'}-${number(c.caseId)}`,
    fixture: `${STORIES_FIXTURE}/json-schema-suite/value-range-plain-case-definitions.ts, ${type} ${c.caseId}`,
    title: c.summary,
    sides: [wrapSchema(c.schema, { dialect })],
  })))
}

export function combinerDiffsCases(code) {
  return COMBINERS.flatMap(([kind, short]) =>
    stories.combinerDiffs.listCombinerDiffCases(kind).map(c => ({
      id: `${code}${short}-${number(c.caseId)}`,
      fixture: `${STORIES_FIXTURE}/json-schema-diffs-suite/combiner-diff-case-definitions.ts, ${kind} ${c.caseId}`,
      title: c.summary,
      sides: [wrapSchema(c.before), wrapSchema(c.after)],
    })))
}

export function valueRangeDiffsCases(code, dialect) {
  const build = dialect === '3.1'
    ? options => stories.valueRangeDiffs31.buildValueRangeDiffOas31ProgrammaticSampleCases({
      ...options,
      includeOas31Only: true,
    })
    : options => stories.valueRangeDiffs.buildValueRangeDiffProgrammaticSampleCases(options)
  return build({}).map(c => ({
    id: `${code}-${number(c.caseId)}`,
    fixture: `${STORIES_FIXTURE}/json-schema-diffs-suite/value-range-diff-case-definitions.ts, ${c.caseId}` +
      (dialect === '3.1' ? ' (OAS 3.1)' : ''),
    title: c.summary,
    sides: [wrapSchema(YAML.parse(c.beforeYaml), { dialect }), wrapSchema(YAML.parse(c.afterYaml), { dialect })],
  }))
}

// ----- AsyncAPI messages (host A) -----

// One AsyncAPI 3.0 document: a send operation "<id>-sendOrder" whose message carries the schema as its payload or
// its headers. The operation key carries the case prefix, because the operation ID is built from it.
function asyncApiDocument(id, schema, place) {
  return {
    asyncapi: '3.0.0',
    info: { title: 'Orders', version: '1.0.0' },
    channels: {
      orders: {
        address: 'orders.events',
        messages: { OrderEvent: { $ref: '#/components/messages/OrderEvent' } },
      },
    },
    operations: {
      [`${id}-sendOrder`]: {
        action: 'send',
        channel: { $ref: '#/channels/orders' },
        messages: [{ $ref: '#/channels/orders/messages/OrderEvent' }],
      },
    },
    components: {
      messages: {
        OrderEvent: {
          name: 'OrderEvent',
          ...(place === 'headers' ? { headers: schema, payload: { type: 'string' } } : { payload: schema }),
        },
      },
    },
  }
}

const ASYNC_MESSAGE_CASES = [
  ['json-schema-diffs/node-changes-summary/case-1-simple-properties', 'payload', 'Node changes summary in a payload'],
  ['json-schema-diffs/hiding-unchanged-rows/complex-object/2.2-primitive-props-added', 'payload',
    'Hiding unchanged rows in a payload'],
  ['json-schema-diffs/type-changes/object-properties/001-add-one-property-string', 'headers',
    'A property added to the headers'],
  ['json-schema-diffs/extensions/allof-object-two-properties/01-second-property-added', 'payload',
    'Extensions in a payload'],
  ['json-schema-diffs/type-changes/description-changes/001-description-added', 'payload',
    'A description added to a payload'],
]

export function asyncApiMessageCases() {
  return ASYNC_MESSAGE_CASES.map(([dir, place, title], index) => {
    const id = `jsa-${String(index + 1).padStart(2, '0')}`
    const caseDir = path.join(SAMPLES_ROOT, dir)
    return {
      id,
      title,
      fixture: dir,
      extension: 'yaml',
      sides: ['before', 'after'].map(side => asyncApiDocument(id, readSchema(caseFile(caseDir, side)), place)),
    }
  })
}

// ----- Standalone files for the Documents tab (host F) -----

// A root object whose properties are the fixtures of one or more folders: "case_<folder>_<number>".
function groupedSchema(title, dirs) {
  const properties = {}
  for (const dir of dirs) {
    const root = path.join(SAMPLES_ROOT, dir)
    for (const caseDir of findCaseDirs(root)) {
      const key = `case_${path.basename(dir).replace(/-/g, '_')}_${caseNumber(toPosix(path.relative(root, caseDir)))}`
      properties[key] = readSchema(caseFile(caseDir, 'sample'))
    }
  }
  return { title, type: 'object', properties }
}

// The circular chain of json-schema-diffs/type-changes/circular/007 as a standalone schema with definitions.
function circularStandalone() {
  const data = readYaml(path.join(SAMPLES_ROOT,
    'json-schema-diffs/type-changes/circular/007-chain-three-hop-description-updated/before.yaml'))
  const text = JSON.stringify({ ...data.beforeSchema, definitions: data.beforeAdditionalComponents.schemas })
  const schema = JSON.parse(text.replace(/#\/components\/schemas\//g, '#/definitions/'))
  delete schema.$ref
  return { title: 'Circular chain', type: 'object', properties: { root: { $ref: '#/definitions/ChainRoot' } },
    definitions: schema.definitions }
}

export function standaloneFileCases() {
  const performance = path.join(SAMPLES_ROOT, 'json-schema/performance-tests')
  const performanceFile = findCaseDirs(performance).map(dir => caseFile(dir, 'sample'))[0]
  const file = (id, title, fixture, content, extension = 'yaml') =>
    ({ id, title, fixture, extension, sides: [content] })
  return [
    file('jsf-01', 'All types: string, integer, number, boolean, array, object', 'json-schema/{string,integer,…}',
      groupedSchema('All types', ['json-schema/string', 'json-schema/integer', 'json-schema/number',
        'json-schema/boolean', 'json-schema/array', 'json-schema/object'])),
    file('jsf-02', 'Validations of every type', 'json-schema/*-validations',
      groupedSchema('Validations', ['json-schema/string-validations', 'json-schema/integer-validations',
        'json-schema/number-validations', 'json-schema/boolean-validations', 'json-schema/array-validations',
        'json-schema/object-validations']), 'json'),
    file('jsf-03', 'Combiners', 'json-schema/{oneOf,anyOf,allOf,combiner}',
      groupedSchema('Combiners',
        ['json-schema/oneOf', 'json-schema/anyOf', 'json-schema/allOf', 'json-schema/combiner'])),
    file('jsf-04', 'Extensions', 'json-schema/extensions', groupedSchema('Extensions', ['json-schema/extensions'])),
    file('jsf-05', 'Descriptions, Markdown included', 'json-schema/description',
      groupedSchema('Descriptions', ['json-schema/description'])),
    file('jsf-06', 'Cycles: a three-schema chain', 'json-schema-diffs/type-changes/circular/007 (before)',
      circularStandalone(), 'json'),
    file('jsf-07', 'Root oneOf: the root has no single type (fact J2)', 'new',
      { title: 'Root oneOf', oneOf: [{ type: 'string', description: 'A code' },
        { type: 'object', properties: { code: { type: 'string' }, label: { type: 'string' } } }] }),
    file('jsf-08', 'OAS 3.1 style type array at the root (fact J2)', 'new',
      { title: 'Type array', type: ['string', 'null'], description: 'A nullable string as a type array' }),
    file('jsf-09', 'Real-world schema of 68 KB', toPosix(path.relative(SAMPLES_ROOT, performanceFile)),
      readSchema(performanceFile), 'json'),
  ]
}
