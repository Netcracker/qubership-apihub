import { Column, ForeignKey, Realm, Schema, Table } from '@netcracker/qubership-apihub-ddlapi'
import { normalize, DDL_API_NORMALIZE_OPTIONS } from '../../src'
import { buildRealmAndAssertValid } from '../helpers/ddlapi'
import { commonOriginsCheck, TEST_ORIGINS_FLAG } from '../helpers'

// reference edges & cycles. Shared instances must stay ===, cyclic FKs
// must not infinite-loop, and reference-edge origins must point at the definition site.
describe('ddlapi references', () => {
  const baseOptions = {
    ...DDL_API_NORMALIZE_OPTIONS,
    unify: false,
    originsFlag: TEST_ORIGINS_FLAG,
  }

  const tableByName = (realm: Realm, name: string): Table =>
    (realm.schemas[0] as Schema).tables!.find((t) => t.name === name)!

  it('handles a cyclic FK graph without infinite recursion and keeps shared refs ===', async () => {
    const realm = await buildRealmAndAssertValid(`
      CREATE TABLE a (id bigint PRIMARY KEY, b_id bigint REFERENCES b (id));
      CREATE TABLE b (id bigint PRIMARY KEY, a_id bigint REFERENCES a (id));
    `)

    const result = normalize(realm, baseOptions) as Realm

    const a = tableByName(result, 'a')
    const b = tableByName(result, 'b')
    const aFk = a.foreignKeys![0] as ForeignKey
    const bFk = b.foreignKeys![0] as ForeignKey

    // cycle preserved on the clone: a → b → a are the cloned table instances
    expect(aFk.refTable).toBe(b)
    expect(bFk.refTable).toBe(a)
    // FK column lists reuse the actual table column instances
    expect(aFk.columns![0]).toBe(a.columns!.find((c) => c.name === 'b_id'))
    expect(aFk.refColumns![0]).toBe(b.columns!.find((c) => c.name === 'id'))

    commonOriginsCheck(result, { originsFlag: TEST_ORIGINS_FLAG })
  })

  it('points a reference-edge origin at the target definition site, not the referrer', async () => {
    const realm = await buildRealmAndAssertValid(`
      CREATE TABLE a (id bigint PRIMARY KEY, b_id bigint REFERENCES b (id));
      CREATE TABLE b (id bigint PRIMARY KEY);
    `)
    const result = normalize(realm, baseOptions) as Realm

    const tablesArr = result.schemas[0].tables as Table[]
    const bIndex = tablesArr.findIndex((t) => t.name === 'b')
    const a = tableByName(result, 'a')
    const aFk = a.foreignKeys![0] as ForeignKey

    // fk.refTable's origin is the very ChainItem interned for schemas[0].tables[bIndex].
    const refTableOrigin = (aFk as any)[TEST_ORIGINS_FLAG].refTable[0]
    const homeOrigin = (tablesArr as any)[TEST_ORIGINS_FLAG][bIndex][0]
    expect(refTableOrigin).toBe(homeOrigin)
  })

  it('shares the enum type instance between schema.objects and the column type', async () => {
    const realm = await buildRealmAndAssertValid(`
      CREATE TYPE mood AS ENUM ('happy', 'sad');
      CREATE TABLE c (m mood);
    `)
    const result = normalize(realm, baseOptions) as Realm

    const schema = result.schemas[0]
    const enumObject = schema.objects!.find((o: any) => o.kind === 'EnumType')
    const column = tableByName(result, 'c').columns!.find((c) => c.name === 'm') as Column
    expect(column.type!.type).toBe(enumObject)

    commonOriginsCheck(result, { originsFlag: TEST_ORIGINS_FLAG })
  })

  it('handles a composite index whose parts reuse table column instances', async () => {
    const realm = await buildRealmAndAssertValid(`
      CREATE TABLE t (id bigint, name text);
      CREATE INDEX idx ON t (id, name);
    `)
    const result = normalize(realm, baseOptions) as Realm

    const t = tableByName(result, 't')
    const index = t.indexes![0]
    expect(index.parts).toHaveLength(2)
    expect(index.parts![0].column).toBe(t.columns!.find((c) => c.name === 'id'))
    expect(index.parts![1].column).toBe(t.columns!.find((c) => c.name === 'name'))

    commonOriginsCheck(result, { originsFlag: TEST_ORIGINS_FLAG })
  })
})
