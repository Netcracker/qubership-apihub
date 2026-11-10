// DDL scripts (PostgreSQL). APIHUB identifies a table by its schema and name, so the builder moves every object into
// schemas of the case (builders/regression.mjs, prefixDdlSchemas). The check parses the written script and the fixture
// with ddlapi and compares the models with the schema names mapped back.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { REPO_ROOT, stableStringify } from '../lib.mjs'

let parser
const ddlParser = () =>
  (parser ??= createRequire(import.meta.url)(path.join(REPO_ROOT, 'frontend', 'ddlapi', 'dist', 'parser.cjs')))

// The parsed model as JSON with the case schemas renamed back ("ddp_x" -> "public", "ddp_x_custom" -> "custom").
async function ddlModel(sql, prefix) {
  const realm = await ddlParser().buildFromDdl(sql)
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

const casePrefix = item => item.id.replace(/-/g, '_')

export default {
  name: 'DDL',
  matches: (content, item) => typeof content === 'string' && item.extension === 'sql',
  lookFor: content => [...content.matchAll(/CREATE\s+(?:UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."]+)/gi)]
    .map(match => `table ${match[1]}`),
  async ids(content, item) {
    const { realm } = await ddlModel(content, casePrefix(item))
    const schemas = realm.schemas ?? []
    // PostgreSQL truncates identifiers longer than 63 bytes: a long case ID must not make two schemas one.
    const tooLong = schemas.find(schema => schema.name.length > 63)
    if (tooLong) throw new Error(`schema name ${tooLong.name} is longer than 63 characters`)
    return schemas.flatMap(schema => (schema.tables ?? []).map(table => `table ${schema.name}.${table.name}`))
  },
  async compare({ content, item, fixtureFile }) {
    if (!fixtureFile) return undefined
    const written = await ddlModel(content, casePrefix(item))
    const fixture = await ddlModel(fs.readFileSync(fixtureFile, 'utf8'))
    return written.text === fixture.text ? undefined : `the DDL model differs from ${fixtureFile}`
  },
}
