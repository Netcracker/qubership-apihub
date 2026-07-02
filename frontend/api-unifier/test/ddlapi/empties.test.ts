import { Realm } from '@netcracker/qubership-apihub-ddlapi'
import { normalize, DDL_API_NORMALIZE_OPTIONS } from '../../src'
import { buildRealmAndAssertValid } from '../helpers/ddlapi'
import { TEST_DEFAULTS_FLAG, TEST_ORIGINS_FLAG, TEST_ORIGINS_FOR_DEFAULTS } from '../helpers'

// Empty-collection normalization. Absent array properties become `[]`;
// primaryKey / type / default absence is meaningful and preserved.
describe('ddlapi empty collections', () => {
  const baseOptions = {
    ...DDL_API_NORMALIZE_OPTIONS,
    originsFlag: TEST_ORIGINS_FLAG,
    defaultsFlag: TEST_DEFAULTS_FLAG,
    createOriginsForDefaults: () => TEST_ORIGINS_FOR_DEFAULTS,
  }

  it('fills absent realm/schema/table/column arrays with []', async () => {
    const realm = await buildRealmAndAssertValid('CREATE TABLE t(id int)')
    const result = normalize(realm, baseOptions) as Realm

    expect(result.attrs).toEqual([])
    expect(result.objects).toEqual([])

    const schema = result.schemas[0]
    expect(schema.attrs).toEqual([])
    expect(schema.objects).toEqual([])
    expect(schema.tables).toBeArrayOfSize(1)

    const table = schema.tables![0]
    expect(table.indexes).toEqual([])
    expect(table.foreignKeys).toEqual([])
    expect(table.attrs).toEqual([])
    expect(table.objects).toEqual([])
    expect(table.deps).toEqual([])
    expect(table.columns).toBeArrayOfSize(1)

    expect(table.columns![0].attrs).toEqual([])
  })

  it('does not synthesize primaryKey / type / default when absent (meaningful absence)', async () => {
    // a column with no type clause is meaningful; primaryKey absence means "no PK".
    const realm = await buildRealmAndAssertValid('CREATE TABLE t(id int)')
    const result = normalize(realm, baseOptions) as Realm

    const table = result.schemas[0].tables![0]
    expect(table).not.toHaveProperty('primaryKey')
    expect(table.columns![0]).not.toHaveProperty('default')
  })

  it('fills index parts/attrs with [] when an index has none materialized', async () => {
    const realm = await buildRealmAndAssertValid(`
      CREATE TABLE t (id int, name text);
      CREATE INDEX idx ON t (id);
    `)
    const result = normalize(realm, baseOptions) as Realm
    const index = result.schemas[0].tables![0].indexes![0]
    expect(index.attrs).toEqual([])
    expect(index.parts).toBeArrayOfSize(1)
    expect(index.parts![0].attrs).toEqual([])
  })
})
