import { buildFromDdl } from '../../src'
import { loadSql } from '../helpers/loadSql'
import { DdlErrorKind } from '../../src/constants'
import { PgAttrKind } from '../../src/postgres.constants'

describe('createIndex', () => {
  test('basic-btree: creates index attached to table', async () => {
    const realm = await buildFromDdl(loadSql('create-index/basic-btree.sql'))
    const schema = realm.schemas[0]!
    const users = schema.tables!.find(t => t.name === 'users')!
    const idx = users.indexes!.find(i => i.name === 'idx_users_email')
    expect(idx).toBeDefined()
    expect(idx!.unique).toBeFalsy()
  })

  test('basic-btree: index part column resolved to Column instance', async () => {
    const realm = await buildFromDdl(loadSql('create-index/basic-btree.sql'))
    const schema = realm.schemas[0]!
    const users = schema.tables!.find(t => t.name === 'users')!
    const idx = users.indexes!.find(i => i.name === 'idx_users_email')!
    expect(idx.parts![0]!.column).toBeDefined()
    expect(idx.parts![0]!.column!.name).toBe('email')
    // Referential equality: same Column instance as in users.columns
    const emailCol = users.columns!.find(c => c.name === 'email')!
    expect(idx.parts![0]!.column).toBe(emailCol)
  })

  test('unique: sets unique=true', async () => {
    const realm = await buildFromDdl(loadSql('create-index/unique.sql'))
    const schema = realm.schemas[0]!
    const accounts = schema.tables!.find(t => t.name === 'accounts')!
    const idx = accounts.indexes!.find(i => i.name === 'idx_accounts_code')!
    expect(idx.unique).toBe(true)
  })

  test('multi-column: two parts, second has desc=true', async () => {
    const realm = await buildFromDdl(loadSql('create-index/multi-column.sql'))
    const schema = realm.schemas[0]!
    const orders = schema.tables!.find(t => t.name === 'orders')!
    const idx = orders.indexes!.find(i => i.name === 'idx_orders_customer_date')!
    expect(idx.parts).toHaveLength(2)
    expect(idx.parts![0]!.desc).toBeFalsy()
    expect(idx.parts![1]!.desc).toBe(true)
  })

  test('expression: part has expr (RawExpr), no column', async () => {
    const realm = await buildFromDdl(loadSql('create-index/expression.sql'))
    const schema = realm.schemas[0]!
    const users = schema.tables!.find(t => t.name === 'users')!
    const idx = users.indexes!.find(i => i.name === 'idx_users_email_lower')!
    expect(idx.parts![0]!.column).toBeUndefined()
    expect(idx.parts![0]!.expr).toBeDefined()
  })

  test('partial: stores IndexPredicate attr', async () => {
    const realm = await buildFromDdl(loadSql('create-index/partial.sql'))
    const schema = realm.schemas[0]!
    const tasks = schema.tables!.find(t => t.name === 'tasks')!
    const idx = tasks.indexes!.find(i => i.name === 'idx_active_tasks')!
    const pred = idx.attrs!.find(a => a.kind === PgAttrKind.IndexPredicate)
    expect(pred).toBeDefined()
    expect((pred as unknown as { P: string }).P).toContain('active')
  })

  test('covering-include: stores IndexInclude attr', async () => {
    const realm = await buildFromDdl(loadSql('create-index/covering-include.sql'))
    const schema = realm.schemas[0]!
    const t = schema.tables!.find(t => t.name === 'order_lines')!
    const idx = t.indexes!.find(i => i.name === 'idx_order_lines_order')!
    const inc = idx.attrs!.find(a => a.kind === PgAttrKind.IndexInclude) as { columns: string[] } | undefined
    expect(inc).toBeDefined()
    expect(inc!.columns).toContain('customer_id')
    expect(inc!.columns).toContain('total_amount')
  })

  test('operator-class: stores IndexOpClass attr on part', async () => {
    const realm = await buildFromDdl(loadSql('create-index/operator-class.sql'))
    const schema = realm.schemas[0]!
    const articles = schema.tables!.find(t => t.name === 'articles')!
    const idx = articles.indexes!.find(i => i.name === 'idx_articles_content_pattern')!
    const opclass = idx.parts![0]!.attrs!.find(a => a.kind === PgAttrKind.IndexOpClass) as { name: string } | undefined
    expect(opclass).toBeDefined()
    expect(opclass!.name).toBe('text_pattern_ops')
  })

  test('nulls-first: stores IndexColumnProp attr on part', async () => {
    const realm = await buildFromDdl(loadSql('create-index/nulls-first.sql'))
    const schema = realm.schemas[0]!
    const metrics = schema.tables!.find(t => t.name === 'metrics')!
    const idx = metrics.indexes!.find(i => i.name === 'idx_metrics_x_nulls_first')!
    const prop = idx.parts![0]!.attrs!.find(a => a.kind === PgAttrKind.IndexColumnProp) as { nullsFirst: boolean } | undefined
    expect(prop).toBeDefined()
    expect(prop!.nullsFirst).toBe(true)
  })

  test('nulls-not-distinct: stores IndexNullsDistinct attr on index', async () => {
    const realm = await buildFromDdl(loadSql('create-index/nulls-not-distinct.sql'))
    const schema = realm.schemas[0]!
    const memberships = schema.tables!.find(t => t.name === 'memberships')!
    const idx = memberships.indexes!.find(i => i.name === 'idx_memberships_unique')!
    const nd = idx.attrs!.find(a => a.kind === PgAttrKind.IndexNullsDistinct) as { V: boolean } | undefined
    expect(nd).toBeDefined()
    expect(nd!.V).toBe(false)
  })

  test('gin: stores IndexType attr with T=gin', async () => {
    const realm = await buildFromDdl(loadSql('create-index/gin.sql'))
    const schema = realm.schemas[0]!
    const events = schema.tables!.find(t => t.name === 'events')!
    const idx = events.indexes!.find(i => i.name === 'idx_events_payload')!
    const it = idx.attrs!.find(a => a.kind === PgAttrKind.IndexType) as { T: string } | undefined
    expect(it).toBeDefined()
    expect(it!.T).toBe('gin')
  })

  test('concurrently: stores Concurrently attr', async () => {
    const realm = await buildFromDdl(loadSql('create-index/concurrently.sql'))
    const schema = realm.schemas[0]!
    // Find the table from the resource file
    const table = schema.tables![0]!
    const idx = table.indexes!.find(i => i.attrs?.some(a => a.kind === PgAttrKind.Concurrently))
    expect(idx).toBeDefined()
  })

  test('storage-params: stores StorageParams attr on index', async () => {
    const realm = await buildFromDdl(loadSql('create-index/storage-params.sql'))
    const schema = realm.schemas[0]!
    const table = schema.tables![0]!
    const idx = table.indexes!.find(i => i.attrs?.some(a => a.kind === PgAttrKind.StorageParams))
    expect(idx).toBeDefined()
  })

  test('forward-reference: index before table is resolved silently', async () => {
    const errors: unknown[] = []
    const realm = await buildFromDdl(
      `CREATE INDEX idx_early ON users (email);
       CREATE TABLE users (id bigint PRIMARY KEY, email text);`,
      { onError: e => errors.push(e) },
    )
    // No errors for forward-reference
    expect(errors).toHaveLength(0)
    const schema = realm.schemas[0]!
    const users = schema.tables!.find(t => t.name === 'users')!
    // Index attached to table
    const idx = users.indexes!.find(i => i.name === 'idx_early')
    expect(idx).toBeDefined()
  })

  test('index on unknown table: emits unresolved-reference', async () => {
    const errors: unknown[] = []
    await buildFromDdl(
      `CREATE INDEX idx_missing ON missing_table (col)`,
      { onError: e => errors.push(e) },
    )
    expect(errors).toHaveLength(1)
    expect((errors[0] as { kind: string }).kind).toBe(DdlErrorKind.UnresolvedReference)
  })

  test('duplicate index: emits duplicate-object error, second index not attached', async () => {
    const errors: unknown[] = []
    const realm = await buildFromDdl(
      `CREATE TABLE users (id bigint PRIMARY KEY, email text);
       CREATE INDEX idx_users_email ON users (email);
       CREATE INDEX idx_users_email ON users (email);`,
      { onError: e => errors.push(e) },
    )
    expect(errors).toHaveLength(1)
    const err = errors[0] as { kind: string; objectKind: string; qualifiedName: string }
    expect(err.kind).toBe(DdlErrorKind.DuplicateObject)
    expect(err.objectKind).toBe('Index')
    expect(err.qualifiedName).toBe('public.idx_users_email')
    // Only one copy of the index is attached
    const users = realm.schemas[0]!.tables!.find(t => t.name === 'users')!
    const matches = users.indexes!.filter(i => i.name === 'idx_users_email')
    expect(matches).toHaveLength(1)
  })
})
