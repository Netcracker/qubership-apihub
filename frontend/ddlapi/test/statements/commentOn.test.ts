import { buildFromDdl } from '../../src'
import { loadSql } from '../helpers/loadSql'
import { AttrKind, DdlErrorKind } from '../../src/constants'

describe('commentOn', () => {
  test('table: attaches Comment attr to table', async () => {
    const realm = await buildFromDdl(loadSql('comment-on/table.sql'))
    const table = realm.schemas[0]!.tables![0]!
    const cmt = table.attrs!.find(a => a.kind === AttrKind.Comment) as { text: string } | undefined
    expect(cmt).toBeDefined()
    expect(cmt!.text).toBe('Registered application users')
  })

  test('column: attaches Comment attr to column', async () => {
    const realm = await buildFromDdl(loadSql('comment-on/column.sql'))
    const table = realm.schemas[0]!.tables![0]!
    const emailCol = table.columns!.find(c => c.name === 'email')!
    const cmt = emailCol.attrs!.find(a => a.kind === AttrKind.Comment) as { text: string } | undefined
    expect(cmt).toBeDefined()
    expect(cmt!.text).toBe('Primary contact email address')
  })

  test('index: attaches Comment attr to index', async () => {
    const realm = await buildFromDdl(loadSql('comment-on/index.sql'))
    const table = realm.schemas[0]!.tables!.find(t => t.name === 'users')!
    const idx = table.indexes!.find(i => i.name === 'idx_users_email')!
    const cmt = idx.attrs!.find(a => a.kind === AttrKind.Comment) as { text: string } | undefined
    expect(cmt).toBeDefined()
    expect(cmt!.text).toBe('Speeds up email lookup queries')
  })

  test('type (enum): attaches Comment attr to EnumType', async () => {
    const realm = await buildFromDdl(loadSql('comment-on/type.sql'))
    const schema = realm.schemas[0]!
    const typeObj = schema.objects!.find(o => o.kind === 'EnumType') as { attrs?: { kind: string; text?: string }[] }
    expect(typeObj).toBeDefined()
    const cmt = typeObj.attrs!.find(a => a.kind === AttrKind.Comment) as { text: string } | undefined
    expect(cmt).toBeDefined()
  })

  test('constraint: attaches Comment attr to Check in table.attrs', async () => {
    const realm = await buildFromDdl(loadSql('comment-on/constraint.sql'))
    const table = realm.schemas[0]!.tables!.find(t => t.name === 'products')!
    const chk = table.attrs!.find(a => a.kind === AttrKind.Check) as {
      name?: string
      attrs?: { kind: string; text?: string }[]
    } | undefined
    expect(chk).toBeDefined()
    expect(chk!.name).toBe('positive_price')
    const cmt = chk!.attrs!.find(a => a.kind === AttrKind.Comment) as { text: string } | undefined
    expect(cmt).toBeDefined()
  })

  test('remove-comment (IS NULL): removes existing Comment attr', async () => {
    const realm = await buildFromDdl(loadSql('comment-on/remove-comment.sql'))
    const table = realm.schemas[0]!.tables!.find(t => t.name === 'users')!
    // After COMMENT ON TABLE users IS NULL, the Comment attr should be absent (or attrs undefined)
    const cmt = table.attrs?.find(a => a.kind === AttrKind.Comment)
    expect(cmt).toBeUndefined()
  })

  test('comment on unknown table: emits unresolved-reference', async () => {
    const errors: unknown[] = []
    await buildFromDdl(`COMMENT ON TABLE missing_table IS 'text'`, { onError: e => errors.push(e) })
    expect(errors).toHaveLength(1)
    expect((errors[0] as { kind: string }).kind).toBe(DdlErrorKind.UnresolvedReference)
  })

  test('comment on unknown column: emits unresolved-reference', async () => {
    const errors: unknown[] = []
    await buildFromDdl(
      `CREATE TABLE t (id bigint);
       COMMENT ON COLUMN t.missing_col IS 'text'`,
      { onError: e => errors.push(e) },
    )
    expect(errors).toHaveLength(1)
    expect((errors[0] as { kind: string }).kind).toBe(DdlErrorKind.UnresolvedReference)
  })

  test('comment on unknown index: emits unresolved-reference', async () => {
    const errors: unknown[] = []
    await buildFromDdl(`COMMENT ON INDEX idx_does_not_exist IS 'text'`, { onError: e => errors.push(e) })
    expect(errors).toHaveLength(1)
    expect((errors[0] as { kind: string }).kind).toBe(DdlErrorKind.UnresolvedReference)
  })

  test('comment replaces existing comment', async () => {
    const realm = await buildFromDdl(
      `CREATE TABLE t (id bigint);
       COMMENT ON TABLE t IS 'first';
       COMMENT ON TABLE t IS 'second';`,
    )
    const table = realm.schemas[0]!.tables![0]!
    const comments = table.attrs!.filter(a => a.kind === AttrKind.Comment)
    // Only one Comment attr (replaced, not appended)
    expect(comments).toHaveLength(1)
    expect((comments[0] as { text: string }).text).toBe('second')
  })

  test('multi-schema: qualified column comment', async () => {
    const errors: unknown[] = []
    const realm = await buildFromDdl(
      `CREATE TABLE public.users (id bigint PRIMARY KEY, email text);
       COMMENT ON COLUMN public.users.email IS 'Contact email';`,
      { onError: e => errors.push(e) },
    )
    expect(errors).toHaveLength(0)
    const pub = realm.schemas.find(s => s.name === 'public')!
    const users = pub.tables!.find(t => t.name === 'users')!
    const emailCol = users.columns!.find(c => c.name === 'email')!
    const cmt = emailCol.attrs!.find(a => a.kind === AttrKind.Comment) as { text: string } | undefined
    expect(cmt!.text).toBe('Contact email')
  })
})
