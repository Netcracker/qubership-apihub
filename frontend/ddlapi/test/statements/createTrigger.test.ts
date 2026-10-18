import { buildFromDdl } from '../../src/parser'
import { loadSql } from '../helpers/loadSql'
import { DdlErrorKind } from '../../src/constants'
import { PgAttrKind } from '../../src/postgres.constants'

describe('createTrigger', () => {
  test('after-insert-row: attached as Trigger attr on table', async () => {
    const errors: unknown[] = []
    const realm = await buildFromDdl(loadSql('create-trigger/after-insert-row.sql'), { onError: e => errors.push(e) })
    expect(errors).toHaveLength(0)
    const schema = realm.schemas[0]!
    const users = schema.tables!.find(t => t.name === 'users')!
    const trig = users.attrs!.find(a => a.kind === PgAttrKind.Trigger) as {
      name: string; timing: string; events: string[]; forEachRow: boolean; funcName: string
    } | undefined
    expect(trig).toBeDefined()
    expect(trig!.name).toBe('trg_users_after_insert')
    expect(trig!.timing).toBe('AFTER')
    expect(trig!.events).toContain('INSERT')
    expect(trig!.forEachRow).toBe(true)
    expect(trig!.funcName).toBe('notify_new_user')
  })

  test('before-update-when: timing BEFORE, WHEN clause captured', async () => {
    const errors: unknown[] = []
    const realm = await buildFromDdl(loadSql('create-trigger/before-update-when.sql'), { onError: e => errors.push(e) })
    expect(errors).toHaveLength(0)
    const table = realm.schemas[0]!.tables!.find(t => t.name === 'employees')!
    const trig = table.attrs!.find(a => a.kind === PgAttrKind.Trigger) as {
      timing: string; events: string[]; when?: string
    } | undefined
    expect(trig!.timing).toBe('BEFORE')
    expect(trig!.events).toContain('UPDATE')
    expect(trig!.when).toBeDefined()
  })

  test('statement-level: forEachRow=false, multiple events', async () => {
    const errors: unknown[] = []
    const realm = await buildFromDdl(loadSql('create-trigger/statement-level.sql'), { onError: e => errors.push(e) })
    expect(errors).toHaveLength(0)
    const table = realm.schemas[0]!.tables!.find(t => t.name === 'audit_target')!
    const trig = table.attrs!.find(a => a.kind === PgAttrKind.Trigger) as {
      forEachRow: boolean; events: string[]
    } | undefined
    expect(trig!.forEachRow).toBe(false)
    expect(trig!.events).toContain('INSERT')
    expect(trig!.events).toContain('UPDATE')
    expect(trig!.events).toContain('DELETE')
  })

  test('instead-of-view: emits unresolved-reference (view is out-of-scope)', async () => {
    const errors: unknown[] = []
    await buildFromDdl(loadSql('create-trigger/instead-of-view.sql'), { onError: e => errors.push(e) })
    // CREATE VIEW is out-of-scope (1 error), INSTEAD OF trigger on unknown view (1 more error)
    const kinds = (errors as { kind: string }[]).map(e => e.kind)
    expect(kinds).toContain(DdlErrorKind.OutOfScopeStatement)
    expect(kinds).toContain(DdlErrorKind.UnresolvedReference)
  })

  test('constraint-trigger: isConstraint and deferrable attrs captured', async () => {
    const errors: unknown[] = []
    const realm = await buildFromDdl(loadSql('create-trigger/constraint-trigger.sql'), { onError: e => errors.push(e) })
    expect(errors).toHaveLength(0)
    const table = realm.schemas[0]!.tables!.find(t => t.name !== undefined)!
    const trig = table.attrs!.find(a => a.kind === PgAttrKind.Trigger) as {
      isConstraint?: boolean; deferrable?: boolean
    } | undefined
    expect(trig).toBeDefined()
    expect(trig!.isConstraint).toBe(true)
    expect(trig!.deferrable).toBe(true)
  })

  test('trigger on unknown table: emits unresolved-reference', async () => {
    const errors: unknown[] = []
    await buildFromDdl(
      `CREATE TRIGGER trig AFTER INSERT ON missing_table FOR EACH ROW EXECUTE FUNCTION fn()`,
      { onError: e => errors.push(e) },
    )
    expect(errors).toHaveLength(1)
    expect((errors[0] as { kind: string }).kind).toBe(DdlErrorKind.UnresolvedReference)
  })
})
