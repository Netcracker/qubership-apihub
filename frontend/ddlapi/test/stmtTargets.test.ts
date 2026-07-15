import { parseStatements } from '../src/parser/pgParser'
import { describeStatement, type StatementDescriptor } from '../src/parser/stmtTargets'
import { buildFromDdl } from '../src/parser'

async function describeAll(sql: string): Promise<(StatementDescriptor | undefined)[]> {
  const stmts = await parseStatements(sql)
  return stmts.map((s, i) => describeStatement(s, i, 'public'))
}

async function describeOne(sql: string): Promise<StatementDescriptor> {
  const ds = await describeAll(sql)
  expect(ds).toHaveLength(1)
  expect(ds[0]).toBeDefined()
  return ds[0]!
}

describe('describeStatement', () => {
  describe('definitions', () => {
    test('CREATE TABLE — schema-qualified', async () => {
      const d = await describeOne('CREATE TABLE audit.orders (id int);')
      expect(d.defines).toEqual({ kind: 'table', key: 'audit.orders' })
    })

    test('CREATE TABLE — default schema', async () => {
      const d = await describeOne('CREATE TABLE orders (id int);')
      expect(d.defines).toEqual({ kind: 'table', key: 'public.orders' })
    })

    test('CREATE INDEX — target table + index key', async () => {
      const d = await describeOne('CREATE INDEX idx ON audit.orders (id);')
      expect(d.defines).toEqual({ kind: 'index', targetTable: 'audit.orders', indexKey: 'audit.idx' })
    })

    test('CREATE TRIGGER — target table', async () => {
      const d = await describeOne('CREATE TRIGGER t AFTER INSERT ON orders FOR EACH ROW EXECUTE FUNCTION f();')
      expect(d.defines).toEqual({ kind: 'trigger', targetTable: 'public.orders' })
    })

    test('CREATE TYPE AS ENUM', async () => {
      const d = await describeOne("CREATE TYPE mood AS ENUM ('a');")
      expect(d.defines).toEqual({ kind: 'type', key: 'public.mood' })
    })

    test('CREATE TYPE AS (composite)', async () => {
      const d = await describeOne('CREATE TYPE addr AS (city text);')
      expect(d.defines).toEqual({ kind: 'type', key: 'public.addr' })
    })

    test('CREATE TYPE AS RANGE', async () => {
      const d = await describeOne('CREATE TYPE fr AS RANGE (subtype = int4);')
      expect(d.defines).toEqual({ kind: 'type', key: 'public.fr' })
    })

    test('CREATE DOMAIN — schema-qualified', async () => {
      const d = await describeOne('CREATE DOMAIN audit.pos AS int;')
      expect(d.defines).toEqual({ kind: 'type', key: 'audit.pos' })
    })

    test('every descriptor carries a source range', async () => {
      const d = await describeOne('CREATE TABLE orders (id int);')
      expect(d.range).toBeDefined()
    })

    test('named UNIQUE constraints surface as constraintIndexNames (table-level + inline)', async () => {
      const d = await describeOne(
        'CREATE TABLE t (id int, code text CONSTRAINT uq_code UNIQUE, CONSTRAINT uq_pair UNIQUE (id, code));',
      )
      expect((d.defines as { constraintIndexNames?: string[] }).constraintIndexNames)
        .toEqual(['uq_code', 'uq_pair'])
    })

    test('unnamed UNIQUE / PRIMARY KEY constraints produce no constraintIndexNames', async () => {
      // Auto-generated index names are not tracked (parity with buildFromDdl), and
      // PRIMARY KEY names are deliberately excluded.
      const d = await describeOne(
        'CREATE TABLE t (id int CONSTRAINT pk PRIMARY KEY, code text UNIQUE);',
      )
      expect((d.defines as { constraintIndexNames?: string[] }).constraintIndexNames).toBeUndefined()
    })
  })

  describe('COMMENT targets', () => {
    const target = (d: StatementDescriptor) =>
      d.defines.kind === 'comment' ? d.defines.target : undefined

    test('COMMENT ON TABLE', async () => {
      expect(target(await describeOne("COMMENT ON TABLE orders IS 'x';")))
        .toEqual({ kind: 'table', tableKey: 'public.orders' })
    })

    test('COMMENT ON COLUMN', async () => {
      expect(target(await describeOne("COMMENT ON COLUMN audit.orders.id IS 'x';")))
        .toEqual({ kind: 'column', tableKey: 'audit.orders', column: 'id' })
    })

    test('COMMENT ON CONSTRAINT ... ON table', async () => {
      expect(target(await describeOne("COMMENT ON CONSTRAINT ck ON orders IS 'x';")))
        .toEqual({ kind: 'tableConstraint', tableKey: 'public.orders', constraint: 'ck' })
    })

    test('COMMENT ON INDEX', async () => {
      expect(target(await describeOne("COMMENT ON INDEX idx IS 'x';")))
        .toEqual({ kind: 'index', indexKey: 'public.idx' })
    })

    test('COMMENT ON TYPE', async () => {
      expect(target(await describeOne("COMMENT ON TYPE mood IS 'x';")))
        .toEqual({ kind: 'type', typeKey: 'public.mood' })
    })

    test('COMMENT ON SCHEMA → other (not table-relevant)', async () => {
      expect(target(await describeOne("COMMENT ON SCHEMA public IS 'x';")))
        .toEqual({ kind: 'other' })
    })
  })

  describe('non-describable statements', () => {
    test('PARTITION OF table → undefined', async () => {
      const ds = await describeAll(
        "CREATE TABLE m_2024 PARTITION OF m FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');",
      )
      expect(ds[0]).toBeUndefined()
    })
  })

  describe('key parity with buildFromDdl', () => {
    test('table and type keys match the registered Realm', async () => {
      const ddl = `
        CREATE TYPE mood AS ENUM ('a');
        CREATE TABLE audit.orders (id int, m mood);
        CREATE TABLE inventory (sku text);
        CREATE DOMAIN pos AS int;
      `
      const realm = await buildFromDdl(ddl, { onError: () => {} })
      const descriptors = (await describeAll(ddl)).filter((d): d is StatementDescriptor => !!d)

      const descTableKeys = descriptors
        .filter(d => d.defines.kind === 'table')
        .map(d => (d.defines as { key: string }).key)
        .sort()
      const realmTableKeys = realm.schemas
        .flatMap(s => (s.tables ?? []).map(t => `${s.name}.${t.name}`))
        .sort()
      expect(descTableKeys).toEqual(realmTableKeys)

      const descTypeKeys = descriptors
        .filter(d => d.defines.kind === 'type')
        .map(d => (d.defines as { key: string }).key)
        .sort()
      // Type identifiers live in `name` (composite/range) or `type` (enum/domain).
      const realmTypeKeys = realm.schemas
        .flatMap(s => (s.objects ?? [])
          .map(o => (o as { name?: string; type?: string }).name ?? (o as { type?: string }).type)
          .filter((id): id is string => id !== undefined)
          .map(id => `${s.name}.${id}`))
        .sort()
      expect(descTypeKeys).toEqual(realmTypeKeys)
    })
  })
})
