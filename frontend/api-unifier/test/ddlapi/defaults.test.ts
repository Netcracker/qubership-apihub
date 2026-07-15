import { Realm, ReferenceOption } from '@netcracker/qubership-apihub-ddlapi'
import { denormalize, normalize, DDL_API_NORMALIZE_OPTIONS } from '../../src'
import { buildRealmAndAssertValid } from '../helpers/ddlapi'
import { TEST_DEFAULTS_FLAG, TEST_ORIGINS_FLAG, TEST_ORIGINS_FOR_DEFAULTS } from '../helpers'

// Simple primitive defaults: Index.unique=false, IndexPart.desc=false,
// FK onUpdate/onDelete='NO ACTION'. All reversible.
describe('ddlapi primitive defaults', () => {
  const baseOptions = {
    ...DDL_API_NORMALIZE_OPTIONS,
    originsFlag: TEST_ORIGINS_FLAG,
    defaultsFlag: TEST_DEFAULTS_FLAG,
    createOriginsForDefaults: () => TEST_ORIGINS_FOR_DEFAULTS,
  }

  const ddl = `
    CREATE TABLE users (id bigint PRIMARY KEY);
    CREATE TABLE orders (id bigint PRIMARY KEY, user_id bigint REFERENCES users (id));
    CREATE INDEX idx ON orders (user_id);
  `

  const orders = (realm: Realm) => realm.schemas[0].tables!.find((t) => t.name === 'orders')!

  it('adds unique=false, desc=false and NO ACTION referential actions when absent', async () => {
    const realm = await buildRealmAndAssertValid(ddl)
    const result = normalize(realm, baseOptions) as Realm

    const ordersTable = orders(result)
    const index = ordersTable.indexes!.find((i) => i.name === 'idx')!
    expect(index.unique).toBe(false)
    expect(index.parts![0].desc).toBe(false)

    const fk = ordersTable.foreignKeys![0]
    expect(fk.onUpdate).toBe(ReferenceOption.NoAction)
    expect(fk.onDelete).toBe(ReferenceOption.NoAction)
  })

  it('reverses those defaults on denormalize (canonical-minimal form)', async () => {
    const realm = await buildRealmAndAssertValid(ddl)
    const result = denormalize(normalize(realm, baseOptions), baseOptions) as Realm

    const ordersTable = orders(result)
    const index = ordersTable.indexes!.find((i) => i.name === 'idx')!
    expect(index).not.toHaveProperty('unique')
    expect(index.parts![0]).not.toHaveProperty('desc')

    const fk = ordersTable.foreignKeys![0]
    // buildFromDdl emits onUpdate/onDelete='NO ACTION' explicitly; denormalize strips
    // them as redundant defaults (canonical-minimal), so this differs from the raw source.
    expect(fk).not.toHaveProperty('onUpdate')
    expect(fk).not.toHaveProperty('onDelete')
    // non-default structure survives the round-trip
    expect(fk.refTable).toBeDefined()
    expect(fk.columns).toBeArrayOfSize(1)

    // The canonical form is stable: re-normalizing the minimal realm reproduces it.
    expect(normalize(result, DDL_API_NORMALIZE_OPTIONS)).toEqual(normalize(realm, DDL_API_NORMALIZE_OPTIONS))
  })

  it('preserves explicit non-default values', async () => {
    const realm = await buildRealmAndAssertValid(`
      CREATE TABLE users (id bigint PRIMARY KEY);
      CREATE TABLE orders (
        id bigint PRIMARY KEY,
        user_id bigint REFERENCES users (id) ON DELETE CASCADE
      );
      CREATE UNIQUE INDEX uq ON orders (user_id);
    `)
    const result = normalize(realm, baseOptions) as Realm

    const ordersTable = orders(result)
    const index = ordersTable.indexes!.find((i) => i.name === 'uq')!
    expect(index.unique).toBe(true)

    const fk = ordersTable.foreignKeys![0]
    expect(fk.onDelete).toBe(ReferenceOption.Cascade)
    // onUpdate was unspecified → still defaulted
    expect(fk.onUpdate).toBe(ReferenceOption.NoAction)
  })
})

// PK-aware nullability. A column with no clause is
// nullable, except a primary-key member which is implicitly NOT NULL.
describe('ddlapi PK-aware nullability', () => {
  const baseOptions = {
    ...DDL_API_NORMALIZE_OPTIONS,
    originsFlag: TEST_ORIGINS_FLAG,
    defaultsFlag: TEST_DEFAULTS_FLAG,
    createOriginsForDefaults: () => TEST_ORIGINS_FOR_DEFAULTS,
  }

  const columnsOf = (realm: Realm) => realm.schemas[0].tables![0].columns!
  const colNamed = (realm: Realm, name: string) => columnsOf(realm).find((c) => c.name === name)!

  it('defaults PK members to null:false and others to null:true; preserves explicit clauses', async () => {
    const realm = await buildRealmAndAssertValid(`
      CREATE TABLE t (
        id bigint PRIMARY KEY,
        name text,
        email text NOT NULL
      );
    `)
    const result = normalize(realm, baseOptions) as Realm

    // PK member → implicit NOT NULL
    expect(colNamed(result, 'id').type!.null).toBe(false)
    // non-PK, no clause → nullable
    expect(colNamed(result, 'name').type!.null).toBe(true)
    // explicit NOT NULL on a non-PK column → preserved (non-default, not synthesized)
    expect(colNamed(result, 'email').type!.null).toBe(false)
  })

  it('treats every column of a composite PK as NOT NULL by reference identity', async () => {
    const realm = await buildRealmAndAssertValid(`
      CREATE TABLE t (
        a bigint,
        b bigint,
        c text,
        PRIMARY KEY (a, b)
      );
    `)
    const result = normalize(realm, baseOptions) as Realm

    expect(colNamed(result, 'a').type!.null).toBe(false)
    expect(colNamed(result, 'b').type!.null).toBe(false)
    expect(colNamed(result, 'c').type!.null).toBe(true)
  })

  it('round-trips: synthesized nullability is stripped, explicit clauses survive', async () => {
    const realm = await buildRealmAndAssertValid(`
      CREATE TABLE t (
        id bigint PRIMARY KEY,
        name text,
        email text NOT NULL
      );
    `)
    const result = denormalize(normalize(realm, baseOptions), baseOptions) as Realm

    // id (PK, false=default) and name (true=default) had no clause in the source → stripped
    expect(colNamed(result, 'id').type).not.toHaveProperty('null')
    expect(colNamed(result, 'name').type).not.toHaveProperty('null')
    // email's explicit NOT NULL is a non-default for a non-PK column → preserved
    expect(colNamed(result, 'email').type!.null).toBe(false)

    expect(result).toEqual(realm)
  })

  it('keeps a primary-key columns shared instance consistent (one ColumnType mutated)', async () => {
    // The PK part and the table column are the same Column instance; setting null:false once
    // must be visible through both views.
    const realm = await buildRealmAndAssertValid('CREATE TABLE t (id bigint PRIMARY KEY);')
    const result = normalize(realm, baseOptions) as Realm
    const table = result.schemas[0].tables![0]
    const pkColumn = table.primaryKey!.parts![0].column!
    expect(pkColumn).toBe(table.columns![0])
    expect(pkColumn.type!.null).toBe(false)
  })
})
