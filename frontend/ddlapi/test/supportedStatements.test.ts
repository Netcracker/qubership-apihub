import { buildFromDdl } from '../src/parser'
import { DdlErrorKind } from '../src/constants'
import type { DdlNonFatalError } from '../src/parser/buildFromDdl'
import { SUPPORTED_STMT_TYPES, SUPPORTED_STMT_TYPE_SET, type SupportedStmtType } from '../src/parser/supportedStatements'

// ── Compile-time exhaustiveness ───────────────────────────────────────────────
// Mirrors test/types.test.ts: this switch fails to compile if SUPPORTED_STMT_TYPES
// gains a member without a case here (the default residual would not be `never`).
function assertNever(x: never): never {
  throw new Error(`Unhandled supported statement type: ${String(x)}`)
}

function _exhaustiveSupportedStmt(t: SupportedStmtType): string {
  switch (t) {
    case 'CreateStmt': return 'table'
    case 'IndexStmt': return 'index'
    case 'CommentStmt': return 'comment'
    case 'CreateDomainStmt': return 'domain'
    case 'CreateEnumStmt': return 'enum'
    case 'CompositeTypeStmt': return 'composite'
    case 'CreateRangeStmt': return 'range'
    case 'CreateTrigStmt': return 'trigger'
    default:
      return assertNever(t)
  }
}

describe('supportedStatements', () => {
  test('compile-time exhaustiveness function exists', () => {
    expect(typeof _exhaustiveSupportedStmt).toBe('function')
    expect(_exhaustiveSupportedStmt('CreateStmt')).toBe('table')
  })

  // ── Runtime parity: every supported type is dispatched by buildFromDdl ───────
  test('one of each supported statement type produces no out-of-scope error', async () => {
    const ddl = `
      CREATE TABLE t (id int);
      CREATE INDEX i ON t (id);
      COMMENT ON TABLE t IS 'x';
      CREATE DOMAIN d AS int;
      CREATE TYPE e AS ENUM ('a');
      CREATE TYPE c AS (x int);
      CREATE TYPE r AS RANGE (subtype = int4);
      CREATE TRIGGER trg AFTER INSERT ON t FOR EACH ROW EXECUTE FUNCTION f();
    `
    const errors: DdlNonFatalError[] = []
    await buildFromDdl(ddl, { onError: e => errors.push(e) })
    expect(errors.filter(e => e.kind === DdlErrorKind.OutOfScopeStatement)).toEqual([])
  })

  test('an unsupported statement is reported out-of-scope and absent from the set', async () => {
    const errors: DdlNonFatalError[] = []
    await buildFromDdl('CREATE TABLE t (id int);\nALTER TABLE t ADD COLUMN x text;', {
      onError: e => errors.push(e),
    })
    const oos = errors.find(e => e.kind === DdlErrorKind.OutOfScopeStatement)
    expect(oos).toBeDefined()
    expect((oos as { statementType: string }).statementType).toBe('AlterTableStmt')
    expect(SUPPORTED_STMT_TYPE_SET.has('AlterTableStmt')).toBe(false)
  })

  test('the set contains exactly the declared supported types', () => {
    expect([...SUPPORTED_STMT_TYPE_SET].sort()).toEqual([...SUPPORTED_STMT_TYPES].sort())
    expect(SUPPORTED_STMT_TYPE_SET.size).toBe(8)
  })
})
