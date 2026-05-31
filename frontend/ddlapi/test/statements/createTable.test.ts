import { buildFromDdl } from '../../src'
import { loadSql } from '../helpers/loadSql'
import { TypeKind, AttrKind, DdlErrorKind } from '../../src/constants'
import { PgAttrKind, PgObjectKind } from '../../src/postgres.constants'

describe('createTable', () => {
  describe('column types', () => {
    test('column-types-numeric: maps all numeric types', async () => {
      const realm = await buildFromDdl(loadSql('create-table/column-types-numeric.sql'))
      const cols = realm.schemas[0]!.tables![0]!.columns!
      expect(cols[0]!.type!.type.kind).toBe(TypeKind.IntegerType)
      expect(cols[0]!.type!.type.t).toBe('smallint')
      expect(cols[1]!.type!.type.t).toBe('integer')
      expect(cols[2]!.type!.type.t).toBe('bigint')
      expect(cols[3]!.type!.type.kind).toBe(TypeKind.FloatType)
      expect(cols[3]!.type!.type.t).toBe('real')
      expect(cols[4]!.type!.type.t).toBe('double precision')
      expect(cols[5]!.type!.type.kind).toBe(TypeKind.DecimalType)
      expect((cols[5]!.type!.type as { precision: number }).precision).toBe(10)
      expect((cols[5]!.type!.type as { scale: number }).scale).toBe(2)
      expect(cols[6]!.type!.type.kind).toBe(TypeKind.DecimalType)
    })

    test('column-types-character: maps text types', async () => {
      const realm = await buildFromDdl(loadSql('create-table/column-types-character.sql'))
      const cols = realm.schemas[0]!.tables![0]!.columns!
      const kinds = cols.map(c => c.type!.type.kind)
      expect(new Set(kinds)).toEqual(new Set([TypeKind.StringType]))
      const t0 = cols[0]!.type!.type as { size: number }
      expect(t0.size).toBe(255)   // varchar(255)
    })

    test('column-types-other: bytea, boolean, json, jsonb, uuid', async () => {
      const realm = await buildFromDdl(loadSql('create-table/column-types-other.sql'))
      const cols = realm.schemas[0]!.tables![0]!.columns!
      expect(cols[0]!.type!.type.kind).toBe(TypeKind.BinaryType)  // bytea
      expect(cols[1]!.type!.type.kind).toBe(TypeKind.BoolType)    // boolean
      expect(cols[2]!.type!.type.kind).toBe(TypeKind.JSONType)    // json
      expect(cols[3]!.type!.type.kind).toBe(TypeKind.JSONType)    // jsonb
      expect(cols[4]!.type!.type.kind).toBe(TypeKind.UUIDType)    // uuid
    })
  })

  describe('nullability', () => {
    test('NOT NULL, NULL explicit, and absent', async () => {
      const realm = await buildFromDdl(loadSql('create-table/nullability.sql'))
      const cols = realm.schemas[0]!.tables![0]!.columns!
      // id bigint NOT NULL
      expect(cols[0]!.type!.null).toBe(false)
      // code text NULL
      expect(cols[1]!.type!.null).toBe(true)
      // status text DEFAULT 'active' — no nullability clause
      expect(cols[2]!.type!.null).toBeUndefined()
    })

    test('DEFAULT expressions are captured', async () => {
      const realm = await buildFromDdl(loadSql('create-table/nullability.sql'))
      const cols = realm.schemas[0]!.tables![0]!.columns!
      // status text DEFAULT 'active'
      expect(cols[2]!.default).toBeDefined()
      // created_at timestamp DEFAULT now()
      expect(cols[4]!.default).toBeDefined()
    })
  })

  describe('primary key', () => {
    test('primary-key-inline: single-column inline PK', async () => {
      const realm = await buildFromDdl(loadSql('create-table/primary-key-inline.sql'))
      const table = realm.schemas[0]!.tables![0]!
      expect(table.primaryKey).toBeDefined()
      expect(table.primaryKey!.parts).toHaveLength(1)
      // Column ref resolved
      expect(table.primaryKey!.parts![0]!.c).toBeDefined()
      expect(table.primaryKey!.parts![0]!.c!.name).toBe('id')
    })

    test('primary-key-composite: table-level PK with two columns', async () => {
      const realm = await buildFromDdl(loadSql('create-table/primary-key-composite.sql'))
      const table = realm.schemas[0]!.tables![0]!
      expect(table.primaryKey!.parts).toHaveLength(2)
      expect(table.primaryKey!.parts![0]!.c!.name).toBe('tenant_id')
      expect(table.primaryKey!.parts![1]!.c!.name).toBe('user_id')
    })

    test('primary-key-named: named PK constraint', async () => {
      const realm = await buildFromDdl(loadSql('create-table/primary-key-named.sql'))
      const table = realm.schemas[0]!.tables![0]!
      expect(table.primaryKey).toBeDefined()
      expect(table.primaryKey!.name).toBeDefined()
    })
  })

  describe('unique constraints', () => {
    test('unique-inline: creates unique index with resolved column', async () => {
      const realm = await buildFromDdl(loadSql('create-table/unique-inline.sql'))
      const table = realm.schemas[0]!.tables![0]!
      const uq = table.indexes!.find(i => i.unique)
      expect(uq).toBeDefined()
      expect(uq!.parts![0]!.c).toBeDefined()
    })

    test('unique-table-level: table-level UNIQUE creates index', async () => {
      const realm = await buildFromDdl(loadSql('create-table/unique-table-level.sql'))
      const table = realm.schemas[0]!.tables![0]!
      // The table-level UNIQUE (phone) creates an Index in table.indexes
      const uqIdx = table.indexes!.find(i => i.unique)
      expect(uqIdx).toBeDefined()
      expect(uqIdx!.parts![0]!.c!.name).toBe('phone')
    })

    test('unique-nulls-not-distinct: sets IndexNullsDistinct attr', async () => {
      const realm = await buildFromDdl(loadSql('create-table/unique-nulls-not-distinct.sql'))
      const table = realm.schemas[0]!.tables![0]!
      const uqIdx = table.indexes!.find(i => i.unique)
      expect(uqIdx).toBeDefined()
      const nd = uqIdx!.attrs!.find(a => a.kind === PgAttrKind.IndexNullsDistinct)
      expect(nd).toBeDefined()
      expect((nd as unknown as { V: boolean }).V).toBe(false)
    })
  })

  describe('check constraints', () => {
    test('check-inline-anonymous: stores Check attr on column', async () => {
      const realm = await buildFromDdl(loadSql('create-table/check-inline-anonymous.sql'))
      const cols = realm.schemas[0]!.tables![0]!.columns!
      const ageCol = cols.find(c => c.name === 'age')!
      const chk = ageCol.attrs!.find(a => a.kind === AttrKind.Check)
      expect(chk).toBeDefined()
      expect((chk as { expr: string }).expr).toContain('age')
    })

    test('check-inline-named: named check constraint stores name', async () => {
      const realm = await buildFromDdl(loadSql('create-table/check-inline-named.sql'))
      const cols = realm.schemas[0]!.tables![0]!.columns!
      const priceCol = cols.find(c => c.name === 'price')!
      const chk = priceCol.attrs!.find(a => a.kind === AttrKind.Check) as { name?: string; expr: string } | undefined
      expect(chk!.name).toBe('positive_price')
    })

    test('check-table-level: stores Check in table.attrs', async () => {
      const realm = await buildFromDdl(loadSql('create-table/check-table-level.sql'))
      const table = realm.schemas[0]!.tables![0]!
      const chk = table.attrs!.find(a => a.kind === AttrKind.Check)
      expect(chk).toBeDefined()
    })
  })

  describe('foreign keys', () => {
    test('foreign-key-inline: resolves refTable and refColumns', async () => {
      const realm = await buildFromDdl(loadSql('create-table/foreign-key-inline.sql'))
      const schema = realm.schemas[0]!
      const orders = schema.tables!.find(t => t.name === 'orders')!
      expect(orders.foreignKeys).toHaveLength(1)
      const fk = orders.foreignKeys![0]!
      // refTable is the customers table instance
      expect(fk.refTable).toBeDefined()
      expect(fk.refTable!.name).toBe('customers')
      expect(fk.refColumns).toHaveLength(1)
      expect(fk.refColumns![0]!.name).toBe('id')
      // Referential equality: refTable === schema.tables.customers
      const customers = schema.tables!.find(t => t.name === 'customers')!
      expect(fk.refTable).toBe(customers)
    })

    test('foreign-key-composite: multi-column FK', async () => {
      const realm = await buildFromDdl(loadSql('create-table/foreign-key-composite.sql'))
      const schema = realm.schemas[0]!
      const child = schema.tables!.find(t => t.foreignKeys?.length)!
      expect(child.foreignKeys![0]!.columns).toHaveLength(2)
    })
  })

  describe('generated columns', () => {
    test('generated-columns-stored: stores GeneratedExpr attr', async () => {
      const realm = await buildFromDdl(loadSql('create-table/generated-columns-stored.sql'))
      const cols = realm.schemas[0]!.tables![0]!.columns!
      const fullName = cols.find(c => c.name === 'full_name')!
      const genExpr = fullName.attrs!.find(a => a.kind === AttrKind.GeneratedExpr)
      expect(genExpr).toBeDefined()
      expect((genExpr as { type?: string }).type).toBe('STORED')
    })
  })

  describe('identity columns', () => {
    test('identity-always: stores Identity attr with generation ALWAYS', async () => {
      const realm = await buildFromDdl(loadSql('create-table/identity-always.sql'))
      const cols = realm.schemas[0]!.tables![0]!.columns!
      const idCol = cols.find(c => c.name === 'id')!
      const ident = idCol.attrs!.find(a => a.kind === PgAttrKind.Identity) as { generation: string } | undefined
      expect(ident).toBeDefined()
      expect(ident!.generation).toBe('ALWAYS')
    })

    test('identity-by-default: stores Identity attr with generation BY DEFAULT', async () => {
      const realm = await buildFromDdl(loadSql('create-table/identity-by-default.sql'))
      const cols = realm.schemas[0]!.tables![0]!.columns!
      const idCol = cols.find(c => c.name === 'id')!
      const ident = idCol.attrs!.find(a => a.kind === PgAttrKind.Identity) as { generation: string; seqStart?: number } | undefined
      expect(ident!.generation).toBe('BY DEFAULT')
      expect(ident!.seqStart).toBe(100)
    })
  })

  describe('serial pseudo-types', () => {
    test('serial: serial maps to IntegerType with t=serial', async () => {
      const realm = await buildFromDdl(loadSql('create-table/serial.sql'))
      const cols = realm.schemas[0]!.tables![0]!.columns!
      expect(cols[0]!.type!.type.kind).toBe(TypeKind.IntegerType)
      expect(cols[0]!.type!.type.t).toBe('smallserial')
      expect(cols[1]!.type!.type.t).toBe('serial')
      expect(cols[2]!.type!.type.t).toBe('bigserial')
    })
  })

  describe('table-level attrs', () => {
    test('partition-range: stores Partition attr', async () => {
      const realm = await buildFromDdl(loadSql('create-table/partition-range.sql'))
      const table = realm.schemas[0]!.tables![0]!
      const part = table.attrs!.find(a => a.kind === PgAttrKind.Partition) as { T: string; parts: unknown[] } | undefined
      expect(part).toBeDefined()
      expect(part!.T).toBe('RANGE')
      expect(part!.parts).toHaveLength(1)
    })

    test('inheritance: stores Inherits attr', async () => {
      const realm = await buildFromDdl(loadSql('create-table/inheritance.sql'))
      const schema = realm.schemas[0]!
      const capitals = schema.tables!.find(t => t.name === 'capitals')!
      const inh = capitals.attrs!.find(a => a.kind === PgAttrKind.Inherits) as { parents: string[] } | undefined
      expect(inh).toBeDefined()
      expect(inh!.parents).toContain('cities')
    })

    test('storage-params: stores StorageParams attr', async () => {
      const realm = await buildFromDdl(loadSql('create-table/storage-params.sql'))
      const table = realm.schemas[0]!.tables![0]!
      const sp = table.attrs!.find(a => a.kind === PgAttrKind.StorageParams) as { params: Record<string, string> } | undefined
      expect(sp).toBeDefined()
      expect(sp!.params['fillfactor']).toBeDefined()
    })
  })

  describe('LIKE clause', () => {
    test('like-including-all: LIKE copies columns from source table', async () => {
      const realm = await buildFromDdl(loadSql('create-table/like-including-all.sql'))
      const schema = realm.schemas[0]!
      const log = schema.tables!.find(t => t.name === 'accounts_log')!
      // accounts has id, email, balance — all should be copied to accounts_log
      const colNames = log.columns!.map(c => c.name)
      expect(colNames).toContain('id')
      expect(colNames).toContain('email')
      expect(colNames).toContain('balance')
    })

    test('like-including-all: LIKE-copied columns are fresh objects (not same instance)', async () => {
      const realm = await buildFromDdl(loadSql('create-table/like-including-all.sql'))
      const schema = realm.schemas[0]!
      const accounts = schema.tables!.find(t => t.name === 'accounts')!
      const log = schema.tables!.find(t => t.name === 'accounts_log')!
      // Fresh column objects
      const srcId = accounts.columns!.find(c => c.name === 'id')!
      const logId = log.columns!.find(c => c.name === 'id')!
      expect(logId).not.toBe(srcId)
      // But type reference is shared
      expect(logId.type!.type).toBe(srcId.type!.type)
    })

    test('like source not in DDL: emits unresolved-like-source and table absent', async () => {
      const errors: unknown[] = []
      const realm = await buildFromDdl(
        `CREATE TABLE copy_of_missing (LIKE missing_table INCLUDING ALL)`,
        { onError: e => errors.push(e) },
      )
      expect(errors).toHaveLength(1)
      expect((errors[0] as { kind: string }).kind).toBe(DdlErrorKind.UnresolvedLikeSource)
      // Table is absent from realm
      const schema = realm.schemas[0]
      expect(schema?.tables?.find(t => t.name === 'copy_of_missing')).toBeUndefined()
    })
  })

  describe('exclude constraint', () => {
    test('exclude-constraint: stores ExcludeConstraint in table.objects', async () => {
      const realm = await buildFromDdl(loadSql('create-table/exclude-constraint.sql'))
      const table = realm.schemas[0]!.tables![0]!
      const excl = table.objects!.find(o => o.kind === PgObjectKind.ExcludeConstraint)
      expect(excl).toBeDefined()
    })
  })

  describe('collation', () => {
    test('collation: stores Collation attr on column', async () => {
      const realm = await buildFromDdl(loadSql('create-table/collation.sql'))
      const cols = realm.schemas[0]!.tables![0]!.columns!
      const hasCollation = cols.some(c => c.attrs?.some(a => a.kind === AttrKind.Collation))
      expect(hasCollation).toBe(true)
    })
  })

  describe('duplicate table', () => {
    test('emits duplicate-object error, keeps first', async () => {
      const errors: unknown[] = []
      const realm = await buildFromDdl(
        `CREATE TABLE users (id bigint PRIMARY KEY);
         CREATE TABLE users (id bigint, name text);`,
        { onError: e => errors.push(e) },
      )
      expect(errors).toHaveLength(1)
      expect((errors[0] as { kind: string }).kind).toBe(DdlErrorKind.DuplicateObject)
      // First table is kept (has id column only)
      const t = realm.schemas[0]!.tables![0]!
      expect(t.columns).toHaveLength(1)
    })
  })
})
