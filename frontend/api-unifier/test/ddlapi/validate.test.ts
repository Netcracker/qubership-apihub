import {
  columnType,
  comment,
  integerType,
  newColumn,
  newForeignKey,
  newPrimaryKey,
  newRealm,
  newSchema,
  newTable,
  ReferenceOption,
  PgAttrKind,
} from '@netcracker/qubership-apihub-ddlapi'
import { buildFromDdl } from '@netcracker/qubership-apihub-ddlapi/parser'
import { normalize, DDL_API_NORMALIZE_OPTIONS } from '../../src'
import { buildRealmAndAssertValid } from '../helpers/ddlapi'

// Validate tree. validate-only: assert valid realms survive
// unchanged, malformed-but-known values are stripped + reported, and unknown escape-hatch
// kinds pass through.
describe('ddlapi validate', () => {
  const baseOptions = {
    ...DDL_API_NORMALIZE_OPTIONS,
    unify: false,
  }

  it('leaves a representative realm (enum, PK, FK, index) structurally unchanged and clean', async () => {
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

    const errors: string[] = []
    const result = normalize(realm, { ...baseOptions, onValidateError: (m) => errors.push(m) }) as typeof realm

    expect(errors).toBeEmpty()
    expect(result).toMatchObject({
      ddlapi: '1.0.0',
      schemas: [
        {
          tables: [
            { kind: 'Table', name: 'users', primaryKey: { kind: 'Index' } },
            {
              kind: 'Table',
              name: 'orders',
              foreignKeys: [{ kind: 'ForeignKey', symbol: 'fk_user', onDelete: ReferenceOption.Cascade }],
            },
          ],
        },
      ],
    })
  })

  it('passes unknown escape-hatch kinds through untouched (validated only as { kind: string })', () => {
    // PostgreSQL escape-hatch attr handled by the PG dialect rules — it must survive intact.
    const identity = { kind: PgAttrKind.Identity, generation: 'ALWAYS', seqStart: 1 } as never
    const id = newColumn('id', { type: columnType(integerType('bigint'), { null: false }), attrs: [identity] })
    const realm = newRealm([newSchema('public', { tables: [newTable('t', { columns: [id] })] })])

    const errors: string[] = []
    const result = normalize(realm, { ...baseOptions, onValidateError: (m) => errors.push(m) }) as typeof realm

    expect(errors).toBeEmpty()
    expect(result.schemas[0].tables![0].columns![0].attrs).toEqual([
      { kind: PgAttrKind.Identity, generation: 'ALWAYS', seqStart: 1 },
    ])
  })

  it('strips a malformed-but-known value (bad onDelete) and reports it', () => {
    // intentionally invalid: 'BOGUS' is not a ReferenceOption
    const id = newColumn('id', { type: columnType(integerType('bigint'), { null: false }) })
    const users = newTable('users', { columns: [id], primaryKey: newPrimaryKey([id]) })
    const fk = newForeignKey('fk', {
      columns: [id],
      refTable: users,
      refColumns: [id],
      onDelete: 'BOGUS' as ReferenceOption,
    })
    const orders = newTable('orders', { columns: [id], foreignKeys: [fk] })
    const realm = newRealm([newSchema('public', { tables: [users, orders] })])

    const errors: string[] = []
    const result = normalize(realm, { ...baseOptions, onValidateError: (m) => errors.push(m) }) as typeof realm

    expect(errors).not.toBeEmpty()
    expect(result.schemas[0].tables![1].foreignKeys![0]).not.toHaveProperty('onDelete')
  })

  it('strips a wrong-typed sub-field under a known kind (Comment.text) and reports it', () => {
    // intentionally invalid: Comment.text must be a string
    const badComment = { ...comment('ok'), text: 123 } as never
    const id = newColumn('id', { type: columnType(integerType('bigint')), attrs: [badComment] })
    const realm = newRealm([newSchema('public', { tables: [newTable('t', { columns: [id] })] })])

    const errors: string[] = []
    const result = normalize(realm, { ...baseOptions, onValidateError: (m) => errors.push(m) }) as typeof realm

    expect(errors).not.toBeEmpty()
    expect(result.schemas[0].tables![0].columns![0].attrs![0]).not.toHaveProperty('text')
  })

  it('does not misclassify or mangle an empty realm', async () => {
    const realm = await buildFromDdl('CREATE TABLE t(id int)')
    const errors: string[] = []
    const result = normalize(realm, { ...baseOptions, onValidateError: (m) => errors.push(m) }) as typeof realm
    expect(errors).toBeEmpty()
    expect(result.schemas[0].tables![0].name).toBe('t')
  })
})
