import { Realm, PgAttrKind, PgObjectKind, PgTypeKind } from '@netcracker/qubership-apihub-ddlapi'
import { denormalize, normalize, DDL_API_NORMALIZE_OPTIONS } from '../../src'
import { buildRealmAndAssertValid } from '../helpers/ddlapi'
import { commonOriginsCheck, TEST_DEFAULTS_FLAG, TEST_ORIGINS_FLAG, TEST_ORIGINS_FOR_DEFAULTS } from '../helpers'

// PostgreSQL overlay. The escape-hatch kinds and dialect primitive
// defaults normalize, round-trip and carry origins, composed onto core via the dialect.
describe('ddlapi PostgreSQL overlay', () => {
  const baseOptions = {
    ...DDL_API_NORMALIZE_OPTIONS,
    originsFlag: TEST_ORIGINS_FLAG,
    defaultsFlag: TEST_DEFAULTS_FLAG,
    createOriginsForDefaults: () => TEST_ORIGINS_FOR_DEFAULTS,
  }

  // Find the first object anywhere in the realm carrying the given `kind`.
  const findByKind = (realm: unknown, kind: string): any => {
    let found: any
    const seen = new Set<unknown>()
    const walk = (v: any) => {
      if (found || typeof v !== 'object' || v === null || seen.has(v)) { return }
      seen.add(v)
      if (!Array.isArray(v) && v.kind === kind) { found = v; return }
      for (const k of Object.keys(v)) { walk(v[k]) }
    }
    walk(realm)
    return found
  }

  const errorsOf = (issues: string[]) => ({ onValidateError: (m: string) => issues.push(m), onUnifyError: (m: string) => issues.push(m) })

  // [kind, ddl, assertion on the normalized kind object]
  const cases: Array<[string, string, (obj: any) => void]> = [
    [PgAttrKind.Identity, 'CREATE TABLE t (id bigint GENERATED ALWAYS AS IDENTITY)', (o) => expect(o.generation).toBe('ALWAYS')],
    [PgAttrKind.Partition, 'CREATE TABLE t (id int) PARTITION BY RANGE (id)', (o) => expect(o.type).toBe('RANGE')],
    [PgAttrKind.Inherits, 'CREATE TABLE p (id int); CREATE TABLE c (x int) INHERITS (p)', (o) => expect(o.parents).toContain('p')],
    [PgAttrKind.StorageParams, 'CREATE TABLE t (id int) WITH (fillfactor=70)', (o) => expect(o.params).toBeDefined()],
    [PgObjectKind.ExcludeConstraint, 'CREATE TABLE t (id int, c circle, EXCLUDE USING gist (c WITH &&))', (o) => expect(o.method).toBeDefined()],
    [PgObjectKind.CompositeType, 'CREATE TYPE ct AS (a int, b text)', (o) => expect(o.name).toBe('ct')],
    [PgObjectKind.RangeType, 'CREATE TYPE rt AS RANGE (subtype = int4)', (o) => expect(o.name).toBe('rt')],
    [PgObjectKind.Domain, 'CREATE DOMAIN d AS integer CHECK (VALUE > 0)', (o) => expect(o.baseType).toBeDefined()],
    [PgAttrKind.IndexInclude, 'CREATE TABLE t (id int, a int); CREATE INDEX i ON t (id) INCLUDE (a)', (o) => expect(o.columns).toContain('a')],
    [PgAttrKind.IndexType, 'CREATE TABLE t (id int, j jsonb); CREATE INDEX i ON t USING gin (j)', (o) => expect(o.type).toBe('gin')],
    [PgAttrKind.IndexPredicate, 'CREATE TABLE t (id int); CREATE INDEX i ON t (id) WHERE id > 0', (o) => expect(o.predicate).toBeDefined()],
  ]

  it.each(cases)('normalizes, validates and round-trips %s', async (kind, ddl, assertObj) => {
    const realm = await buildRealmAndAssertValid(ddl)

    const issues: string[] = []
    const result = normalize(realm, { ...baseOptions, ...errorsOf(issues) }) as Realm

    // validation does not strip the dialect kind or its fields
    expect(issues).toBeEmpty()
    const obj = findByKind(result, kind)
    expect(obj).toBeDefined()
    assertObj(obj)

    // origins cover the dialect kinds too
    commonOriginsCheck(result, { originsFlag: TEST_ORIGINS_FLAG })

    // round-trip: the dialect kind survives denormalize
    const back = denormalize(result, baseOptions) as Realm
    expect(findByKind(back, kind)).toBeDefined()
  })

  it('applies the dialect unsigned=false primitive default reversibly', async () => {
    const realm = await buildRealmAndAssertValid('CREATE TABLE t (id integer)')
    const result = normalize(realm, baseOptions) as Realm
    const intType: any = result.schemas[0].tables![0].columns![0].type!.type
    expect(intType.kind).toBe('IntegerType')
    expect(intType.unsigned).toBe(false)

    const back = denormalize(result, baseOptions) as Realm
    const intBack: any = back.schemas[0].tables![0].columns![0].type!.type
    expect(intBack).not.toHaveProperty('unsigned')
  })

  it('keeps GeneratedExpr.type=STORED (dialect default) and strips it on round-trip', async () => {
    const realm = await buildRealmAndAssertValid('CREATE TABLE t (id int, g int GENERATED ALWAYS AS (id * 2) STORED)')
    const result = normalize(realm, baseOptions) as Realm
    const generated = findByKind(result, 'GeneratedExpr')
    expect(generated.type).toBe('STORED')

    const back = denormalize(result, baseOptions) as Realm
    expect(findByKind(back, 'GeneratedExpr')).not.toHaveProperty('type')
  })

  it('shares a dual-role Domain instance between schema.objects and the column type', async () => {
    const realm = await buildRealmAndAssertValid(`
      CREATE DOMAIN positive AS integer CHECK (VALUE > 0);
      CREATE TABLE t (x positive);
    `)
    const result = normalize(realm, baseOptions) as Realm
    const schemaObjectDomain = result.schemas[0].objects!.find((o: any) => o.kind === PgObjectKind.Domain)
    const columnType: any = result.schemas[0].tables!.find((t) => t.name === 't')!.columns![0].type!.type
    expect(columnType.kind).toBe(PgTypeKind.Domain)
    expect(columnType).toBe(schemaObjectDomain)
    commonOriginsCheck(result, { originsFlag: TEST_ORIGINS_FLAG })
  })
})
