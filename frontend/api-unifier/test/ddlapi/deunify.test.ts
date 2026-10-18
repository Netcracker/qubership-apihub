import { Realm } from '@netcracker/qubership-apihub-ddlapi'
import { denormalize, normalize, DDL_API_NORMALIZE_OPTIONS } from '../../src'
import { buildRealmAndAssertValid } from '../helpers/ddlapi'
import { TEST_DEFAULTS_FLAG, TEST_ORIGINS_FLAG, TEST_ORIGINS_FOR_DEFAULTS } from '../helpers'

// Reversibility. denormalize(normalize(realm)) is structurally equal to
// the source minus synthetics; intra-document shared refs are preserved (===).
describe('ddlapi denormalize (round-trip)', () => {
  const baseOptions = {
    ...DDL_API_NORMALIZE_OPTIONS,
    originsFlag: TEST_ORIGINS_FLAG,
    defaultsFlag: TEST_DEFAULTS_FLAG,
    createOriginsForDefaults: () => TEST_ORIGINS_FOR_DEFAULTS,
  }

  const roundTrip = (realm: Realm): Realm =>
    denormalize(normalize(realm, baseOptions), baseOptions) as Realm

  it('removes synthetic empty arrays so the result equals the source', async () => {
    const realm = await buildRealmAndAssertValid('CREATE TABLE t(id int)')
    const result = roundTrip(realm)

    const table = result.schemas[0].tables![0]
    expect(table).not.toHaveProperty('attrs')
    expect(table).not.toHaveProperty('indexes')
    expect(table).not.toHaveProperty('foreignKeys')
    expect(result).not.toHaveProperty([TEST_ORIGINS_FLAG])

    // Whole-document structural equality with the source (no synthetics remain).
    expect(result).toEqual(realm)
  })

  it('preserves intra-document shared references after round-trip', async () => {
    const realm = await buildRealmAndAssertValid(`
      CREATE TYPE mood AS ENUM ('happy', 'sad');
      CREATE TABLE t (id bigint, m mood);
    `)
    const result = roundTrip(realm)

    const schema = result.schemas[0]
    const column = schema.tables![0].columns!.find((c) => c.name === 'm')!
    expect(column.type!.type).toBe(schema.objects!.find((o) => o.kind === 'EnumType'))
  })

  it('round-trips the names held by foreign keys and index parts', async () => {
    const realm = await buildRealmAndAssertValid(`
      CREATE TABLE a (id bigint PRIMARY KEY, b_id bigint REFERENCES b (id));
      CREATE TABLE b (id bigint PRIMARY KEY, a_id bigint REFERENCES a (id));
      CREATE INDEX idx ON a (id, b_id);
    `)
    const result = roundTrip(realm)

    const a = result.schemas[0].tables!.find((t) => t.name === 'a')!
    const b = result.schemas[0].tables!.find((t) => t.name === 'b')!
    expect(a.foreignKeys![0]).toMatchObject({
      columns: ['b_id'],
      refTable: { schema: 'public', name: 'b' },
      refColumns: ['id'],
    })
    expect(b.foreignKeys![0].refTable).toEqual({ schema: 'public', name: 'a' })
    expect(a.indexes![0].parts).toEqual([{ seqNo: 0, column: 'id' }, { seqNo: 1, column: 'b_id' }])
  })
})
