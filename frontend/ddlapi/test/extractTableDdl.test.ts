import { prepareDdlExtractor, DdlParseError } from '../src/parser'

/** Extracts one table's slice SQL. Each test asserts it against literal expected text. */
const sliceOf = async (ddl: string, name: string, schema = 'public'): Promise<string> =>
  (await prepareDdlExtractor(ddl)).extractTable({ schema, name })!.sql

describe('prepareDdlExtractor', () => {
  describe('parse failures', () => {
    test('throws DdlParseError on invalid SQL', async () => {
      await expect(prepareDdlExtractor('CREATE TABLE (')).rejects.toThrow(DdlParseError)
    })

    test('resolves on valid SQL', async () => {
      await expect(prepareDdlExtractor('CREATE TABLE x (id int);')).resolves.toBeDefined()
    })

    test('empty input yields an extractor with no tables', async () => {
      const ex = await prepareDdlExtractor('   \n  ')
      expect(ex.tables()).toEqual([])
    })
  })

  describe('table discovery', () => {
    const ddl = `
CREATE TABLE public.orders (id int);
CREATE SEQUENCE s;
CREATE TABLE inventory (sku text);
CREATE TABLE audit.events (id int);
`

    test('tables() lists only CREATE TABLE’d tables in source order', async () => {
      const ex = await prepareDdlExtractor(ddl)
      expect(ex.tables()).toEqual([
        { schema: 'public', name: 'orders' },
        { schema: 'public', name: 'inventory' },
        { schema: 'audit', name: 'events' },
      ])
    })

    test('PARTITION OF tables are excluded (out of scope, matching buildFromDdl)', async () => {
      const ddl = `\
CREATE TABLE measurement (logdate date) PARTITION BY RANGE (logdate);
CREATE TABLE measurement_y2024 PARTITION OF measurement FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');`
      const ex = await prepareDdlExtractor(ddl)
      expect(ex.tables()).toEqual([{ schema: 'public', name: 'measurement' }])
    })
  })

  describe('extractTable', () => {
    test('returns the verbatim CREATE TABLE slice for a discovered table', async () => {
      const ddl = `\
CREATE TABLE public.orders (id int);
CREATE TABLE inventory (sku text);`
      const ex = await prepareDdlExtractor(ddl)
      const slice = ex.extractTable({ schema: 'public', name: 'inventory' })
      expect(slice).toBeDefined()
      expect(slice!.sql).toBe('CREATE TABLE inventory (sku text);')
      expect(slice!.table).toEqual({ schema: 'public', name: 'inventory' })
      expect(slice!.warnings).toEqual([])
    })

    test('every ref from tables() round-trips through extractTable', async () => {
      const ddl = `\
CREATE TABLE a (id int);
CREATE TABLE audit.b (id int);`
      const ex = await prepareDdlExtractor(ddl)
      for (const ref of ex.tables()) {
        const slice = ex.extractTable(ref)
        expect(slice).toBeDefined()
        expect(slice!.sql).toContain(ref.name)
      }
    })

    test('unknown table is a lookup miss → undefined (not a throw)', async () => {
      const ex = await prepareDdlExtractor('CREATE TABLE x (id int);')
      expect(ex.extractTable({ schema: 'public', name: 'nope' })).toBeUndefined()
      expect(ex.extractTable({ schema: 'other', name: 'x' })).toBeUndefined()
    })

    test('quoted mixed-case identifier is found via its normalized name, not lowercased', async () => {
      const ex = await prepareDdlExtractor('CREATE TABLE "MyTable" (id int);')
      expect(ex.tables()).toEqual([{ schema: 'public', name: 'MyTable' }])
      expect(ex.extractTable({ schema: 'public', name: 'MyTable' })).toBeDefined()
      // The extractor never re-folds caller strings:
      expect(ex.extractTable({ schema: 'public', name: 'mytable' })).toBeUndefined()
    })
  })

  describe('basic relevance closure', () => {
    test('includes the table, its indexes, triggers, and owned comments; omits unrelated', async () => {
      const ddl = `\
CREATE TABLE orders (id int, total numeric);
CREATE INDEX idx_orders_total ON orders (total);
COMMENT ON TABLE orders IS 'the orders';
CREATE TABLE other (id int);
CREATE INDEX idx_other ON other (id);`
      const expected = `\
CREATE TABLE orders (id int, total numeric);
CREATE INDEX idx_orders_total ON orders (total);
COMMENT ON TABLE orders IS 'the orders';`
      expect(await sliceOf(ddl, 'orders')).toBe(expected)
    })

    test('includes triggers and column comments owned by the table', async () => {
      // every statement is relevant → the whole input is reproduced verbatim
      const ddl = `\
CREATE TABLE orders (id int, total numeric);
CREATE TRIGGER trg AFTER INSERT ON orders FOR EACH ROW EXECUTE FUNCTION f();
COMMENT ON COLUMN orders.total IS 'amount';`
      expect(await sliceOf(ddl, 'orders')).toBe(ddl)
    })

    test('COMMENT ON INDEX is attributed to the owning table', async () => {
      const ddl = `\
CREATE TABLE a (id int);
CREATE INDEX idx_a ON a (id);
COMMENT ON INDEX idx_a IS 'speedy';`
      expect(await sliceOf(ddl, 'a')).toBe(ddl)
    })

    test('COMMENT ON INDEX for a named UNIQUE constraint index is attributed to its table', async () => {
      const ddl = `\
CREATE TABLE t (id int, code text, CONSTRAINT uq_code UNIQUE (code));
COMMENT ON INDEX uq_code IS 'unique codes';`
      expect(await sliceOf(ddl, 't')).toBe(ddl)
    })

    test('COMMENT ON INDEX for an inline named UNIQUE column constraint is attributed', async () => {
      const ddl = `\
CREATE TABLE t (id int, code text CONSTRAINT uq_code UNIQUE);
COMMENT ON INDEX uq_code IS 'unique codes';`
      expect(await sliceOf(ddl, 't')).toBe(ddl)
    })

    test('non-contiguous selection preserves source order with a normalized seam', async () => {
      // table b sits between a and a's index and must be dropped → one-blank-line seam.
      const ddl = `\
CREATE TABLE a (id int);
CREATE TABLE b (id int);
CREATE INDEX idx_a ON a (id);`
      const expected = `\
CREATE TABLE a (id int);

CREATE INDEX idx_a ON a (id);`
      expect(await sliceOf(ddl, 'a')).toBe(expected)
    })

    test('a column comment on a different table is not pulled in', async () => {
      const ddl = `\
CREATE TABLE a (id int);
CREATE TABLE b (id int);
COMMENT ON COLUMN b.id IS 'b only';`
      expect(await sliceOf(ddl, 'a')).toBe('CREATE TABLE a (id int);')
    })

    test('one extractor serves many tables (reuse), each its own exact subset', async () => {
      const ddl = `\
CREATE TABLE a (id int);
CREATE INDEX idx_a ON a (id);
CREATE TABLE b (id int);
CREATE INDEX idx_b ON b (id);`
      const expectedA = `\
CREATE TABLE a (id int);
CREATE INDEX idx_a ON a (id);`
      const expectedB = `\
CREATE TABLE b (id int);
CREATE INDEX idx_b ON b (id);`
      const ex = await prepareDdlExtractor(ddl)
      expect(ex.extractTable({ schema: 'public', name: 'a' })!.sql).toBe(expectedA)
      expect(ex.extractTable({ schema: 'public', name: 'b' })!.sql).toBe(expectedB)
    })
  })

  describe('type-dependency closure', () => {
    test('column → enum type is included; unused types are not', async () => {
      const ddl = `\
CREATE TYPE mood AS ENUM ('happy', 'sad');
CREATE TABLE person (id int, m mood);
CREATE TYPE unused AS ENUM ('x');`
      const expected = `\
CREATE TYPE mood AS ENUM ('happy', 'sad');
CREATE TABLE person (id int, m mood);`
      expect(await sliceOf(ddl, 'person')).toBe(expected)
    })

    test('transitive: column → composite → enum (in source order)', async () => {
      const ddl = `\
CREATE TYPE mood AS ENUM ('happy');
CREATE TYPE profile AS (status mood, bio text);
CREATE TABLE person (id int, p profile);`
      expect(await sliceOf(ddl, 'person')).toBe(ddl)
    })

    test('transitive: column → domain → base domain', async () => {
      const ddl = `\
CREATE DOMAIN positive AS int CHECK (VALUE > 0);
CREATE DOMAIN small_positive AS positive CHECK (VALUE < 100);
CREATE TABLE t (id int, q small_positive);`
      expect(await sliceOf(ddl, 't')).toBe(ddl)
    })

    test('array element type (mood[]) is detected', async () => {
      const ddl = `\
CREATE TYPE mood AS ENUM ('a');
CREATE TABLE t (id int, moods mood[]);`
      expect(await sliceOf(ddl, 't')).toBe(ddl)
    })

    test('schema-qualified type reference is resolved as-is', async () => {
      const ddl = `\
CREATE TYPE audit.mood AS ENUM ('a');
CREATE TABLE public.t (id int, m audit.mood);`
      expect(await sliceOf(ddl, 't')).toBe(ddl)
    })

    test('expression-cast-only reference pulls the type in (diverges from buildFromDdl)', async () => {
      const ddl = `\
CREATE TYPE mood AS ENUM ('a', 'b');
CREATE TABLE t (id int, s text, CHECK (s::mood = 'a'));`
      expect(await sliceOf(ddl, 't')).toBe(ddl)
    })

    test('a type used only in an included index expression is pulled in', async () => {
      const ddl = `\
CREATE TYPE mood AS ENUM ('a', 'b');
CREATE TABLE t (id int, s text);
CREATE INDEX idx ON t ((s::mood));`
      expect(await sliceOf(ddl, 't')).toBe(ddl)
    })

    test('a type used only in an included index WHERE predicate is pulled in', async () => {
      const ddl = `\
CREATE TYPE mood AS ENUM ('a', 'b');
CREATE TABLE t (id int, s text);
CREATE INDEX idx ON t (id) WHERE (s::mood = 'a');`
      expect(await sliceOf(ddl, 't')).toBe(ddl)
    })

    test('a type used only in an included trigger WHEN clause is pulled in', async () => {
      const ddl = `\
CREATE TYPE mood AS ENUM ('a', 'b');
CREATE TABLE t (id int, s text);
CREATE TRIGGER trg BEFORE UPDATE ON t FOR EACH ROW WHEN (NEW.s::mood = 'a') EXECUTE FUNCTION f();`
      expect(await sliceOf(ddl, 't')).toBe(ddl)
    })

    test('COMMENT ON TYPE included for a used type, excluded for an unused one (seam across drop)', async () => {
      // mood + its comment are kept; unused + its comment are dropped, leaving a
      // one-blank-line seam before the table.
      const ddl = `\
CREATE TYPE mood AS ENUM ('a');
COMMENT ON TYPE mood IS 'feelings';
CREATE TYPE unused AS ENUM ('x');
COMMENT ON TYPE unused IS 'nope';
CREATE TABLE t (id int, m mood);`
      const expected = `\
CREATE TYPE mood AS ENUM ('a');
COMMENT ON TYPE mood IS 'feelings';

CREATE TABLE t (id int, m mood);`
      expect(await sliceOf(ddl, 't')).toBe(expected)
    })

    test('a self-referential composite type terminates and is emitted once', async () => {
      const ddl = `\
CREATE TYPE node AS (next node, val int);
CREATE TABLE t (id int, n node);`
      expect(await sliceOf(ddl, 't')).toBe(ddl)
    })
  })

  describe('LIKE closure', () => {
    test('LIKE source is pulled in as a full closure (its table, index, comment, types), in source order', async () => {
      const ddl = `\
CREATE TYPE mood AS ENUM ('a');
CREATE TABLE base (id int, m mood);
CREATE INDEX idx_base ON base (id);
COMMENT ON TABLE base IS 'the base';
CREATE TABLE child (LIKE base, extra text);`
      expect(await sliceOf(ddl, 'child')).toBe(ddl)
    })

    test('LIKE pulls in the source but not an unrelated table between them (seam)', async () => {
      // `noise` sits between base and child in source and must be dropped,
      // producing a one-blank-line seam between base's closure and child.
      const ddl = `\
CREATE TABLE base (id int);
CREATE TABLE noise (id int);
CREATE TABLE child (LIKE base, extra text);`
      const expected = `\
CREATE TABLE base (id int);

CREATE TABLE child (LIKE base, extra text);`
      expect(await sliceOf(ddl, 'child')).toBe(expected)
    })

    test('a LIKE chain pulls in every ancestor, in source order', async () => {
      const ddl = `\
CREATE TABLE a (id int);
CREATE TABLE b (LIKE a, b1 text);
CREATE TABLE c (LIKE b, c1 text);`
      expect(await sliceOf(ddl, 'c')).toBe(ddl)
    })

    test('a mutually-referential LIKE pair terminates and emits each once', async () => {
      // a and b are adjacent in source → one verbatim run (single newline, no seam).
      const ddl = `\
CREATE TABLE a (LIKE b, x int);
CREATE TABLE b (LIKE a, y int);`
      expect(await sliceOf(ddl, 'a')).toBe(ddl)
    })
  })

  describe('warnings', () => {
    const slice = async (ddl: string, name: string, schema = 'public') =>
      (await prepareDdlExtractor(ddl)).extractTable({ schema, name })!

    test('OmittedForeignKeyTarget — FK to a table not included (structured refTable)', async () => {
      const ddl = `\
CREATE TABLE orders (id int, customer_id int CONSTRAINT fk_cust REFERENCES customers (id));
CREATE TABLE customers (id int);`
      const r = await slice(ddl, 'orders')
      // FK target (customers) excluded by design — only orders is emitted.
      expect(r.sql).toBe('CREATE TABLE orders (id int, customer_id int CONSTRAINT fk_cust REFERENCES customers (id));')
      const fk = r.warnings.find(w => w.kind === 'OmittedForeignKeyTarget')
      expect(fk).toMatchObject({
        kind: 'OmittedForeignKeyTarget',
        refTable: { schema: 'public', name: 'customers' },
        symbol: 'fk_cust',
      })
    })

    test('a self-referential FK does not warn (target is included)', async () => {
      const r = await slice('CREATE TABLE node (id int, parent_id int REFERENCES node (id));', 'node')
      expect(r.warnings.find(w => w.kind === 'OmittedForeignKeyTarget')).toBeUndefined()
    })

    test('DuplicateTable — first definition wins and is emitted', async () => {
      const ddl = `\
CREATE TABLE t (id int);
CREATE TABLE t (id int, extra text);`
      const r = await slice(ddl, 't')
      expect(r.sql).toBe('CREATE TABLE t (id int);')
      expect(r.warnings.find(w => w.kind === 'DuplicateTable')).toMatchObject({
        kind: 'DuplicateTable',
        table: { schema: 'public', name: 't' },
      })
    })

    test('OutOfScopeStatementDropped — ALTER TABLE naming the table', async () => {
      const ddl = `\
CREATE TABLE t (id int);
ALTER TABLE t ADD COLUMN x text;`
      const r = await slice(ddl, 't')
      expect(r.sql).toBe('CREATE TABLE t (id int);') // ALTER TABLE dropped
      expect(r.warnings.find(w => w.kind === 'OutOfScopeStatementDropped')).toMatchObject({
        kind: 'OutOfScopeStatementDropped',
        statementType: 'AlterTableStmt',
      })
    })

    test('UnresolvedTypeReference — unknown user type warns, extension type does not', async () => {
      const r = await slice('CREATE TABLE t (id int, c citext, w widget);', 't')
      const unresolved = r.warnings
        .filter(w => w.kind === 'UnresolvedTypeReference')
        .map(w => (w as { typeName: string }).typeName)
      expect(unresolved).toEqual(['widget']) // citext is a known extension type → suppressed
    })

    test('a clean table produces no warnings', async () => {
      const r = await slice('CREATE TABLE t (id int, name text, active boolean);', 't')
      expect(r.warnings).toEqual([])
    })
  })

  describe('end-to-end (realistic multi-table DDL)', () => {
    const ddl = `\
-- Enumerations
CREATE TYPE order_status AS ENUM ('pending', 'shipped');

CREATE TABLE customers (
  id bigint PRIMARY KEY,
  email text NOT NULL
);
COMMENT ON TABLE customers IS 'People who buy things';

CREATE TABLE orders (
  id bigint PRIMARY KEY,
  customer_id bigint REFERENCES customers (id),
  status order_status NOT NULL
);
CREATE INDEX idx_orders_customer ON orders (customer_id);
COMMENT ON COLUMN orders.status IS 'lifecycle';

CREATE SEQUENCE audit_seq;

CREATE TABLE orders_archive (LIKE orders);`

    test('tables() lists every table (sequence excluded), in source order', async () => {
      const ex = await prepareDdlExtractor(ddl)
      expect(ex.tables()).toEqual([
        { schema: 'public', name: 'customers' },
        { schema: 'public', name: 'orders' },
        { schema: 'public', name: 'orders_archive' },
      ])
    })

    test('every table round-trips to a non-empty slice', async () => {
      const ex = await prepareDdlExtractor(ddl)
      for (const ref of ex.tables()) {
        expect(ex.extractTable(ref)!.sql.length).toBeGreaterThan(0)
      }
    })

    test('customers: exactly its table + comment (verbatim), nothing from orders', async () => {
      const expected = `\
CREATE TABLE customers (
  id bigint PRIMARY KEY,
  email text NOT NULL
);
COMMENT ON TABLE customers IS 'People who buy things';`
      const ex = await prepareDdlExtractor(ddl)
      const r = ex.extractTable({ schema: 'public', name: 'customers' })!
      expect(r.sql).toBe(expected)
      expect(r.warnings).toEqual([])
    })

    test('orders: exact subset — used enum, table, index, column comment; FK target omitted (+warning)', async () => {
      // order_status (the used enum) is pulled in; the `-- Enumerations` comment is
      // kept because it directly precedes that statement (adjacency). The customers
      // table and the audit_seq sequence are dropped; the seam is one blank line.
      const expected = `\
-- Enumerations
CREATE TYPE order_status AS ENUM ('pending', 'shipped');

CREATE TABLE orders (
  id bigint PRIMARY KEY,
  customer_id bigint REFERENCES customers (id),
  status order_status NOT NULL
);
CREATE INDEX idx_orders_customer ON orders (customer_id);
COMMENT ON COLUMN orders.status IS 'lifecycle';`
      const ex = await prepareDdlExtractor(ddl)
      const r = ex.extractTable({ schema: 'public', name: 'orders' })!
      expect(r.sql).toBe(expected)
      expect(r.warnings).toContainEqual(
        expect.objectContaining({ kind: 'OmittedForeignKeyTarget', refTable: { schema: 'public', name: 'customers' } }),
      )
    })

    test('orders_archive: exact subset — LIKE pulls in orders and its full closure', async () => {
      const expected = `\
-- Enumerations
CREATE TYPE order_status AS ENUM ('pending', 'shipped');

CREATE TABLE orders (
  id bigint PRIMARY KEY,
  customer_id bigint REFERENCES customers (id),
  status order_status NOT NULL
);
CREATE INDEX idx_orders_customer ON orders (customer_id);
COMMENT ON COLUMN orders.status IS 'lifecycle';

CREATE TABLE orders_archive (LIKE orders);`
      const ex = await prepareDdlExtractor(ddl)
      const r = ex.extractTable({ schema: 'public', name: 'orders_archive' })!
      expect(r.sql).toBe(expected)
      // orders' FK target (customers) is still omitted → warning carries through the LIKE source.
      expect(r.warnings).toContainEqual(
        expect.objectContaining({ kind: 'OmittedForeignKeyTarget', refTable: { schema: 'public', name: 'customers' } }),
      )
    })
  })
})
