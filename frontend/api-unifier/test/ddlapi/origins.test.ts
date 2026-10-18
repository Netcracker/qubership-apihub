import { normalize, DDL_API_NORMALIZE_OPTIONS, convertOriginToHumanReadable } from '../../src'
import { buildRealmAndAssertValid } from '../helpers/ddlapi'
import {
  commonOriginsCheck,
  TEST_DEFAULTS_FLAG,
  TEST_ORIGINS_FLAG,
  TEST_ORIGINS_FOR_DEFAULTS,
} from '../helpers'

// Origins from the model hierarchy. commonOriginsCheck enforces the whole
// output contract: every node carries an origins record, ChainItems are interned per
// path position, and reference instances carry their definition-site origin.
describe('ddlapi origins', () => {
  const baseOptions = {
    ...DDL_API_NORMALIZE_OPTIONS,
    unify: false,
    originsFlag: TEST_ORIGINS_FLAG,
  }

  describe('general origins contract', () => {
    it('assigns a valid, interned origins tree over a realm with enum, PK, FK and index', async () => {
      const realm = await buildRealmAndAssertValid(`
        CREATE TYPE mood AS ENUM ('happy', 'sad');
        CREATE TABLE users (
          id bigint NOT NULL,
          mood mood,
          PRIMARY KEY (id)
        );
        CREATE TABLE orders (
          id bigint NOT NULL,
          user_id bigint NOT NULL,
          PRIMARY KEY (id),
          CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
        CREATE INDEX idx_orders_user ON orders (user_id);
      `)

      const result = normalize(realm, baseOptions)

      commonOriginsCheck(result, { originsFlag: TEST_ORIGINS_FLAG })
    })

    it('does not mutate the input realm (identity-preserving clone)', async () => {
      const realm = await buildRealmAndAssertValid('CREATE TABLE t(id int)')
      const result = normalize(realm, baseOptions)

      expect(result).not.toBe(realm)
      expect(realm).not.toHaveProperty([TEST_ORIGINS_FLAG])
      expect((result as any).schemas[0]).not.toBe(realm.schemas[0])
    })
  })

  describe('containment paths', () => {
    it('roots a top-level property origin at its containment path', async () => {
      const realm = await buildRealmAndAssertValid('CREATE TABLE t(id int)')
      const result = normalize(realm, baseOptions)
      const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)

      expect(resultWithHmr).toHaveProperty(
        ['schemas', 0, 'tables', 0, TEST_ORIGINS_FLAG, 'name'],
        ['schemas/0/tables/0/name'],
      )
    })

    it('origins reach into column properties', async () => {
      const realm = await buildRealmAndAssertValid('CREATE TABLE t(id int)')
      const result = normalize(realm, baseOptions)
      const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)

      expect(resultWithHmr).toHaveProperty(
        ['schemas', 0, 'tables', 0, 'columns', 0, TEST_ORIGINS_FLAG, 'name'],
        ['schemas/0/tables/0/columns/0/name'],
      )
    })

    it('origins reach into nested ColumnType for an explicit NOT NULL clause', async () => {
      // buildFromDdl only emits ColumnType.null when the DDL has an explicit NULL/NOT NULL clause;
      // with no clause, null is absent from source and filled as a default during unify.
      const realm = await buildRealmAndAssertValid('CREATE TABLE t(id int NOT NULL)')
      const result = normalize(realm, baseOptions)
      const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)

      expect(resultWithHmr).toHaveProperty(
        ['schemas', 0, 'tables', 0, 'columns', 0, 'type', TEST_ORIGINS_FLAG, 'null'],
        ['schemas/0/tables/0/columns/0/type/null'],
      )
    })

    it('every array slot carries an origin entry at the expected containment path', async () => {
      const realm = await buildRealmAndAssertValid('CREATE TABLE t(id int)')
      const result = normalize(realm, baseOptions)
      const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)

      expect(resultWithHmr).toHaveProperty(['schemas', TEST_ORIGINS_FLAG, 0], ['schemas/0'])
      expect(resultWithHmr).toHaveProperty(['schemas', 0, 'tables', TEST_ORIGINS_FLAG, 0], ['schemas/0/tables/0'])
      expect(resultWithHmr).toHaveProperty(
        ['schemas', 0, 'tables', 0, 'columns', TEST_ORIGINS_FLAG, 0],
        ['schemas/0/tables/0/columns/0'],
      )
    })
  })

  describe('defaults', () => {
    it('default-filled null property carries the defaults origin, not a source path', async () => {
      // No explicit nullability clause → ddlApiNullabilityDefault adds null:true as a default.
      const realm = await buildRealmAndAssertValid('CREATE TABLE t(id int)')
      const result = normalize(realm, {
        ...DDL_API_NORMALIZE_OPTIONS,
        originsFlag: TEST_ORIGINS_FLAG,
        defaultsFlag: TEST_DEFAULTS_FLAG,
        createOriginsForDefaults: () => TEST_ORIGINS_FOR_DEFAULTS,
      })
      const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)

      expect(resultWithHmr).toHaveProperty(
        ['schemas', 0, 'tables', 0, 'columns', 0, 'type', TEST_ORIGINS_FLAG, 'null'],
        ['test-origins-defaults'],
      )
    })
  })

  // Reference edges: nodes whose origin points to their definition site rather than the
  // position they are reached from. Pass A interns each instance at its containment home;
  // Pass B reuses that ChainItem for every reference that reaches the same instance.
  describe('reference edges', () => {
    it('column type reference for a named enum points to its definition in schema.objects', async () => {
      // ColumnType.type for a named enum is a reference edge: define-ddlapi-origins skips it
      // in Pass A (objects are visited first, so the EnumType is interned at its home), then
      // Pass B reuses that ChainItem when it builds the ColumnType record.
      const realm = await buildRealmAndAssertValid(`
        CREATE TYPE mood AS ENUM ('happy', 'sad');
        CREATE TABLE t (m mood);
      `)
      const result = normalize(realm, baseOptions)
      const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)

      expect(resultWithHmr).toHaveProperty(
        ['schemas', 0, 'tables', 0, 'columns', 0, 'type', TEST_ORIGINS_FLAG, 'type'],
        ['schemas/0/objects/0'],
      )
    })

    it('FK column origin points to the definition site in table.columns, not the FK referrer', async () => {
      const realm = await buildRealmAndAssertValid(`
        CREATE TABLE users (id bigint PRIMARY KEY);
        CREATE TABLE orders (id bigint PRIMARY KEY, user_id bigint REFERENCES users (id));
      `)
      const result = normalize(realm, baseOptions)
      commonOriginsCheck(result, { originsFlag: TEST_ORIGINS_FLAG })

      const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
      // user_id is orders.columns[1]; fk.columns[0] is that same Column instance
      expect(resultWithHmr).toHaveProperty(
        ['schemas', 0, 'tables', 1, 'foreignKeys', 0, 'columns', TEST_ORIGINS_FLAG, 0],
        ['schemas/0/tables/1/columns/1'],
      )
    })

    it('FK refTable and refColumns origins point to the referenced table and its columns', async () => {
      const realm = await buildRealmAndAssertValid(`
        CREATE TABLE users (id bigint PRIMARY KEY);
        CREATE TABLE orders (id bigint PRIMARY KEY, user_id bigint REFERENCES users (id));
      `)
      const result = normalize(realm, baseOptions)
      const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)

      // fk.refTable is the users Table instance, homed at schemas/0/tables/0
      expect(resultWithHmr).toHaveProperty(
        ['schemas', 0, 'tables', 1, 'foreignKeys', 0, TEST_ORIGINS_FLAG, 'refTable'],
        ['schemas/0/tables/0'],
      )
      // fk.refColumns[0] is the users.id Column instance, homed at schemas/0/tables/0/columns/0
      expect(resultWithHmr).toHaveProperty(
        ['schemas', 0, 'tables', 1, 'foreignKeys', 0, 'refColumns', TEST_ORIGINS_FLAG, 0],
        ['schemas/0/tables/0/columns/0'],
      )
    })

    it('index part column origin points to the definition site in table.columns', async () => {
      // IndexPart has no `kind`; define-ddlapi-origins identifies it by SeqNo and treats
      // its `column` property as a reference edge — same interning rule as FK.columns.
      const realm = await buildRealmAndAssertValid(`
        CREATE TABLE t (id bigint, name text);
        CREATE INDEX idx ON t (id, name);
      `)
      const result = normalize(realm, baseOptions)
      const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)

      expect(resultWithHmr).toHaveProperty(
        ['schemas', 0, 'tables', 0, 'indexes', 0, 'parts', 0, TEST_ORIGINS_FLAG, 'column'],
        ['schemas/0/tables/0/columns/0'],
      )
      expect(resultWithHmr).toHaveProperty(
        ['schemas', 0, 'tables', 0, 'indexes', 0, 'parts', 1, TEST_ORIGINS_FLAG, 'column'],
        ['schemas/0/tables/0/columns/1'],
      )
    })
  })
})
