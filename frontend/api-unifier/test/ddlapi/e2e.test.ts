import { Realm } from '@netcracker/qubership-apihub-ddlapi'
import { denormalize, normalize, DDL_API_NORMALIZE_OPTIONS } from '../../src'
import { buildRealmAndAssertValid } from '../helpers/ddlapi'
import {
  commonOriginsCheck,
  TEST_DEFAULTS_FLAG,
  TEST_ORIGINS_FLAG,
  TEST_ORIGINS_FOR_DEFAULTS,
} from '../helpers'

// End-to-end on a realistic multi-table schema: full normalize (empties, defaults,
// PK-aware nullability, origins, per-entity hashes) and a faithful round-trip.
describe('ddlapi e2e', () => {
  const baseOptions = {
    ...DDL_API_NORMALIZE_OPTIONS,
    originsFlag: TEST_ORIGINS_FLAG,
    defaultsFlag: TEST_DEFAULTS_FLAG,
    createOriginsForDefaults: () => TEST_ORIGINS_FOR_DEFAULTS,
  }

  const DDL = `
    CREATE TYPE mood AS ENUM ('happy', 'sad');
    CREATE TABLE users (
      id bigint PRIMARY KEY,
      email text NOT NULL,
      mood mood,
      full_name text GENERATED ALWAYS AS (email) STORED
    );
    CREATE TABLE orders (
      id bigint PRIMARY KEY,
      user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      note text
    );
    CREATE INDEX idx_orders_user ON orders (user_id);
    COMMENT ON COLUMN users.email IS 'login email';
  `

  const tableNamed = (realm: Realm, name: string) => realm.schemas[0].tables!.find((t) => t.name === name)!

  it('normalizes the whole schema (empties, defaults, nullability) and matches structure', async () => {
    const realm = await buildRealmAndAssertValid(DDL)
    const result = normalize(realm, baseOptions) as Realm
    const col = (table: string, name: string) => tableNamed(result, table).columns!.find((c) => c.name === name)!

    // empty-collection normalization
    expect(result.attrs).toEqual([])
    expect(result.schemas[0].attrs).toEqual([])
    expect(tableNamed(result, 'users').indexes).toEqual([])
    expect(tableNamed(result, 'users').foreignKeys).toEqual([])

    // PK-aware nullability
    expect(col('users', 'id').type!.null).toBe(false) // PK ⇒ NOT NULL
    expect(col('users', 'email').type!.null).toBe(false) // explicit NOT NULL preserved
    expect(col('users', 'mood').type!.null).toBe(true) // nullable default
    expect(col('users', 'mood').type!.type.kind).toBe('EnumType')

    // comment is preserved as semantic content
    expect(col('users', 'email').attrs).toContainEqual(
      expect.objectContaining({ kind: 'Comment', text: 'login email' }),
    )
    // generated column carries the dialect STORED default
    expect(col('users', 'full_name').attrs).toContainEqual(
      expect.objectContaining({ kind: 'GeneratedExpr', type: 'STORED' }),
    )

    // FK referential-action defaults
    const fk = tableNamed(result, 'orders').foreignKeys![0]
    expect(fk.onDelete).toBe('CASCADE')
    expect(fk.onUpdate).toBe('NO ACTION')
    // index default
    expect(tableNamed(result, 'orders').indexes![0].unique).toBe(false)
  })

  it('assigns a complete, interned origins tree', async () => {
    const realm = await buildRealmAndAssertValid(DDL)
    const result = normalize(realm, baseOptions)
    commonOriginsCheck(result, { originsFlag: TEST_ORIGINS_FLAG })
  })

  it('round-trips: shared references preserved and re-normalization is stable', async () => {
    const realm = await buildRealmAndAssertValid(DDL)
    const normalized = normalize(realm, baseOptions)
    const back = denormalize(normalized, baseOptions) as Realm

    // intra-document sharing preserved (FK columns are the same instances as table columns)
    const orders = tableNamed(back, 'orders')
    const fk = orders.foreignKeys![0]
    expect(fk.columns![0]).toBe(orders.columns!.find((c) => c.name === 'user_id'))
    expect(fk.refTable).toBe(tableNamed(back, 'users'))

    // canonical form is stable
    const canonical = (r: unknown) => normalize(r, DDL_API_NORMALIZE_OPTIONS)
    expect(canonical(back)).toEqual(canonical(realm))
  })
})
