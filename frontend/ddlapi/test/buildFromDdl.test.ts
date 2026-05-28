import { buildFromDdl, DdlParseError, DdlBuildError, DDLAPI_VERSION } from '../src'
import type { DdlNonFatalError } from '../src'
import { TypeKind, DdlErrorKind } from '../src/constants'

// ── Realm shape ───────────────────────────────────────────────────────────────

describe('realm structure', () => {
  test('empty input returns minimal realm', async () => {
    const realm = await buildFromDdl('')
    expect(realm.ddlapi).toBe(DDLAPI_VERSION)
    expect(realm.schemas).toHaveLength(0)
  })

  test('whitespace-only input returns minimal realm', async () => {
    const realm = await buildFromDdl('   \n\t  ')
    expect(realm.ddlapi).toBe(DDLAPI_VERSION)
    expect(realm.schemas).toHaveLength(0)
  })

  test('ddlapi version is always 1.0.0', async () => {
    const realm = await buildFromDdl('CREATE TABLE t (id bigint);')
    expect(realm.ddlapi).toBe(DDLAPI_VERSION)
  })

  test('single table ends up in schemas[0]', async () => {
    const realm = await buildFromDdl('CREATE TABLE users (id bigint);')
    expect(realm.schemas).toHaveLength(1)
    expect(realm.schemas[0]!.name).toBe('public')
    expect(realm.schemas[0]!.tables).toHaveLength(1)
    expect(realm.schemas[0]!.tables![0]!.name).toBe('users')
  })

  test('tables without schema qualifier go to public schema', async () => {
    const realm = await buildFromDdl(
      `CREATE TABLE foo (id bigint);
       CREATE TABLE bar (id bigint);`
    )
    const pub = realm.schemas.find(s => s.name === 'public')!
    expect(pub.tables).toHaveLength(2)
  })
})

// ── Identifier normalisation ──────────────────────────────────────────────────

describe('identifier normalisation', () => {
  test('unquoted identifiers are lowercased by pgsql-parser', async () => {
    const realm = await buildFromDdl('CREATE TABLE MyTable (MyCol BIGINT);')
    const table = realm.schemas[0]!.tables![0]!
    expect(table.name).toBe('mytable')
    expect(table.columns![0]!.name).toBe('mycol')
  })

  test('double-quoted identifiers preserve original case', async () => {
    const realm = await buildFromDdl('CREATE TABLE "MyTable" ("MyCol" bigint);')
    const table = realm.schemas[0]!.tables![0]!
    expect(table.name).toBe('MyTable')
    expect(table.columns![0]!.name).toBe('MyCol')
  })
})

// ── Multi-schema ──────────────────────────────────────────────────────────────

describe('multi-schema', () => {
  test('schema-qualified table ends up in the named schema', async () => {
    const realm = await buildFromDdl('CREATE TABLE myschema.events (id bigint);')
    const schema = realm.schemas.find(s => s.name === 'myschema')!
    expect(schema).toBeDefined()
    expect(schema.tables![0]!.name).toBe('events')
  })

  test('tables in different schemas coexist', async () => {
    const realm = await buildFromDdl(
      `CREATE TABLE public.items (id bigint);
       CREATE TABLE warehouse.items (id bigint);`
    )
    expect(realm.schemas).toHaveLength(2)
    const pub = realm.schemas.find(s => s.name === 'public')!
    const wh  = realm.schemas.find(s => s.name === 'warehouse')!
    expect(pub.tables).toHaveLength(1)
    expect(wh.tables).toHaveLength(1)
  })

  test('same-name table in two schemas is not a duplicate', async () => {
    const errors: DdlNonFatalError[] = []
    await buildFromDdl(
      `CREATE TABLE alpha.t (id bigint);
       CREATE TABLE beta.t (id bigint);`,
      { onError: e => errors.push(e) }
    )
    expect(errors).toHaveLength(0)
  })
})

// ── Error handling ────────────────────────────────────────────────────────────

describe('DdlParseError', () => {
  test('invalid SQL throws DdlParseError', async () => {
    await expect(buildFromDdl('THIS IS NOT SQL %%&&')).rejects.toThrow(DdlParseError)
  })

  test('DdlParseError has code DDL_PARSE_ERROR', async () => {
    try {
      await buildFromDdl('NOT SQL')
    } catch (err) {
      expect((err as DdlParseError).code).toBe('DDL_PARSE_ERROR')
    }
  })
})

describe('onError callback', () => {
  test('fires for each non-fatal issue', async () => {
    const errors: DdlNonFatalError[] = []
    await buildFromDdl(
      `CREATE TABLE t (id bigint);
       ALTER TABLE t ADD COLUMN x text;`,  // AlterTableStmt is out-of-scope
      { onError: e => errors.push(e) }
    )
    expect(errors).toHaveLength(1)
    expect(errors[0]!.kind).toBe(DdlErrorKind.OutOfScopeStatement)
  })

  test('fires for unresolved FK reference', async () => {
    const errors: DdlNonFatalError[] = []
    await buildFromDdl(
      `CREATE TABLE orders (
         id bigint PRIMARY KEY,
         user_id bigint REFERENCES nonexistent(id)
       );`,
      { onError: e => errors.push(e) }
    )
    expect(errors.some(e => e.kind === DdlErrorKind.UnresolvedReference)).toBe(true)
  })

  test('result is still returned when errors are emitted', async () => {
    const errors: DdlNonFatalError[] = []
    const realm = await buildFromDdl(
      `CREATE TABLE t (id bigint);
       DROP TABLE t;`,
      { onError: e => errors.push(e) }
    )
    expect(errors.some(e => e.kind === DdlErrorKind.OutOfScopeStatement)).toBe(true)
    // Table was still registered (DROP is out-of-scope, ignored)
    expect(realm.schemas[0]!.tables).toHaveLength(1)
  })

  test('fires for duplicate table', async () => {
    const errors: DdlNonFatalError[] = []
    await buildFromDdl(
      `CREATE TABLE users (id bigint);
       CREATE TABLE users (email text);`,
      { onError: e => errors.push(e) }
    )
    expect(errors).toHaveLength(1)
    const err = errors[0]!
    expect(err.kind).toBe(DdlErrorKind.DuplicateObject)
    if (err.kind === DdlErrorKind.DuplicateObject) {
      expect(err.objectKind).toBe('Table')
      expect(err.qualifiedName).toBe('public.users')
    }
  })
})

describe('strict mode', () => {
  test('no issues: does not throw, returns realm', async () => {
    const realm = await buildFromDdl('CREATE TABLE t (id bigint);', { strict: true })
    expect(realm.schemas[0]!.tables).toHaveLength(1)
  })

  test('throws DdlBuildError when issues exist', async () => {
    await expect(
      buildFromDdl('ALTER TABLE missing ADD COLUMN x text;', { strict: true })
    ).rejects.toThrow(DdlBuildError)
  })

  test('DdlBuildError has code DDL_BUILD_ERROR', async () => {
    try {
      await buildFromDdl('DROP TABLE t;', { strict: true })
    } catch (err) {
      expect((err as DdlBuildError).code).toBe('DDL_BUILD_ERROR')
    }
  })

  test('DdlBuildError.issues contains all collected errors', async () => {
    try {
      await buildFromDdl(
        `ALTER TABLE a ADD COLUMN x text;
         DROP TABLE b;`,
        { strict: true }
      )
    } catch (err) {
      const buildErr = err as DdlBuildError
      expect(buildErr.issues.length).toBe(2)
      expect(buildErr.issues.every(i => i.kind === DdlErrorKind.OutOfScopeStatement)).toBe(true)
    }
  })

  test('DdlBuildError.realm contains partial realm built before throw', async () => {
    // Tables processed before the out-of-scope statement must appear in err.realm
    let caughtErr: unknown
    try {
      await buildFromDdl(
        `CREATE TABLE orders (id bigint PRIMARY KEY);
         DROP TABLE orders;`,
        { strict: true }
      )
    } catch (err) {
      caughtErr = err
    }
    expect(caughtErr).toBeInstanceOf(DdlBuildError)
    const buildErr = caughtErr as DdlBuildError
    // The realm is fully built before throwing — valid tables are present
    const ordersTable = buildErr.realm.schemas[0]?.tables?.find(t => t.name === 'orders')
    expect(ordersTable).toBeDefined()
  })

  test('strict + onError: both fire', async () => {
    const errors: DdlNonFatalError[] = []
    let thrown: unknown
    try {
      await buildFromDdl('DROP TABLE t;', { strict: true, onError: e => errors.push(e) })
    } catch (err) {
      thrown = err
    }
    expect(errors).toHaveLength(1)
    expect(thrown).toBeInstanceOf(DdlBuildError)
  })
})

// ── Referential equality ──────────────────────────────────────────────────────

describe('referential equality', () => {
  test('column.type points to same EnumType instance as schema.objects', async () => {
    const realm = await buildFromDdl(
      `CREATE TYPE status AS ENUM ('active', 'inactive');
       CREATE TABLE accounts (id bigint, state status);`
    )
    const schema = realm.schemas[0]!
    const enumObj = schema.objects!.find(o => o.kind === TypeKind.EnumType)!
    const stateCol = schema.tables!.find(t => t.name === 'accounts')!.columns!.find(c => c.name === 'state')!
    expect(stateCol.type!.type).toBe(enumObj)
  })

  test('FK refTable points to same Table instance as tables array', async () => {
    const realm = await buildFromDdl(
      `CREATE TABLE users (id bigint PRIMARY KEY);
       CREATE TABLE posts (id bigint PRIMARY KEY, author_id bigint REFERENCES users(id));`
    )
    const schema = realm.schemas[0]!
    const usersTable = schema.tables!.find(t => t.name === 'users')!
    const posts = schema.tables!.find(t => t.name === 'posts')!
    const fk = posts.foreignKeys![0]!
    expect(fk.refTable).toBe(usersTable)
  })

  test('FK column points to same Column instance as table.columns', async () => {
    const realm = await buildFromDdl(
      `CREATE TABLE users (id bigint PRIMARY KEY);
       CREATE TABLE posts (
         id bigint PRIMARY KEY,
         author_id bigint REFERENCES users(id)
       );`
    )
    const schema = realm.schemas[0]!
    const posts = schema.tables!.find(t => t.name === 'posts')!
    const authorCol = posts.columns!.find(c => c.name === 'author_id')!
    const fk = posts.foreignKeys![0]!
    // fk.columns[0] should be the same object as the author_id column
    expect(fk.columns![0]).toBe(authorCol)
  })
})

// ── Type resolution scope ─────────────────────────────────────────────────────

describe('type resolution scope', () => {
  test('unqualified type name is scoped to the table schema (plan §8.4)', async () => {
    // `mood` is defined in schemaA; a column in schemaB that writes just `mood`
    // (no schema prefix) must NOT resolve to schemaA.mood — it stays UnsupportedType.
    const realm = await buildFromDdl(
      `CREATE TYPE schemaa.mood AS ENUM ('happy', 'sad');
       CREATE TABLE schemab.events (id bigint, feeling mood);`,
      { onError: () => {} }   // suppress unresolved-reference errors
    )
    const schemaB = realm.schemas.find(s => s.name === 'schemab')!
    const eventsTable = schemaB.tables!.find(t => t.name === 'events')!
    const feelingCol = eventsTable.columns!.find(c => c.name === 'feeling')!
    // Should remain UnsupportedType — not upgraded to the schemaA EnumType
    expect(feelingCol.type!.type.kind).toBe(TypeKind.UnsupportedType)
  })

  test('qualified type name resolves across schemas', async () => {
    // When the column uses the fully-qualified `schemaa.mood`, it must resolve.
    const realm = await buildFromDdl(
      `CREATE TYPE schemaa.mood AS ENUM ('happy', 'sad');
       CREATE TABLE schemab.events (id bigint, feeling schemaa.mood);`,
      { onError: () => {} }
    )
    const schemaB = realm.schemas.find(s => s.name === 'schemab')!
    const eventsTable = schemaB.tables!.find(t => t.name === 'events')!
    const feelingCol = eventsTable.columns!.find(c => c.name === 'feeling')!
    expect(feelingCol.type!.type.kind).toBe(TypeKind.EnumType)
  })
})

// ── Multi-statement interaction ───────────────────────────────────────────────

describe('multi-statement DDL', () => {
  test('forward reference: index before table is silently attached in pass 2', async () => {
    const errors: DdlNonFatalError[] = []
    const realm = await buildFromDdl(
      `CREATE INDEX idx_users_email ON users (email);
       CREATE TABLE users (id bigint, email text);`,
      { onError: e => errors.push(e) }
    )
    // No errors — forward references are silently resolved
    expect(errors).toHaveLength(0)
    const users = realm.schemas[0]!.tables!.find(t => t.name === 'users')!
    expect(users.indexes!.some(i => i.name === 'idx_users_email')).toBe(true)
  })

  test('out-of-scope statements do not prevent valid tables from being registered', async () => {
    const realm = await buildFromDdl(
      `CREATE SEQUENCE id_seq;
       CREATE TABLE products (id bigint, name text);`,
      { onError: () => {} }   // suppress out-of-scope errors
    )
    const products = realm.schemas[0]!.tables!.find(t => t.name === 'products')!
    expect(products).toBeDefined()
    expect(products.columns).toHaveLength(2)
  })
})
