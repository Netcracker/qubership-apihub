import { Column, ForeignKey, Realm, Schema, Table } from '@netcracker/qubership-apihub-ddlapi'
import { normalize, DDL_API_NORMALIZE_OPTIONS } from '../../src'
import { buildRealmAndAssertValid } from '../helpers/ddlapi'
import { commonOriginsCheck, TEST_ORIGINS_FLAG } from '../helpers'

// References between nodes. Foreign keys and index parts hold names; the only shared
// instances are named types, which must stay ===.
describe('ddlapi references', () => {
  const baseOptions = {
    ...DDL_API_NORMALIZE_OPTIONS,
    unify: false,
    originsFlag: TEST_ORIGINS_FLAG,
  }

  const tableByName = (realm: Realm, name: string): Table =>
    (realm.schemas[0] as Schema).tables!.find((t) => t.name === name)!

  it('keeps the names of two tables that reference each other', async () => {
    const realm = await buildRealmAndAssertValid(`
      CREATE TABLE a (id bigint PRIMARY KEY, b_id bigint REFERENCES b (id));
      CREATE TABLE b (id bigint PRIMARY KEY, a_id bigint REFERENCES a (id));
    `)

    const result = normalize(realm, baseOptions) as Realm

    const aFk = tableByName(result, 'a').foreignKeys![0] as ForeignKey
    const bFk = tableByName(result, 'b').foreignKeys![0] as ForeignKey
    // the normalized nodes carry an origins record under a symbol key
    expect(Array.from(aFk.columns!)).toEqual(['b_id'])
    expect(aFk.refTable).toMatchObject({ schema: 'public', name: 'b' })
    expect(Array.from(aFk.refColumns!)).toEqual(['id'])
    expect(bFk.refTable).toMatchObject({ schema: 'public', name: 'a' })

    commonOriginsCheck(result, { originsFlag: TEST_ORIGINS_FLAG })
  })

  it('homes the refTable origin at the foreign key, not at the referenced table', async () => {
    const realm = await buildRealmAndAssertValid(`
      CREATE TABLE a (id bigint PRIMARY KEY, b_id bigint REFERENCES b (id));
      CREATE TABLE b (id bigint PRIMARY KEY);
    `)
    const result = normalize(realm, baseOptions) as Realm

    const foreignKeys = tableByName(result, 'a').foreignKeys!
    const refTableOrigin = (foreignKeys[0] as any)[TEST_ORIGINS_FLAG].refTable[0]
    expect(refTableOrigin.value).toBe('refTable')
    expect(refTableOrigin.parent).toBe((foreignKeys as any)[TEST_ORIGINS_FLAG][0][0])
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

  it('keeps the column names of a composite index', async () => {
    const realm = await buildRealmAndAssertValid(`
      CREATE TABLE t (id bigint, name text);
      CREATE INDEX idx ON t (id, name);
    `)
    const result = normalize(realm, baseOptions) as Realm

    const index = tableByName(result, 't').indexes![0]
    expect(index.parts!.map((part) => part.column)).toEqual(['id', 'name'])

    commonOriginsCheck(result, { originsFlag: TEST_ORIGINS_FLAG })
  })
})
